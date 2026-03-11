"""
host_monitor/backend/app.py
Flask API — pings hosts on a configurable interval, tracks status
history, uptime %, last seen, and sends SMTP alerts when hosts go down.
"""

import os
import json
import uuid
import smtplib
import subprocess
import threading
import time
from datetime import datetime, timedelta
from pathlib import Path
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from collections import deque

from cryptography.fernet import Fernet
from flask import Flask, jsonify, request
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

# ── Paths ────────────────────────────────────────────────────
DATA_DIR  = Path(os.getenv("DATA_DIR", "/data"))
HOSTS_DB  = DATA_DIR / "hosts.enc"
CONFIG_DB = DATA_DIR / "config.enc"
KEY_FILE  = DATA_DIR / ".keyfile"
DATA_DIR.mkdir(parents=True, exist_ok=True)

# ── History window ───────────────────────────────────────────
MAX_HISTORY = 100   # ping results kept per host

# ════════════════════════════════════════════════════════════
#  Encryption
# ════════════════════════════════════════════════════════════

def _get_fernet():
    if KEY_FILE.exists():
        key = KEY_FILE.read_bytes()
    else:
        key = Fernet.generate_key()
        KEY_FILE.write_bytes(key)
        KEY_FILE.chmod(0o600)
    return Fernet(key)

def _encrypt(data):
    return _get_fernet().encrypt(json.dumps(data).encode())

def _decrypt(data):
    return json.loads(_get_fernet().decrypt(data))


# ════════════════════════════════════════════════════════════
#  Config store  (SMTP + ping interval)
# ════════════════════════════════════════════════════════════
DEFAULT_CONFIG = {
    "ping_interval":        60,     # seconds between pings
    "smtp_enabled":         False,
    "smtp_host":            "",
    "smtp_port":            587,
    "smtp_user":            "",
    "smtp_password":        "",
    "smtp_from":            "",
    "smtp_to":              "",     # comma-separated recipients
    "smtp_tls":             True,
    "alert_cooldown":       300,    # (legacy — kept for compatibility)
    "reminder_enabled":     True,   # send repeat alerts while host stays down
    "reminder_interval":    1800,   # seconds between reminder alerts (default 30m)
    "network_name":         "",     # custom header title
    "bg_color":             "",     # custom background color (hex)
    "group_order":          [],     # user-defined group display order
}

def load_config():
    if not CONFIG_DB.exists():
        return dict(DEFAULT_CONFIG)
    try:
        return {**DEFAULT_CONFIG, **_decrypt(CONFIG_DB.read_bytes())}
    except Exception:
        return dict(DEFAULT_CONFIG)

def save_config(cfg):
    CONFIG_DB.write_bytes(_encrypt(cfg))
    CONFIG_DB.chmod(0o600)


# ════════════════════════════════════════════════════════════
#  Host store
# ════════════════════════════════════════════════════════════
# Schema per host:
# {
#   "id":       str,
#   "name":     str,
#   "ip":       str,
#   "group":    str,
#   "enabled":  bool,
# }

def load_hosts():
    if not HOSTS_DB.exists():
        return []
    try:
        return _decrypt(HOSTS_DB.read_bytes())
    except Exception:
        return []

def save_hosts(hosts):
    HOSTS_DB.write_bytes(_encrypt(hosts))
    HOSTS_DB.chmod(0o600)


# ════════════════════════════════════════════════════════════
#  In-memory runtime state
# ════════════════════════════════════════════════════════════
# host_state[id] = {
#   "status":           "online"|"offline"|"unknown",
#   "latency_ms":       float | None,
#   "last_seen":        ISO str | None,
#   "last_check":       ISO str | None,
#   "history":          deque of {"ts": ISO, "ok": bool, "ms": float|None}
#   "alerted_at":       float (epoch) | None  — time of first down alert
#   "offline_since":    float (epoch) | None  — when host first went offline
#   "reminder_sent_at": float (epoch) | None  — time of last reminder alert
# }
host_state  = {}
state_lock  = threading.Lock()
ping_thread = None
stop_event  = threading.Event()


def _init_state(host_id):
    if host_id not in host_state:
        host_state[host_id] = {
            "status":           "unknown",
            "latency_ms":       None,
            "last_seen":        None,
            "last_check":       None,
            "history":          deque(maxlen=MAX_HISTORY),
            "alerted_at":       None,
            "offline_since":    None,
            "reminder_sent_at": None,
            "acknowledged":     False,   # True = alerts silenced until host recovers
            "ack_at":           None,    # epoch when acknowledged
        }


def _uptime_pct(host_id):
    h = host_state.get(host_id, {}).get("history", deque())
    if not h:
        return None
    ok = sum(1 for r in h if r["ok"])
    return round(ok / len(h) * 100, 1)


# ════════════════════════════════════════════════════════════
#  Ping
# ════════════════════════════════════════════════════════════

def ping_host(ip: str) -> tuple[bool, float | None]:
    """Returns (reachable, latency_ms). Uses system ping."""
    try:
        start  = time.monotonic()
        result = subprocess.run(
            ["ping", "-c", "1", "-W", "2", ip],
            capture_output=True, timeout=5
        )
        ms = round((time.monotonic() - start) * 1000, 1)
        return result.returncode == 0, ms if result.returncode == 0 else None
    except Exception:
        return False, None


# ════════════════════════════════════════════════════════════
#  SMTP alerting
# ════════════════════════════════════════════════════════════

def _fmt_duration(seconds) -> str:
    """Convert seconds to a human-readable string like '2h 14m'."""
    if seconds is None:
        return "unknown"
    s = int(seconds)
    if s < 60:
        return f"{s}s"
    if s < 3600:
        return f"{s//60}m {s%60:02d}s"
    h, m = s // 3600, (s % 3600) // 60
    return f"{h}h {m:02d}m"


def _build_html_email(host: dict, status: str, now_str: str,
                      network_name: str, offline_duration=None,
                      is_reminder: bool = False) -> str:
    """Return a fully styled HTML email body."""
    is_offline  = status == "offline"
    accent      = "#C0392B" if is_offline else "#27AE60"
    bg_accent   = "#2A0808" if is_offline else "#0A1A0A"
    status_icon = "🔴" if is_offline else "🟢"

    if is_reminder:
        status_text = "STILL OFFLINE"
        headline    = (f"{host['name']} has been offline for "
                       f"{_fmt_duration(offline_duration)} "
                       f"and is still not responding to pings.")
    elif is_offline:
        status_text = "OFFLINE"
        headline    = f"{host['name']} is no longer responding to pings."
    else:
        status_text = "BACK ONLINE"
        dur_str     = f" Total downtime: {_fmt_duration(offline_duration)}." if offline_duration else ""
        headline    = f"{host['name']} is back online and responding to pings.{dur_str}"

    rows = [
        ("Host Name",  host["name"],                  "#FFFFFF", "700"),
        ("IP Address", host["ip"],                    "#048A81", "400"),
        ("Group",      host.get("group","Ungrouped"), "#94A3B8", "400"),
        ("Status",     status_text,                   accent,    "700"),
    ]
    if offline_duration and is_reminder:
        rows.append(("Offline For",    _fmt_duration(offline_duration), accent,    "700"))
    elif offline_duration and not is_offline:
        rows.append(("Total Downtime", _fmt_duration(offline_duration), "#27AE60", "700"))
    rows.append(("Timestamp", now_str, "#64748B", "400"))

    rows_html = "".join(
        f'<tr style="border-bottom:1px solid #1E293B;">'
        f'<td style="padding:12px 28px;font-size:10px;color:#64748B;font-weight:700;'
        f'letter-spacing:0.1em;text-transform:uppercase;width:130px;background:#0A1018;">{lbl}</td>'
        f'<td style="padding:12px 28px;font-size:12px;color:{col};font-weight:{w};">{val}</td></tr>'
        for lbl, val, col, w in rows
    )

    reminder_banner = (
        f'<tr><td style="background:#1A0A00;border-left:4px solid #E07B39;'
        f'border-right:4px solid #E07B39;padding:10px 28px;">'
        f'<p style="margin:0;font-size:11px;color:#E07B39;font-weight:700;">'
        f'⏰ REMINDER — This host has been down for {_fmt_duration(offline_duration)}. '
        f'You will continue to receive reminders until it recovers.</p></td></tr>'
        if is_reminder else ""
    )

    net_span = (f'<span style="color:#64748B;font-size:11px;margin-left:12px;">— {network_name}</span>'
                if network_name else "")
    hint = ("⚠ Investigate this host — check power, network connection, and services."
            if is_offline else
            "✓ No action required. Monitor this host to ensure it remains stable.")

    return (
        f'<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/>'
        f'<meta name="viewport" content="width=device-width,initial-scale=1"/>'
        f'<title>Network Monitor Alert</title></head>'
        f'<body style="margin:0;padding:0;background:#0F1923;font-family:\'Courier New\',monospace;">'
        f'<table width="100%" cellpadding="0" cellspacing="0" style="background:#0F1923;padding:32px 16px;">'
        f'<tr><td align="center">'
        f'<table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">'
        f'<tr><td style="background:#1B2A4A;border-bottom:3px solid #048A81;'
        f'border-radius:8px 8px 0 0;padding:20px 28px;">'
        f'<table width="100%" cellpadding="0" cellspacing="0"><tbody><tr>'
        f'<td><span style="display:inline-block;width:8px;height:8px;border-radius:50%;'
        f'background:#048A81;margin-right:10px;"></span>'
        f'<span style="color:#FFFFFF;font-weight:700;font-size:12px;'
        f'letter-spacing:0.15em;text-transform:uppercase;">Network Monitor</span>'
        f'{net_span}</td>'
        f'<td align="right"><span style="color:#64748B;font-size:10px;">{now_str}</span></td>'
        f'</tr></tbody></table></td></tr>'
        f'<tr><td style="background:{bg_accent};border-left:4px solid {accent};'
        f'border-right:4px solid {accent};padding:28px 28px 24px;text-align:center;">'
        f'<div style="font-size:42px;margin-bottom:12px;">{status_icon}</div>'
        f'<div style="font-size:22px;font-weight:800;color:{accent};'
        f'letter-spacing:0.1em;text-transform:uppercase;margin-bottom:10px;">{status_text}</div>'
        f'<div style="font-size:13px;color:#94A3B8;line-height:1.7;max-width:400px;margin:0 auto;">{headline}</div>'
        f'</td></tr>'
        f'{reminder_banner}'
        f'<tr><td style="background:#161F2E;border-left:4px solid {accent};border-right:4px solid {accent};">'
        f'<table width="100%" cellpadding="0" cellspacing="0"><tbody>{rows_html}</tbody></table>'
        f'</td></tr>'
        f'<tr><td style="background:#0D1525;border-left:4px solid {accent};'
        f'border-right:4px solid {accent};padding:14px 28px;">'
        f'<p style="margin:0;font-size:11px;color:#64748B;line-height:1.7;">{hint}</p></td></tr>'
        f'<tr><td style="background:#1B2A4A;border-radius:0 0 8px 8px;'
        f'border-top:1px solid #1E293B;padding:14px 28px;">'
        f'<span style="font-size:10px;color:#334155;">Automated alert from '
        f'<strong style="color:#048A81;">Network Monitor</strong>. '
        f'To manage alert settings, open your dashboard.</span></td></tr>'
        f'</table></td></tr></table></body></html>'
    )


def _build_plain_email(host: dict, status: str, now_str: str,
                       offline_duration=None, is_reminder: bool = False) -> str:
    """Plain-text fallback."""
    is_offline = status == "offline"
    dur_line   = f"Offline For : {_fmt_duration(offline_duration)}\n" if offline_duration else ""
    reminder   = "*** REMINDER — host is still offline ***\n\n" if is_reminder else ""
    status_str = "STILL OFFLINE" if is_reminder else ("OFFLINE" if is_offline else "BACK ONLINE")
    msg        = ("This host is no longer responding to pings."
                  if is_offline else
                  "This host is back online and responding to pings.")
    return (
        f"{reminder}NETWORK MONITOR ALERT\n=====================\n"
        f"Status     : {status_str}\n"
        f"Host Name  : {host['name']}\n"
        f"IP Address : {host['ip']}\n"
        f"Group      : {host.get('group', 'Ungrouped')}\n"
        f"{dur_line}"
        f"Time       : {now_str}\n\n{msg}\n\n-- Network Monitor (automated alert)"
    )


def _send_mail(cfg: dict, subject: str, html_body: str, plain_body: str):
    """Shared SMTP send logic.
    Port 25  -> plain SMTP, no auth required
    Port 465 -> SMTP_SSL
    Port 587 -> SMTP + STARTTLS (default)
    """
    recipients = [r.strip() for r in cfg["smtp_to"].split(",") if r.strip()]
    msg            = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"]    = cfg["smtp_from"]
    msg["To"]      = ", ".join(recipients)
    msg.attach(MIMEText(plain_body, "plain"))
    msg.attach(MIMEText(html_body,  "html"))
    port     = int(cfg.get("smtp_port", 587))
    user     = cfg.get("smtp_user", "").strip()
    password = cfg.get("smtp_password", "").strip()

    if port == 465:
        # Implicit SSL
        with smtplib.SMTP_SSL(cfg["smtp_host"], port, timeout=10) as s:
            if user:
                s.login(user, password)
            s.sendmail(cfg["smtp_from"], recipients, msg.as_string())
    elif port == 25:
        # Plain SMTP - no TLS, no auth
        with smtplib.SMTP(cfg["smtp_host"], port, timeout=10) as s:
            s.sendmail(cfg["smtp_from"], recipients, msg.as_string())
    else:
        # Default: STARTTLS (port 587 or any other)
        with smtplib.SMTP(cfg["smtp_host"], port, timeout=10) as s:
            if cfg.get("smtp_tls", True):
                s.starttls()
            if user:
                s.login(user, password)
            s.sendmail(cfg["smtp_from"], recipients, msg.as_string())


def send_alert(host: dict, status: str, offline_duration=None):
    cfg = load_config()
    if not cfg.get("smtp_enabled"):
        return
    port = int(cfg.get("smtp_port", 587))
    if port == 25:
        required = ["smtp_host", "smtp_from", "smtp_to"]  # no auth on port 25
    else:
        required = ["smtp_host", "smtp_user", "smtp_password", "smtp_from", "smtp_to"]
    if any(not cfg.get(f) for f in required):
        return

    now_str      = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    is_offline   = status == "offline"
    is_reminder  = is_offline and offline_duration is not None
    network_name = cfg.get("network_name", "")

    if is_reminder:
        subject = f"⏰ Network Monitor Reminder — {host['name']} STILL OFFLINE ({_fmt_duration(offline_duration)})"
    elif is_offline:
        subject = f"🔴 Network Monitor Alert — {host['name']} is OFFLINE"
    else:
        subject = f"🟢 Network Monitor Alert — {host['name']} is BACK ONLINE"

    html_body  = _build_html_email(host, status, now_str, network_name, offline_duration, is_reminder)
    plain_body = _build_plain_email(host, status, now_str, offline_duration, is_reminder)

    try:
        _send_mail(cfg, subject, html_body, plain_body)
        print(f"[ALERT] {subject}")
    except Exception as e:
        print(f"[ALERT ERROR] {host['name']}: {e}")


# ════════════════════════════════════════════════════════════
#  Background ping loop
# ════════════════════════════════════════════════════════════

def ping_loop():
    print("[PINGER] Started")
    while not stop_event.is_set():
        cfg      = load_config()
        interval = int(cfg.get("ping_interval", 60))
        hosts    = load_hosts()

        for host in hosts:
            if not host.get("enabled", True):
                continue
            hid = host["id"]
            ok, ms = ping_host(host["ip"])
            now    = datetime.now()
            now_s  = now.isoformat()

            with state_lock:
                _init_state(hid)
                prev_status = host_state[hid]["status"]
                new_status  = "online" if ok else "offline"

                host_state[hid]["status"]     = new_status
                host_state[hid]["latency_ms"] = ms
                host_state[hid]["last_check"] = now_s
                if ok:
                    host_state[hid]["last_seen"] = now_s
                host_state[hid]["history"].append({
                    "ts": now_s, "ok": ok, "ms": ms
                })

                now_epoch = time.time()
                cfg = load_config()

                # ── Host just went offline → immediate alert ──────────
                if new_status == "offline" and prev_status in ("online", "unknown"):
                    host_state[hid]["offline_since"]    = now_epoch
                    host_state[hid]["alerted_at"]       = now_epoch
                    host_state[hid]["reminder_sent_at"] = None
                    host_state[hid]["acknowledged"]     = False  # reset any previous ack
                    host_state[hid]["ack_at"]           = None
                    threading.Thread(
                        target=send_alert,
                        args=(host, "offline", None),
                        daemon=True
                    ).start()

                # ── Host still offline → send reminder if interval elapsed ──
                elif new_status == "offline" and prev_status == "offline":
                    # Read ack from disk to stay in sync across workers
                    disk_hosts = load_hosts()
                    disk_host  = next((x for x in disk_hosts if x["id"] == hid), {}) if disk_hosts else {}
                    is_acked   = disk_host.get("acknowledged", host_state[hid].get("acknowledged", False))
                    # Sync memory
                    host_state[hid]["acknowledged"] = is_acked
                    if is_acked:
                        pass  # silenced — no reminder sent
                    else:
                        reminder_enabled  = cfg.get("reminder_enabled", True)
                        reminder_interval = int(cfg.get("reminder_interval", 1800))
                        last_reminder     = host_state[hid].get("reminder_sent_at")
                        offline_since     = host_state[hid].get("offline_since") or now_epoch
                        ref_time          = last_reminder if last_reminder else host_state[hid].get("alerted_at", now_epoch)

                        if (reminder_enabled and
                                (now_epoch - ref_time) >= reminder_interval):
                            host_state[hid]["reminder_sent_at"] = now_epoch
                            offline_duration = now_epoch - offline_since
                            threading.Thread(
                                target=send_alert,
                                args=(host, "offline", offline_duration),
                                daemon=True
                            ).start()

                # ── Host came back online → recovery alert ────────────
                elif new_status == "online" and prev_status == "offline":
                    offline_since    = host_state[hid].get("offline_since")
                    offline_duration = (now_epoch - offline_since) if offline_since else None
                    was_acked        = host_state[hid].get("acknowledged", False)
                    host_state[hid]["offline_since"]    = None
                    host_state[hid]["reminder_sent_at"] = None
                    host_state[hid]["alerted_at"]       = None
                    host_state[hid]["acknowledged"]     = False  # auto-clear ack on recovery
                    host_state[hid]["ack_at"]           = None
                    # Persist ack clearance to disk so all workers see it
                    # SAFETY: re-load from disk and guard against empty result
                    # to prevent overwriting the hosts file with an empty list
                    _disk_hosts = load_hosts()
                    if _disk_hosts:
                        _updated = []
                        for _h in _disk_hosts:
                            if _h["id"] == hid:
                                _h = {**_h, "acknowledged": False, "ack_at": None}
                            _updated.append(_h)
                        if _updated:  # double-guard: never save an empty list
                            save_hosts(_updated)
                    else:
                        print(f"[ACK] WARNING: load_hosts() returned empty during recovery for {hid} — skipping disk write to prevent data loss")
                    # Always send recovery alert even if reminders were acknowledged
                    threading.Thread(
                        target=send_alert,
                        args=(host, "online", offline_duration),
                        daemon=True
                    ).start()

        stop_event.wait(interval)

    print("[PINGER] Stopped")


def start_pinger():
    global ping_thread
    stop_event.clear()
    ping_thread = threading.Thread(target=ping_loop, daemon=True)
    ping_thread.start()


def restart_pinger():
    stop_event.set()
    time.sleep(0.5)
    start_pinger()


# ════════════════════════════════════════════════════════════
#  API Routes
# ════════════════════════════════════════════════════════════

@app.route("/api/health")
def health():
    return jsonify({"status": "ok", "timestamp": datetime.now().isoformat()})


# ── Config ───────────────────────────────────────────────────

@app.route("/api/config", methods=["GET"])
def get_config():
    cfg = load_config()
    safe = dict(cfg)
    safe["smtp_password"] = "••••••••" if cfg.get("smtp_password") else ""
    return jsonify(safe)


@app.route("/api/config", methods=["PUT"])
def update_config():
    body = request.get_json(force=True)
    cfg  = load_config()

    fields = [
        "ping_interval", "smtp_enabled", "smtp_host", "smtp_port",
        "smtp_user", "smtp_from", "smtp_to", "smtp_tls", "alert_cooldown",
        "reminder_enabled", "reminder_interval", "network_name", "bg_color",
        "group_order",
    ]
    bool_fields = {"smtp_enabled", "smtp_tls", "reminder_enabled"}
    list_fields = {"group_order"}
    for f in fields:
        if f in body:
            val = body[f]
            # Coerce to proper bool — frontend may send string "false"/"true"
            if f in bool_fields:
                if isinstance(val, str):
                    val = val.lower() == "true"
                else:
                    val = bool(val)
            elif f in list_fields:
                if not isinstance(val, list):
                    val = []
            cfg[f] = val

    # Only update password if a real value was provided
    if body.get("smtp_password") and body["smtp_password"] != "••••••••":
        cfg["smtp_password"] = body["smtp_password"]

    save_config(cfg)
    restart_pinger()
    return jsonify({"saved": True, "ping_interval": cfg["ping_interval"]})


@app.route("/api/config/test-smtp", methods=["POST"])
def test_smtp():
    cfg = load_config()
    try:
        now_str      = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        network_name = cfg.get("network_name", "")
        subject      = "✅ Network Monitor — SMTP Test"

        # Use a fake host so we can reuse the same HTML template
        fake_host = {"name": "TEST-HOST", "ip": "0.0.0.0", "group": "Test"}
        html_body = _build_html_email(fake_host, "online", now_str, network_name).replace(
            "BACK ONLINE", "SMTP TEST"
        ).replace(
            "TEST-HOST is back online and responding to pings.",
            "Your SMTP settings are correctly configured. "
            "You will receive alerts like this when hosts go offline or come back online."
        )
        plain_body = (
            "Network Monitor — SMTP Test\n\n"
            "Your SMTP configuration is working correctly.\n"
            "You will receive alerts when hosts go offline or come back online.\n\n"
            f"Sent at: {now_str}\n-- Network Monitor"
        )

        _send_mail(cfg, subject, html_body, plain_body)
        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 400


# ── Hosts CRUD ───────────────────────────────────────────────

@app.route("/api/hosts", methods=["GET"])
def list_hosts():
    hosts = load_hosts()
    result = []
    for h in hosts:
        hid = h["id"]
        with state_lock:
            _init_state(hid)
            s = host_state[hid]
            # Acknowledged persisted on disk takes priority over in-memory
            acked = h.get("acknowledged", s["acknowledged"])
            if acked != s["acknowledged"]:
                s["acknowledged"] = acked  # sync memory from disk
            result.append({
                **h,
                "status":       s["status"],
                "latency_ms":   s["latency_ms"],
                "last_seen":    s["last_seen"],
                "last_check":   s["last_check"],
                "uptime_pct":   _uptime_pct(hid),
                "acknowledged": acked,
                "ack_at":       h.get("ack_at", s["ack_at"]),
            })
    return jsonify(result)


@app.route("/api/hosts", methods=["POST"])
def add_host():
    body = request.get_json(force=True)
    missing = [f for f in ["name", "ip"] if not body.get(f)]
    if missing:
        return jsonify({"error": f"Missing: {', '.join(missing)}"}), 400

    host = {
        "id":          str(uuid.uuid4()),
        "name":        body["name"].strip(),
        "ip":          body["ip"].strip(),
        "group":       body.get("group", "").strip() or "Ungrouped",
        "device_type": body.get("device_type", "other"),
        "enabled":     body.get("enabled", True),
    }
    hosts = load_hosts()
    hosts.append(host)
    save_hosts(hosts)
    _init_state(host["id"])

    # Ping immediately in background
    threading.Thread(target=_immediate_ping, args=(host,), daemon=True).start()

    return jsonify(host), 201


@app.route("/api/hosts/<host_id>", methods=["PUT"])
def update_host(host_id):
    body  = request.get_json(force=True)
    hosts = load_hosts()
    for i, h in enumerate(hosts):
        if h["id"] == host_id:
            if "name"        in body: hosts[i]["name"]        = body["name"].strip()
            if "ip"          in body: hosts[i]["ip"]           = body["ip"].strip()
            if "group"       in body: hosts[i]["group"]        = body["group"].strip() or "Ungrouped"
            if "device_type" in body: hosts[i]["device_type"]  = body["device_type"]
            if "enabled"     in body: hosts[i]["enabled"]      = body["enabled"]
            save_hosts(hosts)
            return jsonify(hosts[i])
    return jsonify({"error": "Host not found"}), 404


@app.route("/api/hosts/<host_id>", methods=["DELETE"])
def delete_host(host_id):
    hosts = load_hosts()
    hosts = [h for h in hosts if h["id"] != host_id]
    save_hosts(hosts)
    with state_lock:
        host_state.pop(host_id, None)
    return jsonify({"deleted": host_id})


@app.route("/api/hosts/<host_id>/ping", methods=["POST"])
def manual_ping(host_id):
    hosts = load_hosts()
    host  = next((h for h in hosts if h["id"] == host_id), None)
    if not host:
        return jsonify({"error": "Host not found"}), 404
    ok, ms = ping_host(host["ip"])
    now = datetime.now().isoformat()
    with state_lock:
        _init_state(host_id)
        host_state[host_id]["status"]     = "online" if ok else "offline"
        host_state[host_id]["latency_ms"] = ms
        host_state[host_id]["last_check"] = now
        if ok:
            host_state[host_id]["last_seen"] = now
        host_state[host_id]["history"].append({"ts": now, "ok": ok, "ms": ms})
    return jsonify({"status": "online" if ok else "offline", "latency_ms": ms})


@app.route("/api/hosts/<host_id>/history", methods=["GET"])
def host_history(host_id):
    with state_lock:
        _init_state(host_id)
        h = list(host_state[host_id]["history"])
    return jsonify(h)


@app.route("/api/hosts/<host_id>/acknowledge", methods=["POST"])
def acknowledge_host(host_id):
    """Silence reminder alerts for this host until it recovers."""
    hosts = load_hosts()
    if not any(h["id"] == host_id for h in hosts):
        return jsonify({"error": "Host not found"}), 404
    # Persist to disk so all workers see it
    updated = []
    for h in hosts:
        if h["id"] == host_id:
            h = {**h, "acknowledged": True, "ack_at": time.time()}
        updated.append(h)
    save_hosts(updated)
    # Also update in-memory state
    with state_lock:
        _init_state(host_id)
        host_state[host_id]["acknowledged"] = True
        host_state[host_id]["ack_at"]       = time.time()
    print(f"[ACK] Host {host_id} acknowledged — reminders silenced")
    return jsonify({"acknowledged": True, "host_id": host_id})


@app.route("/api/hosts/<host_id>/unacknowledge", methods=["POST"])
def unacknowledge_host(host_id):
    """Re-enable reminder alerts for this host."""
    hosts = load_hosts()
    if not any(h["id"] == host_id for h in hosts):
        return jsonify({"error": "Host not found"}), 404
    # Persist to disk so all workers see it
    updated = []
    for h in hosts:
        if h["id"] == host_id:
            h = {**h, "acknowledged": False, "ack_at": None}
        updated.append(h)
    save_hosts(updated)
    # Also update in-memory state
    with state_lock:
        _init_state(host_id)
        host_state[host_id]["acknowledged"]     = False
        host_state[host_id]["ack_at"]           = None
        host_state[host_id]["reminder_sent_at"] = None
    print(f"[ACK] Host {host_id} unacknowledged — reminders re-enabled")
    return jsonify({"acknowledged": False, "host_id": host_id})


# ── Summary ──────────────────────────────────────────────────

@app.route("/api/summary")
def summary():
    hosts = load_hosts()
    total, online, offline, unknown = 0, 0, 0, 0
    groups = {}
    for h in hosts:
        if not h.get("enabled", True):
            continue
        total += 1
        hid = h["id"]
        with state_lock:
            _init_state(hid)
            s = host_state[hid]["status"]
        if   s == "online":  online  += 1
        elif s == "offline": offline += 1
        else:                unknown += 1

        g = h.get("group", "Ungrouped")
        if g not in groups:
            groups[g] = {"online": 0, "offline": 0, "unknown": 0, "total": 0}
        groups[g][s]      += 1
        groups[g]["total"] += 1

    cfg = load_config()
    return jsonify({
        "total":    total,
        "online":   online,
        "offline":  offline,
        "unknown":  unknown,
        "groups":   groups,
        "ping_interval": cfg.get("ping_interval", 60),
        "generated": datetime.now().isoformat(),
    })


# ── Helpers ──────────────────────────────────────────────────

def _immediate_ping(host):
    ok, ms = ping_host(host["ip"])
    now = datetime.now().isoformat()
    with state_lock:
        _init_state(host["id"])
        host_state[host["id"]]["status"]     = "online" if ok else "offline"
        host_state[host["id"]]["latency_ms"] = ms
        host_state[host["id"]]["last_check"] = now
        if ok: host_state[host["id"]]["last_seen"] = now
        host_state[host["id"]]["history"].append({"ts": now, "ok": ok, "ms": ms})


# ── Startup ──────────────────────────────────────────────────
with app.app_context():
    for h in load_hosts():
        _init_state(h["id"])
    start_pinger()

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=False)

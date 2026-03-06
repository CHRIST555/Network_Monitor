# Network Monitor

A self-hosted Docker web app that pings hosts and reports their status.
HTTPS with your own CA certificate, host management from the browser,
SMTP email alerts, and grouping by category.

```
Browser (HTTPS :443)
    ↓
nginx (frontend)
  ├── React dashboard
  └── /api/* → Flask backend :5000
                  ↓
           ICMP ping to each host
           Status stored in memory
           Config encrypted on disk
```

---

## Features

- **Add hosts from the browser** — name, IP, group
- **Live status** — Online / Offline / Unknown per host
- **Connectivity bar** — last 24 ping results visualised as coloured blocks
- **Last seen timestamp** — relative time ("2m ago") with exact datetime on hover
- **Grouping** — organise hosts into categories (Servers, Workstations, Network, etc.)
- **Group summary cards** — at-a-glance online/offline count per group
- **Red alert banner** — appears across all tabs when any host goes offline
- **Configurable ping interval** — 15s / 30s / 1m / 2m / 5m / 10m, set in the UI
- **SMTP email alerts** — notifies when a host goes down or comes back up
- **Alert cooldown** — prevents alert storms for repeatedly flapping hosts
- **HTTPS** — your own CA certificate, HTTP auto-redirects
- **Encrypted config** — credentials stored Fernet-encrypted in a Docker volume

---

## Quick Start

### 1. Add your certificate
```
host-monitor/
└── certs/
    ├── server.crt
    └── server.key
```

### 2. Build and run
```bash
cd host-monitor
docker compose up -d --build
```

### 3. Open the dashboard
```
https://your-domain.com
```

### 4. Add hosts
- Click **Hosts** tab → **➕ Add Host**
- Enter name, IP address, and group (e.g. Servers)
- Host is pinged immediately and appears in the dashboard

### 5. Configure alerts (optional)
- Click **⚙ Settings** (top right)
- Set your ping interval
- Enable SMTP and enter your mail server details
- Click **Send Test Email** to verify
- Save

---

## SMTP configuration examples

**Office 365:**
```
Host: smtp.office365.com
Port: 587
TLS:  STARTTLS ✓
```

**Gmail (App Password):**
```
Host: smtp.gmail.com
Port: 587
TLS:  STARTTLS ✓
User: your@gmail.com
Pass: (16-char app password)
```

**Self-hosted (e.g. Postfix):**
```
Host: your-mail-server.local
Port: 25 or 587
TLS:  off if internal
```

---

## Ports used

| Port | Purpose |
|------|---------|
| 443  | HTTPS dashboard |
| 80   | HTTP → redirects to HTTPS |

The backend (port 5000) is internal only — never exposed to the host.

---

## Useful commands

```bash
# Logs
docker compose logs -f backend

# Restart
docker compose restart

# Rebuild after changes
docker compose up -d --build

# Renew certificate (no rebuild needed)
cp new.crt ./certs/server.crt
cp new.key ./certs/server.key
docker compose exec frontend nginx -s reload

# Stop and remove data
docker compose down -v
```

---

## How pinging works

The backend uses the system `ping` command (ICMP). The container has
`NET_RAW` capability added in docker-compose.yml — this is the minimum
required to send ICMP packets. No `privileged` mode needed.

Hosts that are disabled are skipped during ping cycles but remain stored.

---

## Project structure

```
host-monitor/
├── docker-compose.yml
├── certs/              ← put server.crt + server.key here
├── backend/
│   ├── app.py          ← Flask API, ping loop, SMTP alerts
│   ├── requirements.txt
│   └── Dockerfile
└── frontend/
    ├── src/App.jsx     ← React dashboard
    ├── src/main.jsx
    ├── index.html
    ├── package.json
    ├── vite.config.js
    ├── nginx.conf
    └── Dockerfile
```

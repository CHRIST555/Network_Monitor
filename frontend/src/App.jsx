import { useState, useEffect, useCallback, useRef } from "react";

const API = "";

const C = {
  navy:"#1B2A4A", blue:"#1A6B8A", teal:"#048A81",
  orange:"#E07B39", red:"#C0392B", green:"#27AE60",
  yellow:"#D4AC0D", white:"#FFFFFF", dark:"#0F1923",
  panel:"#161F2E", border:"#1E293B", muted:"#64748B", text:"#94A3B8",
};

// ── UI Atoms ─────────────────────────────────────────────────
const Badge = ({ label, color, bg }) => (
  <span style={{ background:bg, color, padding:"2px 10px", borderRadius:3,
    fontWeight:700, fontSize:10, border:`1px solid ${color}44`, whiteSpace:"nowrap" }}>{label}</span>
);

const statusColor  = s => s==="online"?"#27AE60":s==="offline"?"#C0392B":"#64748B";
const statusBg     = s => s==="online"?"#0A1A0A":s==="offline"?"#1A0505":"#0F1923";
const statusLabel  = s => s==="online"?"● Online":s==="offline"?"● Offline":"● Unknown";
const StatusBadge  = ({ s, acked }) => (
  <span style={{ display:"flex", alignItems:"center", gap:5 }}>
    <Badge label={statusLabel(s)} color={statusColor(s)} bg={statusBg(s)} />
    {acked && <Badge label="✓ Ack'd" color={C.orange} bg="#1A0E00"/>}
  </span>
);

const Panel = ({ children, style={} }) => (
  <div style={{ background:C.panel, border:`1px solid ${C.border}`,
    borderRadius:6, overflow:"hidden", ...style }}>{children}</div>
);

const SH = ({ title, color=C.teal, action }) => (
  <div style={{ background:"#0A1018", borderLeft:`3px solid ${color}`, padding:"10px 16px",
    fontSize:11, fontWeight:700, color, letterSpacing:"0.12em", textTransform:"uppercase",
    display:"flex", alignItems:"center", justifyContent:"space-between" }}>
    <span>{title}</span>{action}
  </div>
);

const KPI = ({ label, value, color, icon, sub }) => (
  <div style={{ background:C.panel, border:`1px solid ${C.border}`,
    borderTop:`3px solid ${color}`, borderRadius:6, padding:"14px 16px" }}>
    <div style={{ fontSize:22, marginBottom:4 }}>{icon}</div>
    <div style={{ fontSize:28, fontWeight:800, color, lineHeight:1 }}>{value}</div>
    {sub && <div style={{ fontSize:10, color:C.muted, marginTop:3 }}>{sub}</div>}
    <div style={{ fontSize:10, color:C.muted, marginTop:6,
      letterSpacing:"0.1em", textTransform:"uppercase" }}>{label}</div>
  </div>
);

const TH = ({ children }) => (
  <th style={{ padding:"9px 14px", textAlign:"left", color:C.muted, fontWeight:700,
    letterSpacing:"0.07em", textTransform:"uppercase", fontSize:10,
    borderBottom:`1px solid ${C.border}`, whiteSpace:"nowrap", background:"#0A1018" }}>{children}</th>
);

const TD = ({ children, style={} }) => (
  <td style={{ padding:"8px 14px", color:C.text, whiteSpace:"nowrap", ...style }}>{children}</td>
);

const Btn = ({ children, onClick, color=C.teal, small=false, disabled=false, style={} }) => (
  <button onClick={onClick} disabled={disabled} style={{
    background:disabled?"#1E293B":color, color:C.white, border:"none", borderRadius:4,
    padding:small?"4px 11px":"8px 18px", cursor:disabled?"not-allowed":"pointer",
    fontFamily:"inherit", fontWeight:700, fontSize:small?10:12,
    opacity:disabled?0.5:1, transition:"all 0.15s", whiteSpace:"nowrap", ...style,
  }}>{children}</button>
);

const Field = ({ label, value, onChange, type="text", placeholder="", required=false, hint, disabled=false }) => (
  <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
    <label style={{ fontSize:10, color:C.muted, fontWeight:700,
      letterSpacing:"0.1em", textTransform:"uppercase" }}>
      {label}{required&&<span style={{color:C.red}}> *</span>}
    </label>
    <input type={type} value={value} onChange={e=>onChange(e.target.value)}
      placeholder={placeholder} disabled={disabled}
      style={{ background:disabled?"#0A0F16":"#0A1018", border:`1px solid ${C.border}`, borderRadius:4,
        padding:"8px 12px", color:disabled?C.muted:C.white, fontFamily:"inherit", fontSize:12,
        outline:"none", width:"100%", opacity:disabled?0.6:1 }}/>
    {hint&&<span style={{fontSize:10,color:C.muted}}>{hint}</span>}
  </div>
);

const Toggle = ({ label, checked, onChange }) => (
  <div style={{ display:"flex", alignItems:"center", gap:10, cursor:"pointer" }}
    onClick={()=>onChange(!checked)}>
    <div style={{ width:36, height:20, borderRadius:10, background:checked?C.teal:"#1E293B",
      position:"relative", transition:"background 0.2s", border:`1px solid ${C.border}` }}>
      <div style={{ width:14, height:14, borderRadius:"50%", background:C.white,
        position:"absolute", top:2, left:checked?18:2, transition:"left 0.2s" }}/>
    </div>
    <span style={{ fontSize:12, color:C.text }}>{label}</span>
  </div>
);

// ── Relative time helper ─────────────────────────────────────
function relTime(iso) {
  if (!iso) return "Never";
  const diff = Math.floor((Date.now() - new Date(iso)) / 1000);
  if (diff < 5)   return "Just now";
  if (diff < 60)  return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff/60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff/3600)}h ago`;
  return `${Math.floor(diff/86400)}d ago`;
}

function fmtDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString();
}

// ── Host Modal ───────────────────────────────────────────────
const EMPTY_HOST = { name:"", ip:"", group:"", enabled:true };

function HostModal({ host, groups, onClose, onSave }) {
  const editing = !!host;
  const [form, setForm]   = useState(host ? { name:host.name, ip:host.ip, group:host.group==="Ungrouped"?"":host.group, enabled:host.enabled } : {...EMPTY_HOST});
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState(null);
  const set = k => v => setForm(f=>({...f,[k]:v}));

  const handleSave = async () => {
    if (!form.name || !form.ip) { setError("Name and IP address are required."); return; }
    setSaving(true); setError(null);
    try {
      const url    = editing ? `${API}/api/hosts/${host.id}` : `${API}/api/hosts`;
      const method = editing ? "PUT" : "POST";
      const res    = await fetch(url, { method, headers:{"Content-Type":"application/json"}, body:JSON.stringify(form) });
      const data   = await res.json();
      if (!res.ok) { setError(data.error||"Server error"); setSaving(false); return; }
      onSave(data);
    } catch(e) { setError(e.message); setSaving(false); }
  };

  return (
    <div style={{ position:"fixed", inset:0, background:"#00000099", display:"flex",
      alignItems:"center", justifyContent:"center", zIndex:100 }}>
      <div style={{ background:C.panel, border:`1px solid ${C.border}`, borderRadius:8,
        padding:28, width:440, maxWidth:"95vw" }}>
        <div style={{ fontSize:14, fontWeight:700, color:C.white, marginBottom:20,
          borderBottom:`1px solid ${C.border}`, paddingBottom:12 }}>
          {editing ? "✏ Edit Host" : "➕ Add Host"}
        </div>
        <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
          <Field label="Host Name" value={form.name} onChange={set("name")}
            placeholder="e.g. Web Server 01" required/>
          <Field label="IP Address" value={form.ip} onChange={set("ip")}
            placeholder="e.g. 192.168.1.10" required hint="IPv4 or IPv6 address"/>
          <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
            <label style={{ fontSize:10, color:C.muted, fontWeight:700,
              letterSpacing:"0.1em", textTransform:"uppercase" }}>Group</label>
            <input value={form.group} onChange={e=>set("group")(e.target.value)}
              placeholder="e.g. Servers, Workstations, Network"
              list="group-list"
              style={{ background:"#0A1018", border:`1px solid ${C.border}`, borderRadius:4,
                padding:"8px 12px", color:C.white, fontFamily:"inherit", fontSize:12, outline:"none" }}/>
            <datalist id="group-list">
              {groups.map(g=><option key={g} value={g}/>)}
            </datalist>
          </div>
          <Toggle label="Enabled — include this host in ping checks" checked={form.enabled} onChange={set("enabled")}/>
        </div>
        {error && <div style={{ background:"#1A0505", border:`1px solid ${C.red}44`,
          borderRadius:4, padding:"10px 14px", color:C.red, fontSize:11, marginTop:16 }}>{error}</div>}
        <div style={{ display:"flex", gap:10, justifyContent:"flex-end", marginTop:20 }}>
          <Btn onClick={onClose} color="#334155">Cancel</Btn>
          <Btn onClick={handleSave} disabled={saving}>{saving?"Saving…":editing?"Save Changes":"Add Host"}</Btn>
        </div>
      </div>
    </div>
  );
}

// ── Settings Panel ───────────────────────────────────────────
function SettingsPanel({ onClose }) {
  const [cfg,     setCfg]     = useState(null);
  const [saving,  setSaving]  = useState(false);
  const [testing, setTesting] = useState(false);
  const [msg,     setMsg]     = useState(null);

  useEffect(()=>{
    fetch(`${API}/api/config`).then(r=>r.json()).then(setCfg);
  },[]);

  const set = k => v => setCfg(c=>({...c,[k]:v}));

  const handleSave = async () => {
    setSaving(true); setMsg(null);
    try {
      const res = await fetch(`${API}/api/config`, { method:"PUT",
        headers:{"Content-Type":"application/json"}, body:JSON.stringify(cfg) });
      if (res.ok) setMsg({ok:true, text:"Settings saved."});
      else        setMsg({ok:false, text:"Save failed."});
    } catch(e) { setMsg({ok:false, text:e.message}); }
    setSaving(false);
  };

  const handleTestSmtp = async () => {
    setTesting(true); setMsg(null);
    try {
      const res  = await fetch(`${API}/api/config/test-smtp`, { method:"POST" });
      const data = await res.json();
      setMsg(data.success
        ? {ok:true,  text:"Test email sent successfully!"}
        : {ok:false, text:`SMTP error: ${data.error}`});
    } catch(e) { setMsg({ok:false, text:e.message}); }
    setTesting(false);
  };

  if (!cfg) return (
    <div style={{ position:"fixed", inset:0, background:"#00000099", display:"flex",
      alignItems:"center", justifyContent:"center", zIndex:100 }}>
      <div style={{ color:C.teal, fontSize:13 }}>Loading…</div>
    </div>
  );

  const INTERVALS = [
    {label:"15s",value:15},{label:"30s",value:30},{label:"1m",value:60},
    {label:"2m",value:120},{label:"5m",value:300},{label:"10m",value:600},
  ];

  return (
    <div style={{ position:"fixed", inset:0, background:"#00000099", display:"flex",
      alignItems:"center", justifyContent:"center", zIndex:100, padding:16 }}>
      <div style={{ background:C.panel, border:`1px solid ${C.border}`, borderRadius:8,
        padding:28, width:540, maxWidth:"95vw", maxHeight:"90vh", overflowY:"auto" }}>
        <div style={{ fontSize:14, fontWeight:700, color:C.white, marginBottom:24,
          borderBottom:`1px solid ${C.border}`, paddingBottom:12 }}>
          ⚙ Settings
        </div>

        {/* Ping interval */}
        <div style={{ marginBottom:24 }}>
          <div style={{ fontSize:11, color:C.teal, fontWeight:700, letterSpacing:"0.1em",
            textTransform:"uppercase", marginBottom:12 }}>Ping Interval</div>
          <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
            {INTERVALS.map(iv=>(
              <button key={iv.value} onClick={()=>set("ping_interval")(iv.value)} style={{
                background:cfg.ping_interval===iv.value?C.teal:"#1E293B",
                color:cfg.ping_interval===iv.value?C.white:C.muted,
                border:"none", borderRadius:4, padding:"6px 16px", cursor:"pointer",
                fontFamily:"inherit", fontWeight:700, fontSize:12, transition:"all 0.15s",
              }}>{iv.label}</button>
            ))}
          </div>
          <div style={{ fontSize:10, color:C.muted, marginTop:8 }}>
            How often each host is pinged. Shorter intervals use more resources.
          </div>
        </div>

        {/* SMTP */}
        <div style={{ borderTop:`1px solid ${C.border}`, paddingTop:20 }}>
          <div style={{ fontSize:11, color:C.teal, fontWeight:700, letterSpacing:"0.1em",
            textTransform:"uppercase", marginBottom:14 }}>Email Alerts (SMTP)</div>
          <Toggle label="Enable email alerts when hosts go down or come back online"
            checked={cfg.smtp_enabled} onChange={set("smtp_enabled")}/>
          <div style={{ display:"flex", flexDirection:"column", gap:12, marginTop:16,
            opacity:cfg.smtp_enabled?1:0.4, pointerEvents:cfg.smtp_enabled?"auto":"none" }}>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
              <Field label="SMTP Host" value={cfg.smtp_host||""} onChange={set("smtp_host")}
                placeholder="smtp.office365.com"/>
              <Field label="SMTP Port" value={String(cfg.smtp_port||587)} onChange={v=>set("smtp_port")(parseInt(v)||587)}
                placeholder="587"/>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
              <Field label="Username" value={cfg.smtp_user||""} onChange={set("smtp_user")}
                placeholder="alerts@company.com"/>
              <Field label="Password" type="password" value={cfg.smtp_password||""}
                onChange={set("smtp_password")} placeholder="••••••••"/>
            </div>
            <Field label="From Address" value={cfg.smtp_from||""} onChange={set("smtp_from")}
              placeholder="Network Monitor <alerts@company.com>"/>
            <Field label="To Address(es)" value={cfg.smtp_to||""} onChange={set("smtp_to")}
              placeholder="admin@company.com, noc@company.com"
              hint="Separate multiple addresses with commas"/>
            <Toggle label="Use STARTTLS (recommended — use for port 587)"
              checked={cfg.smtp_tls!==false} onChange={set("smtp_tls")}/>

            {/* ── Reminder alerts ── */}
            <div style={{ borderTop:`1px solid ${C.border}`, paddingTop:14, marginTop:4 }}>
              <Toggle
                label="Send reminder alerts while a host stays offline"
                checked={cfg.reminder_enabled!==false}
                onChange={set("reminder_enabled")}/>

              {cfg.reminder_enabled!==false && (
                <div style={{ marginTop:14, animation:"fadeIn 0.2s ease" }}>
                  <div style={{ fontSize:10, color:C.muted, marginBottom:6,
                    letterSpacing:"0.1em", textTransform:"uppercase" }}>
                    Reminder Interval
                  </div>
                  <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                    {[
                      {l:"15m", v:900},  {l:"30m", v:1800},
                      {l:"1h",  v:3600}, {l:"2h",  v:7200},
                      {l:"4h",  v:14400},{l:"12h", v:43200},
                    ].map(iv=>(
                      <button key={iv.v} onClick={()=>set("reminder_interval")(iv.v)} style={{
                        background:(cfg.reminder_interval??1800)===iv.v?C.orange:"#1E293B",
                        color:(cfg.reminder_interval??1800)===iv.v?C.white:C.muted,
                        border:"none", borderRadius:4, padding:"5px 14px", cursor:"pointer",
                        fontFamily:"inherit", fontWeight:700, fontSize:11,
                        transition:"all 0.15s",
                      }}>{iv.l}</button>
                    ))}
                  </div>
                  <div style={{ fontSize:10, color:C.muted, marginTop:8, lineHeight:1.7 }}>
                    How often to re-send the alert while the host remains offline.
                    You will receive: <span style={{color:C.orange}}>immediate alert → reminder every{" "}
                    {[{v:900,l:"15 min"},{v:1800,l:"30 min"},{v:3600,l:"1 hour"},
                      {v:7200,l:"2 hours"},{v:14400,l:"4 hours"},{v:43200,l:"12 hours"}]
                      .find(x=>x.v===(cfg.reminder_interval??1800))?.l||"30 min"} → recovery alert
                    </span>.
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {msg && (
          <div style={{ background:msg.ok?"#0A1A0A":"#1A0505",
            border:`1px solid ${msg.ok?C.green:C.red}44`, borderRadius:4,
            padding:"10px 14px", color:msg.ok?C.green:C.red,
            fontSize:11, marginTop:16 }}>{msg.text}</div>
        )}

        <div style={{ display:"flex", gap:10, justifyContent:"space-between", marginTop:20,
          borderTop:`1px solid ${C.border}`, paddingTop:16 }}>
          <Btn onClick={handleTestSmtp} color={C.orange} disabled={testing||!cfg.smtp_enabled}>
            {testing?"Sending…":"✉ Send Test Email"}
          </Btn>
          <div style={{ display:"flex", gap:10 }}>
            <Btn onClick={onClose} color="#334155">Close</Btn>
            <Btn onClick={handleSave} disabled={saving}>{saving?"Saving…":"Save Settings"}</Btn>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Connectivity bar (last N pings) ──────────────────────────
function ConnBar({ hostId }) {
  const [hist, setHist] = useState([]);
  useEffect(()=>{
    fetch(`${API}/api/hosts/${hostId}/history`)
      .then(r=>r.json()).then(d=>setHist(d.slice(-24)));
  },[hostId]);
  if (!hist.length) return <span style={{color:C.muted,fontSize:10}}>No data</span>;
  return (
    <div style={{ display:"flex", gap:2, alignItems:"center" }}>
      {hist.map((h,i)=>(
        <div key={i} title={`${relTime(h.ts)} — ${h.ok?"Online":"Offline"}${h.ms?" ("+h.ms+"ms)":""}`}
          style={{ width:6, height:16, borderRadius:2,
            background:h.ok?C.green:C.red, opacity:0.8+(i/hist.length*0.2) }}/>
      ))}
    </div>
  );
}

// ── Down alert banner ────────────────────────────────────────
function DownBanner({ hosts, onAck, onUnack }) {
  const down = hosts.filter(h => h.status === "offline" && h.enabled !== false);
  if (!down.length) return null;
  const acked   = down.filter(h => h.acknowledged);
  const unacked = down.filter(h => !h.acknowledged);
  return (
    <div style={{ background:"#1A0505", border:`1px solid ${C.red}55`,
      borderRadius:6, padding:"14px 18px", marginBottom:20 }}>
      <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom: unacked.length ? 10 : 0 }}>
        <span style={{ fontSize:20 }}>🚨</span>
        <div style={{ fontSize:12, fontWeight:700, color:C.red,
          letterSpacing:"0.08em", textTransform:"uppercase" }}>
          {down.length} Host{down.length!==1?"s":""} Offline
          {acked.length > 0 && (
            <span style={{ color:C.orange, fontWeight:400, fontSize:10,
              marginLeft:10, textTransform:"none", letterSpacing:"normal" }}>
              ({acked.length} acknowledged)
            </span>
          )}
        </div>
      </div>

      {/* Unacknowledged — red */}
      {unacked.length > 0 && (
        <div style={{ display:"flex", flexWrap:"wrap", gap:8, marginBottom: acked.length ? 10 : 0 }}>
          {unacked.map(h => (
            <div key={h.id} style={{ display:"flex", alignItems:"center", gap:0,
              background:"#2A0808", border:`1px solid ${C.red}44`, borderRadius:5,
              overflow:"hidden" }}>
              <span style={{ padding:"5px 12px", fontSize:11, fontWeight:600, color:C.red }}>
                {h.name} — {h.ip}
              </span>
              <button onClick={() => onAck(h)} style={{
                background:"#3D0A0A", border:"none", borderLeft:`1px solid ${C.red}44`,
                color:C.orange, cursor:"pointer", padding:"5px 10px",
                fontFamily:"inherit", fontSize:10, fontWeight:700,
                transition:"background 0.15s",
              }} title="Acknowledge — silence reminders until host recovers">
                ✓ Ack
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Acknowledged — dimmed with unack option */}
      {acked.length > 0 && (
        <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
          {acked.map(h => (
            <div key={h.id} style={{ display:"flex", alignItems:"center", gap:0,
              background:"#1A1200", border:`1px solid ${C.orange}33`, borderRadius:5,
              overflow:"hidden", opacity:0.75 }}>
              <span style={{ padding:"5px 8px", fontSize:10, color:C.orange }}>✓</span>
              <span style={{ padding:"5px 10px 5px 0", fontSize:11, fontWeight:600, color:C.muted }}>
                {h.name} — {h.ip}
              </span>
              <button onClick={() => onUnack(h)} style={{
                background:"#2A1800", border:"none", borderLeft:`1px solid ${C.orange}33`,
                color:C.muted, cursor:"pointer", padding:"5px 10px",
                fontFamily:"inherit", fontSize:9, fontWeight:700,
              }} title="Remove acknowledgement — re-enable reminders">
                ✕
              </button>
            </div>
          ))}
          <span style={{ fontSize:10, color:C.muted, alignSelf:"center", fontStyle:"italic" }}>
            — reminders silenced
          </span>
        </div>
      )}
    </div>
  );
}

// ── Main App ─────────────────────────────────────────────────
const TABS = ["Dashboard","Hosts","⚙ Settings"];

export default function App() {
  const [tab,        setTab]      = useState(0);
  const [hosts,      setHosts]    = useState([]);
  const [summary,    setSummary]  = useState(null);
  const [loading,    setLoading]  = useState(true);
  const [showAdd,    setShowAdd]  = useState(false);
  const [editHost,   setEditHost] = useState(null);
  const [showSettings,setShowSettings]=useState(false);
  const [pinging,    setPinging]  = useState({});
  const [acking,     setAcking]   = useState({});
  const intervalRef = useRef(null);

  const fetchAll = useCallback(async () => {
    try {
      const [hRes, sRes] = await Promise.all([
        fetch(`${API}/api/hosts`),
        fetch(`${API}/api/summary`),
      ]);
      setHosts(await hRes.json());
      setSummary(await sRes.json());
    } catch{}
    setLoading(false);
  },[]);

  useEffect(()=>{
    fetchAll();
    // Poll every 10s so status stays live without a manual refresh
    intervalRef.current = setInterval(fetchAll, 10000);
    return ()=>clearInterval(intervalRef.current);
  },[fetchAll]);

  const handleManualPing = async (h) => {
    setPinging(p=>({...p,[h.id]:true}));
    await fetch(`${API}/api/hosts/${h.id}/ping`, {method:"POST"});
    await fetchAll();
    setPinging(p=>({...p,[h.id]:false}));
  };

  const handleDelete = async (h) => {
    if (!window.confirm(`Remove "${h.name}" (${h.ip})?`)) return;
    await fetch(`${API}/api/hosts/${h.id}`, {method:"DELETE"});
    fetchAll();
  };

  const handleAck = async (h) => {
    setAcking(a => ({...a, [h.id]: true}));
    await fetch(`${API}/api/hosts/${h.id}/acknowledge`, {method:"POST"});
    await fetchAll();
    setAcking(a => ({...a, [h.id]: false}));
  };

  const handleUnack = async (h) => {
    setAcking(a => ({...a, [h.id]: true}));
    await fetch(`${API}/api/hosts/${h.id}/unacknowledge`, {method:"POST"});
    await fetchAll();
    setAcking(a => ({...a, [h.id]: false}));
  };

  const groups = [...new Set(hosts.map(h=>h.group||"Ungrouped"))].sort();
  const groupNames = groups.filter(g=>g!=="Ungrouped");

  // Group hosts for display
  const grouped = {};
  hosts.forEach(h=>{
    const g = h.group||"Ungrouped";
    if (!grouped[g]) grouped[g]=[];
    grouped[g].push(h);
  });

  const offlineCount = hosts.filter(h=>h.status==="offline"&&h.enabled!==false).length;

  return (
    <div style={{ fontFamily:"'IBM Plex Mono',monospace", background:C.dark,
      minHeight:"100vh", color:"#CBD5E1" }}>
      <style>{`
        *{box-sizing:border-box;margin:0;padding:0}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}
        @keyframes fadeIn{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:none}}
        ::-webkit-scrollbar{width:5px;height:5px}
        ::-webkit-scrollbar-track{background:#0F1923}
        ::-webkit-scrollbar-thumb{background:#1E293B;border-radius:3px}
      `}</style>

      {/* Modals */}
      {(showAdd||editHost) && (
        <HostModal host={editHost} groups={groupNames}
          onClose={()=>{setShowAdd(false);setEditHost(null);}}
          onSave={()=>{setShowAdd(false);setEditHost(null);fetchAll();}}/>
      )}
      {showSettings && <SettingsPanel onClose={()=>{setShowSettings(false);fetchAll();}}/>}

      {/* Header */}
      <div style={{ background:C.navy, borderBottom:`3px solid ${C.teal}`,
        padding:"0 28px", display:"flex", alignItems:"center", height:54, gap:16 }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ width:8, height:8, borderRadius:"50%", background:C.teal,
            boxShadow:`0 0 8px ${C.teal}` }}/>
          <span style={{ color:C.white, fontWeight:700, fontSize:12,
            letterSpacing:"0.15em", textTransform:"uppercase" }}>Network Monitor</span>
        </div>
        {/* Live pulse indicator */}
        <div style={{ display:"flex", alignItems:"center", gap:6,
          background:"#0A1018", border:`1px solid ${C.teal}33`,
          borderRadius:20, padding:"3px 10px" }}>
          <div style={{ width:6, height:6, borderRadius:"50%", background:C.teal,
            animation:"pulse 2s ease-in-out infinite" }}/>
          <span style={{ fontSize:10, color:C.teal, fontWeight:700 }}>Live — polling every 10s</span>
        </div>
        <div style={{ marginLeft:"auto", display:"flex", gap:10 }}>
          <Btn onClick={()=>setShowSettings(true)} color="#1E293B" small>⚙ Settings</Btn>
          <Btn onClick={()=>{setEditHost(null);setShowAdd(true);}} small>➕ Add Host</Btn>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ background:"#121A27", borderBottom:`1px solid ${C.border}`,
        display:"flex", padding:"0 28px", gap:2 }}>
        {TABS.map((t,i)=>(
          <button key={t} onClick={()=>setTab(i)} style={{
            background:"transparent", color:tab===i?C.white:C.muted,
            border:"none", borderBottom:tab===i?`2px solid ${C.teal}`:"2px solid transparent",
            padding:"10px 20px", cursor:"pointer", fontSize:11, fontWeight:700,
            fontFamily:"inherit", letterSpacing:"0.08em", textTransform:"uppercase",
          }}>
            {t}
            {t==="Hosts" && offlineCount>0 &&
              <span style={{ marginLeft:6, background:C.red, color:C.white,
                borderRadius:10, padding:"1px 6px", fontSize:9 }}>{offlineCount}</span>}
          </button>
        ))}
      </div>

      <div style={{ padding:"24px 28px" }}>
        {loading && (
          <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"50vh", flexDirection:"column", gap:14 }}>
            <div style={{ width:36, height:36, border:`3px solid ${C.border}`, borderTop:`3px solid ${C.teal}`, borderRadius:"50%", animation:"spin 1s linear infinite" }}/>
            <div style={{ color:C.muted, fontSize:12 }}>Connecting to backend…</div>
          </div>
        )}

        {!loading && <>
          <DownBanner hosts={hosts} onAck={handleAck} onUnack={handleUnack}/>

          {/* ════ DASHBOARD ════ */}
          {tab===0 && <>
            {/* KPIs */}
            <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:14, marginBottom:24 }}>
              <KPI label="Total Hosts"  value={summary?.total||0}   color={C.teal}   icon="🖥" sub={`${groups.length} group${groups.length!==1?"s":""}`}/>
              <KPI label="Online"       value={summary?.online||0}  color={C.green}  icon="🟢" sub="responding"/>
              <KPI label="Offline"      value={summary?.offline||0} color={C.red}    icon="🔴" sub="not responding"/>
              <KPI label="Unknown"      value={summary?.unknown||0} color={C.muted}  icon="⚪" sub="not yet checked"/>
            </div>

            {/* Group cards */}
            {Object.entries(summary?.groups||{}).length > 0 && (
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))", gap:14, marginBottom:24 }}>
                {Object.entries(summary?.groups||{}).map(([g,s])=>{
                  const allOn = s.offline===0&&s.unknown===0;
                  const anyOff = s.offline>0;
                  const border = anyOff?C.red:allOn?C.green:C.muted;
                  return (
                    <div key={g} style={{ background:C.panel, border:`1px solid ${border}44`,
                      borderTop:`3px solid ${border}`, borderRadius:6, padding:"14px 16px" }}>
                      <div style={{ fontSize:11, fontWeight:700, color:C.text,
                        letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:10 }}>{g}</div>
                      <div style={{ display:"flex", gap:10 }}>
                        <div style={{ textAlign:"center" }}>
                          <div style={{ fontSize:22, fontWeight:800, color:C.green }}>{s.online}</div>
                          <div style={{ fontSize:9, color:C.muted }}>ONLINE</div>
                        </div>
                        <div style={{ textAlign:"center" }}>
                          <div style={{ fontSize:22, fontWeight:800, color:s.offline>0?C.red:"#334155" }}>{s.offline}</div>
                          <div style={{ fontSize:9, color:C.muted }}>OFFLINE</div>
                        </div>
                        <div style={{ textAlign:"center" }}>
                          <div style={{ fontSize:22, fontWeight:800, color:C.muted }}>{s.total}</div>
                          <div style={{ fontSize:9, color:C.muted }}>TOTAL</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* All hosts compact view */}
            <Panel>
              <SH title="All Hosts" action={
                <Btn small onClick={fetchAll}>↻ Refresh</Btn>
              }/>
              {hosts.length===0?(
                <div style={{ padding:40, textAlign:"center", color:C.muted }}>
                  <div style={{ fontSize:36, marginBottom:12 }}>🖥</div>
                  <div style={{ fontSize:13, color:C.text, marginBottom:8 }}>No hosts added yet</div>
                  <Btn onClick={()=>setShowAdd(true)}>➕ Add First Host</Btn>
                </div>
              ):(
                <div style={{ overflowX:"auto" }}>
                  <table style={{ width:"100%", borderCollapse:"collapse", fontSize:11 }}>
                    <thead><tr>
                      {["Host","IP","Group","Status","Last Seen","Connectivity"].map(h=><TH key={h}>{h}</TH>)}
                    </tr></thead>
                    <tbody>
                      {hosts.map((h,i)=>(
                        <tr key={h.id} style={{ borderBottom:`1px solid ${C.border}`,
                          background:i%2===0?C.panel:"#12192A",
                          opacity:h.enabled===false?0.4:1 }}>
                          <TD style={{ color:C.white, fontWeight:700 }}>{h.name}</TD>
                          <TD style={{ color:C.teal, fontFamily:"monospace" }}>{h.ip}</TD>
                          <TD style={{ color:C.muted }}>{h.group||"Ungrouped"}</TD>
                          <td style={{ padding:"8px 14px" }}><StatusBadge s={h.status} acked={h.acknowledged}/></td>
                          <TD style={{ color:C.muted }}>{relTime(h.last_seen)}</TD>
                          <td style={{ padding:"8px 14px" }}><ConnBar hostId={h.id}/></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Panel>
          </>}

          {/* ════ HOSTS ════ */}
          {tab===1 && (
            <div style={{ display:"flex", flexDirection:"column", gap:18 }}>
              <div style={{ display:"flex", justifyContent:"flex-end" }}>
                <Btn onClick={()=>setShowAdd(true)}>➕ Add Host</Btn>
              </div>

              {hosts.length===0?(
                <Panel>
                  <div style={{ padding:48, textAlign:"center", color:C.muted }}>
                    <div style={{ fontSize:40, marginBottom:12 }}>🖥</div>
                    <div style={{ fontSize:14, color:C.text, marginBottom:8 }}>No hosts configured</div>
                    <div style={{ fontSize:12, marginBottom:20 }}>Add a host to start monitoring.</div>
                    <Btn onClick={()=>setShowAdd(true)}>➕ Add First Host</Btn>
                  </div>
                </Panel>
              ) : (
                Object.entries(grouped).sort(([a],[b])=>a.localeCompare(b)).map(([group, ghosts])=>(
                  <Panel key={group}>
                    <SH title={`${group} — ${ghosts.length} host${ghosts.length!==1?"s":""}`}
                      color={ghosts.some(h=>h.status==="offline")?C.red:C.teal}/>
                    <div style={{ overflowX:"auto" }}>
                      <table style={{ width:"100%", borderCollapse:"collapse", fontSize:11 }}>
                        <thead><tr>
                          {["Host Name","IP Address","Status","Last Seen","Last Check","Connectivity (last 24)","Actions"].map(h=><TH key={h}>{h}</TH>)}
                        </tr></thead>
                        <tbody>
                          {ghosts.map((h,i)=>(
                            <tr key={h.id} style={{ borderBottom:`1px solid ${C.border}`,
                              background:i%2===0?C.panel:"#12192A",
                              opacity:h.enabled===false?0.45:1,
                              animation:"fadeIn 0.2s ease" }}>
                              <TD style={{ color:C.white, fontWeight:700 }}>
                                {h.name}
                                {h.enabled===false&&<span style={{color:C.muted,fontSize:9,marginLeft:6}}>(disabled)</span>}
                              </TD>
                              <TD style={{ color:C.teal, fontFamily:"monospace" }}>{h.ip}</TD>
                              <td style={{ padding:"8px 14px" }}><StatusBadge s={h.status} acked={h.acknowledged}/></td>
                              <td style={{ padding:"8px 14px" }}>
                                <span style={{ color:C.text }} title={fmtDate(h.last_seen)}>
                                  {relTime(h.last_seen)}
                                </span>
                              </td>
                              <td style={{ padding:"8px 14px" }}>
                                <span style={{ color:C.muted, fontSize:10 }} title={fmtDate(h.last_check)}>
                                  {relTime(h.last_check)}
                                </span>
                              </td>
                              <td style={{ padding:"8px 14px" }}><ConnBar hostId={h.id}/></td>
                              <td style={{ padding:"8px 14px" }}>
                                <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                                  <Btn small color={C.teal}
                                    disabled={pinging[h.id]}
                                    onClick={()=>handleManualPing(h)}>
                                    {pinging[h.id]?"…":"Ping"}
                                  </Btn>
                                  {h.status==="offline" && !h.acknowledged && (
                                    <Btn small color={C.orange}
                                      disabled={acking[h.id]}
                                      onClick={()=>handleAck(h)}
                                      style={{ border:`1px solid ${C.orange}` }}>
                                      {acking[h.id]?"…":"✓ Ack"}
                                    </Btn>
                                  )}
                                  {h.status==="offline" && h.acknowledged && (
                                    <Btn small color="#334155"
                                      disabled={acking[h.id]}
                                      onClick={()=>handleUnack(h)}
                                      style={{ border:`1px solid #475569` }}>
                                      {acking[h.id]?"…":"✕ Unack"}
                                    </Btn>
                                  )}
                                  <Btn small color={C.blue} onClick={()=>setEditHost(h)}>Edit</Btn>
                                  <Btn small color={C.red} onClick={()=>handleDelete(h)}>Delete</Btn>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </Panel>
                ))
              )}
            </div>
          )}

          {/* ════ SETTINGS ════ */}
          {tab===2 && (
            <div style={{ maxWidth:560 }}>
              <Panel>
                <SH title="Settings"/>
                <div style={{ padding:24 }}>
                  <div style={{ color:C.text, fontSize:12, lineHeight:1.8 }}>
                    Configure the ping interval and SMTP email alerts from the settings panel.
                  </div>
                  <div style={{ marginTop:16 }}>
                    <Btn onClick={()=>setShowSettings(true)}>Open Settings</Btn>
                  </div>
                </div>
              </Panel>
            </div>
          )}
        </>}
      </div>
    </div>
  );
}

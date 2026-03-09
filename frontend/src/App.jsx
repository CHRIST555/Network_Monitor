import { useState, useEffect, useCallback, useRef, useContext, createContext } from "react";

const API = "";

const THEMES = {
  dark: {
    name: "Dark",
    dark:      "#050D18",
    navy:      "#0B1A2E",
    panel:     "#0D1B2E",
    border:    "#1A3A5C",
    muted:     "#5C7A99",
    text:      "#8BAFC7",
    white:     "#FFFFFF",
    input:     "#0A1525",
    subheader: "#0A1018",
    tabBar:    "#0B1A2E",
    bodyText:  "#CBD5E1",
    modalBg:   "#0D1B2E",
    rowHover:  "#0A1525",
  },
  blue: {
    name: "Blue",
    dark:      "#082050",
    navy:      "#0D47A1",
    panel:     "#0E52B8",
    border:    "#1976D2",
    muted:     "#90CAF9",
    text:      "#BBDEFB",
    white:     "#FFFFFF",
    input:     "#0A3A8A",
    subheader: "#0A3070",
    tabBar:    "#0D47A1",
    bodyText:  "#E3F2FD",
    modalBg:   "#0D3A90",
    rowHover:  "#0A3A8A",
  },
  white: {
    name: "White",
    dark:      "#F0F4F8",
    navy:      "#FFFFFF",
    panel:     "#FFFFFF",
    border:    "#CBD5E1",
    muted:     "#64748B",
    text:      "#475569",
    white:     "#1E293B",
    input:     "#F8FAFC",
    subheader: "#F1F5F9",
    tabBar:    "#FFFFFF",
    bodyText:  "#1E293B",
    modalBg:   "#FFFFFF",
    rowHover:  "#F8FAFC",
  },
};

const ACCENT = {
  orange: "#FC3D21",
  red:    "#B71C1C",
  green:  "#00C853",
  yellow: "#FFD600",
  blue:   "#0D47A1",
  teal:   "#1565C0",
};

// Theme context — all components read C from here
const ThemeCtx = createContext({ ...THEMES.dark, ...ACCENT });
const useC = () => useContext(ThemeCtx);

// ── UI Atoms ─────────────────────────────────────────────────
const Badge = ({ label, color, bg }) => (
  <span style={{ background:bg, color, padding:"2px 10px", borderRadius:3,
    fontWeight:700, fontSize:10, border:`1px solid ${color}44`, whiteSpace:"nowrap" }}>{label}</span>
);

const statusColor = s => s==="online"?ACCENT.green:s==="offline"?ACCENT.red:"#64748B";
const statusBg    = s => s==="online"?`${ACCENT.green}18`:s==="offline"?`${ACCENT.red}18`:"#64748B18";
const statusLabel = s => s==="online" ? "Online" : s==="offline" ? "Offline" : "Unknown";
const StatusBadge = ({ s, acked }) => (
  <span style={{ display:"flex", alignItems:"center", gap:5 }}>
    <span style={{ display:"flex", alignItems:"center", gap:4, background:statusBg(s),
      color:statusColor(s), padding:"2px 8px", borderRadius:3,
      fontWeight:700, fontSize:10, border:`1px solid ${statusColor(s)}44` }}>
      <span style={{ width:6, height:6, borderRadius:"50%", background:statusColor(s),
        boxShadow:`0 0 4px ${statusColor(s)}`, display:"inline-block", flexShrink:0 }}/>
      {statusLabel(s)}
    </span>
    {acked && <Badge label="✓ Ack'd" color={ACCENT.orange} bg={`${ACCENT.orange}18`}/>}
  </span>
);

const Panel = ({ children, style={} }) => {
  const C = useC();
  return <div style={{ background:C.panel, border:`1px solid ${C.border}`, borderRadius:6, overflow:"hidden", ...style }}>{children}</div>;
};

const SH = ({ title, color, action }) => {
  const C = useC();
  const c = color || ACCENT.teal;
  return (
    <div style={{ background:C.subheader, borderLeft:`3px solid ${c}`, padding:"10px 16px",
      fontSize:11, fontWeight:700, color:c, letterSpacing:"0.12em", textTransform:"uppercase",
      display:"flex", alignItems:"center", justifyContent:"space-between" }}>
      <span>{title}</span>{action}
    </div>
  );
};

const KPI = ({ label, value, color, icon, sub }) => {
  const C = useC();
  return (
    <div style={{ background:C.panel, border:`1px solid ${C.border}`, borderTop:`3px solid ${color}`, borderRadius:6, padding:"14px 16px" }}>
      <div style={{ fontSize:22, marginBottom:4 }}>{icon}</div>
      <div style={{ fontSize:28, fontWeight:800, color, lineHeight:1 }}>{value}</div>
      {sub && <div style={{ fontSize:10, color:C.muted, marginTop:3 }}>{sub}</div>}
      <div style={{ fontSize:10, color:C.muted, marginTop:6, letterSpacing:"0.1em", textTransform:"uppercase" }}>{label}</div>
    </div>
  );
};

const TH = ({ children }) => {
  const C = useC();
  return <th style={{ padding:"9px 14px", textAlign:"left", color:C.muted, fontWeight:700, letterSpacing:"0.07em", textTransform:"uppercase", fontSize:10, borderBottom:`1px solid ${C.border}`, whiteSpace:"nowrap", background:C.subheader }}>{children}</th>;
};

const TD = ({ children, style={} }) => {
  const C = useC();
  return <td style={{ padding:"8px 14px", color:C.text, whiteSpace:"nowrap", ...style }}>{children}</td>;
};

const Btn = ({ children, onClick, color, small=false, disabled=false, style={} }) => {
  const C = useC();
  const bg = color || ACCENT.teal;
  return (
    <button onClick={onClick} disabled={disabled} style={{
      background:disabled?C.border:bg, color:"#FFFFFF", border:"none", borderRadius:4,
      padding:small?"4px 11px":"8px 18px", cursor:disabled?"not-allowed":"pointer",
      fontFamily:"inherit", fontWeight:700, fontSize:small?10:12,
      opacity:disabled?0.5:1, transition:"all 0.15s", whiteSpace:"nowrap", ...style,
    }}>{children}</button>
  );
};

const Field = ({ label, value, onChange, type="text", placeholder="", required=false, hint, disabled=false }) => {
  const C = useC();
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
      <label style={{ fontSize:10, color:C.muted, fontWeight:700, letterSpacing:"0.1em", textTransform:"uppercase" }}>
        {label}{required&&<span style={{color:ACCENT.red}}> *</span>}
      </label>
      <input type={type} value={value} onChange={e=>onChange(e.target.value)}
        placeholder={placeholder} disabled={disabled}
        style={{ background:C.input, border:`1px solid ${C.border}`, borderRadius:4,
          padding:"8px 12px", color:disabled?C.muted:C.white, fontFamily:"inherit", fontSize:12,
          outline:"none", width:"100%", opacity:disabled?0.6:1 }}/>
      {hint&&<span style={{fontSize:10,color:C.muted}}>{hint}</span>}
    </div>
  );
};

const Toggle = ({ label, checked, onChange }) => {
  const C = useC();
  return (
    <div style={{ display:"flex", alignItems:"center", gap:10, cursor:"pointer" }} onClick={()=>onChange(!checked)}>
      <div style={{ width:36, height:20, borderRadius:10, background:checked?ACCENT.teal:C.border, position:"relative", transition:"background 0.2s", border:`1px solid ${C.border}` }}>
        <div style={{ width:14, height:14, borderRadius:"50%", background:"#FFFFFF", position:"absolute", top:2, left:checked?18:2, transition:"left 0.2s" }}/>
      </div>
      <span style={{ fontSize:12, color:C.text }}>{label}</span>
    </div>
  );
};

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
const DEVICE_TYPES = [
  { value:"server",       label:"Server",          icon:"🖥" },
  { value:"workstation",  label:"Workstation",     icon:"💻" },
  { value:"laptop",       label:"Laptop",          icon:"💻" },
  { value:"router",       label:"Router",          icon:"🔀" },
  { value:"switch",       label:"Switch",          icon:"🔌" },
  { value:"firewall",     label:"Firewall",        icon:"🛡" },
  { value:"gateway",      label:"Gateway",         icon:"🚪" },
  { value:"access_point", label:"Access Point",    icon:"📶" },
  { value:"antenna",      label:"Antenna",         icon:"📡" },
  { value:"camera",       label:"Security Camera", icon:"📷" },
  { value:"printer",      label:"Printer",         icon:"🖨" },
  { value:"nas",          label:"NAS / Storage",   icon:"💾" },
  { value:"sensor",       label:"Sensor",          icon:"🌡" },
  { value:"other",        label:"Other",           icon:"🔧" },
];

const deviceIcon  = t => DEVICE_TYPES.find(d=>d.value===t)?.icon  || "📡";
const deviceLabel = t => DEVICE_TYPES.find(d=>d.value===t)?.label || "Other";

const EMPTY_HOST = { name:"", ip:"", group:"", device_type:"other", enabled:true };

function HostModal({ host, groups, onClose, onSave }) {
  const C = useC();
  const editing = !!host;
  const [form, setForm] = useState(host ? {
    name:        host.name,
    ip:          host.ip,
    group:       host.group==="Ungrouped" ? "" : host.group,
    device_type: host.device_type || "other",
    enabled:     host.enabled,
  } : {...EMPTY_HOST});
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState(null);
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
        padding:28, width:480, maxWidth:"95vw" }}>
        <div style={{ fontSize:14, fontWeight:700, color:C.white, marginBottom:20,
          borderBottom:`1px solid ${C.border}`, paddingBottom:12 }}>
          {editing ? "✏ Edit Host" : "➕ Add Host"}
        </div>
        <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
          <Field label="Host Name" value={form.name} onChange={set("name")}
            placeholder="e.g. Web Server 01" required/>
          <Field label="IP Address" value={form.ip} onChange={set("ip")}
            placeholder="e.g. 192.168.1.10" required hint="IPv4 or IPv6 address"/>

          {/* Device type picker */}
          <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
            <label style={{ fontSize:10, color:C.muted, fontWeight:700,
              letterSpacing:"0.1em", textTransform:"uppercase" }}>Device Type</label>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:6 }}>
              {DEVICE_TYPES.map(dt => (
                <button key={dt.value} onClick={()=>set("device_type")(dt.value)} style={{
                  background: form.device_type===dt.value ? `${ACCENT.teal}33` : C.subheader,
                  border: `1px solid ${form.device_type===dt.value ? ACCENT.teal : C.border}`,
                  borderRadius:5, padding:"8px 4px", cursor:"pointer",
                  display:"flex", flexDirection:"column", alignItems:"center", gap:4,
                  transition:"all 0.15s",
                }}>
                  <span style={{ fontSize:18 }}>{dt.icon}</span>
                  <span style={{ fontSize:9, color:form.device_type===dt.value?ACCENT.teal:C.muted,
                    fontFamily:"inherit", fontWeight:700, letterSpacing:"0.05em" }}>
                    {dt.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
            <label style={{ fontSize:10, color:C.muted, fontWeight:700,
              letterSpacing:"0.1em", textTransform:"uppercase" }}>Group</label>
            <input value={form.group} onChange={e=>set("group")(e.target.value)}
              placeholder="e.g. Servers, Workstations, Network"
              list="group-list"
              style={{ background:C.subheader, border:`1px solid ${C.border}`, borderRadius:4,
                padding:"8px 12px", color:C.white, fontFamily:"inherit", fontSize:12, outline:"none" }}/>
            <datalist id="group-list">
              {groups.map(g=><option key={g} value={g}/>)}
            </datalist>
          </div>
          <Toggle label="Enabled — include this host in ping checks" checked={form.enabled} onChange={set("enabled")}/>
        </div>
        {error && <div style={{ background:`${ACCENT.red}18`, border:`1px solid ${C.red}44`,
          borderRadius:4, padding:"10px 14px", color:C.red, fontSize:11, marginTop:16 }}>{error}</div>}
        <div style={{ display:"flex", gap:10, justifyContent:"flex-end", marginTop:20 }}>
          <Btn onClick={onClose} color={C.border}>Cancel</Btn>
          <Btn onClick={handleSave} disabled={saving}>{saving?"Saving…":editing?"Save Changes":"Add Host"}</Btn>
        </div>
      </div>
    </div>
  );
}

// ── Settings Panel ───────────────────────────────────────────
function SettingsPanel({ onClose, onThemeChange, onNameChange, onBgChange }) {
  const C = useC();
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

        {/* Site Name */}
        <div style={{ marginBottom:24 }}>
          <div style={{ fontSize:11, color:C.teal, fontWeight:700, letterSpacing:"0.1em",
            textTransform:"uppercase", marginBottom:12 }}>Site Name</div>
          <Field label="Header Title" value={cfg.network_name||""}
            onChange={v => { set("network_name")(v); onNameChange(v); }} placeholder="Network Monitor"/>
          <div style={{ fontSize:10, color:C.muted, marginTop:8 }}>
            Displayed in the top-left header. Leave blank to use "Network Monitor".
          </div>
        </div>

        {/* Background Color */}
        <div style={{ marginBottom:24 }}>
          <div style={{ fontSize:11, color:ACCENT.teal, fontWeight:700, letterSpacing:"0.1em",
            textTransform:"uppercase", marginBottom:12 }}>Background Color</div>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <input type="color" value={cfg.bg_color||"#050D18"}
              onChange={e => { set("bg_color")(e.target.value); onBgChange(e.target.value); }}
              style={{ width:44, height:36, borderRadius:4, border:`1px solid ${C.border}`,
                background:"none", cursor:"pointer", padding:2 }}/>
            <Field label="Hex value" value={cfg.bg_color||""}
              onChange={v => { set("bg_color")(v); onBgChange(v); }} placeholder="#050D18"/>
            <button onClick={() => { set("bg_color")(""); onBgChange(""); }}
              style={{ background:"none", border:`1px solid ${C.border}`, borderRadius:4,
                color:C.muted, cursor:"pointer", padding:"6px 12px",
                fontSize:11, fontFamily:"inherit", whiteSpace:"nowrap" }}>Reset</button>
          </div>
          <div style={{ fontSize:10, color:C.muted, marginTop:8 }}>
            Overrides the theme background. Reset to restore theme default.
          </div>
        </div>
        <div style={{ marginBottom:24 }}>
          <div style={{ fontSize:11, color:ACCENT.teal, fontWeight:700, letterSpacing:"0.1em",
            textTransform:"uppercase", marginBottom:12 }}>Theme</div>
          <div style={{ display:"flex", gap:10 }}>
            {Object.entries(THEMES).map(([key, t]) => {
              const selected = (cfg.theme||"dark") === key;
              return (
                <button key={key} onClick={() => { set("theme")(key); onThemeChange(key); }} style={{
                  flex:1, padding:"12px 8px", borderRadius:6, cursor:"pointer",
                  border: selected ? `2px solid ${ACCENT.orange}` : `2px solid ${t.border}`,
                  background: t.dark, color: t.white,
                  fontFamily:"inherit", fontWeight:700, fontSize:11,
                  boxShadow: selected ? `0 0 10px ${ACCENT.orange}55` : "none",
                  transition:"all 0.2s",
                }}>
                  <div style={{ fontSize:20, marginBottom:6 }}>
                    {key==="dark"?"🌑":key==="blue"?"🌊":"☀️"}
                  </div>
                  <div style={{ letterSpacing:"0.1em", textTransform:"uppercase" }}>{t.name}</div>
                  <div style={{ display:"flex", gap:4, justifyContent:"center", marginTop:8 }}>
                    {[t.navy, t.panel, t.border].map((col,i) => (
                      <div key={i} style={{ width:12, height:12, borderRadius:"50%",
                        background:col, border:"1px solid #fff3" }}/>
                    ))}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Ping interval */}
        <div style={{ marginBottom:24 }}>
          <div style={{ fontSize:11, color:C.teal, fontWeight:700, letterSpacing:"0.1em",
            textTransform:"uppercase", marginBottom:12 }}>Ping Interval</div>
          <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
            {INTERVALS.map(iv=>(
              <button key={iv.value} onClick={()=>set("ping_interval")(iv.value)} style={{
                background:cfg.ping_interval===iv.value?C.teal:C.border,
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
                        background:(cfg.reminder_interval??1800)===iv.v?C.orange:C.border,
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
            <Btn onClick={onClose} color={C.border}>Close</Btn>
            <Btn onClick={handleSave} disabled={saving}>{saving?"Saving…":"Save Settings"}</Btn>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Connectivity bar (last N pings) ──────────────────────────
function ConnBar({ hostId }) {
  const C = useC();
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
  const C = useC();
  const down = hosts.filter(h => h.status === "offline" && h.enabled !== false);
  if (!down.length) return null;
  const acked   = down.filter(h => h.acknowledged);
  const unacked = down.filter(h => !h.acknowledged);
  return (
    <div style={{ background:`${ACCENT.red}18`, border:`1px solid ${C.red}55`,
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
              background:`${ACCENT.red}22`, border:`1px solid ${C.red}44`, borderRadius:5,
              overflow:"hidden" }}>
              <span style={{ padding:"5px 12px", fontSize:11, fontWeight:600, color:C.red }}>
                {h.name} — {h.ip}
              </span>
              <button onClick={() => onAck(h)} style={{
                background:`${ACCENT.red}28`, border:"none", borderLeft:`1px solid ${C.red}44`,
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
              background:`${ACCENT.orange}15`, border:`1px solid ${C.orange}33`, borderRadius:5,
              overflow:"hidden", opacity:0.75 }}>
              <span style={{ padding:"5px 8px", fontSize:10, color:C.orange }}>✓</span>
              <span style={{ padding:"5px 10px 5px 0", fontSize:11, fontWeight:600, color:C.muted }}>
                {h.name} — {h.ip}
              </span>
              <button onClick={() => onUnack(h)} style={{
                background:`${ACCENT.orange}22`, border:"none", borderLeft:`1px solid ${C.orange}33`,
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

// ── Icon Grid (draggable host tiles) ─────────────────────────
function HostTile({ host, onEdit, onDelete, onPing, pinging, acking, onAck, onUnack, isDragOver, onDragStart, onDragOver, onDrop, onDragEnd }) {
  const C = useC();
  const s = host.status;
  const glowColor = s==="online" ? C.green : s==="offline" ? C.red : C.muted;
  const borderColor = s==="online" ? `${C.green}66` : s==="offline" ? `${C.red}88` : `${C.border}`;
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragOver={e => { e.preventDefault(); onDragOver(); }}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      style={{
        background: isDragOver ? "#1A2A3A" : C.panel,
        border: `2px solid ${isDragOver ? C.teal : borderColor}`,
        borderRadius: 10,
        padding: "16px 12px 12px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 8,
        cursor: "grab",
        transition: "all 0.15s",
        opacity: host.enabled === false ? 0.45 : 1,
        position: "relative",
        minWidth: 110,
        boxShadow: s==="offline" ? `0 0 12px ${C.red}33` : s==="online" ? `0 0 8px ${C.green}22` : "none",
        userSelect: "none",
      }}
    >
      {/* Status dot */}
      <div style={{
        position: "absolute", top: 8, right: 8,
        width: 8, height: 8, borderRadius: "50%",
        background: glowColor,
        boxShadow: `0 0 6px ${glowColor}`,
        animation: s==="offline" ? "pulse 1.5s ease-in-out infinite" : "none",
      }}/>

      {/* Drag handle hint */}
      <div style={{ position:"absolute", top:8, left:8, color:C.border, fontSize:9, lineHeight:1 }}>⠿</div>

      {/* Icon */}
      <div style={{ fontSize: 32, lineHeight: 1, filter: host.enabled===false ? "grayscale(1)" : "none" }}>
        {deviceIcon(host.device_type)}
      </div>

      {/* Name */}
      <div style={{ fontSize: 11, fontWeight: 700, color: C.white, textAlign: "center",
        maxWidth: 100, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
        title={host.name}>
        {host.name}
      </div>

      {/* IP */}
      <div style={{ fontSize: 9, color: C.teal, fontFamily: "monospace" }}>{host.ip}</div>

      {/* Status badge */}
      <div style={{ fontSize: 9, fontWeight: 700, color: glowColor,
        background: s==="online"?`${C.green}18`:s==="offline"?`${C.red}18`:`${C.muted}18`,
        border: `1px solid ${glowColor}44`, borderRadius: 3, padding: "2px 7px",
        display:"flex", alignItems:"center", gap:4 }}>
        <span style={{ width:6, height:6, borderRadius:"50%", background:glowColor,
          boxShadow:`0 0 4px ${glowColor}`, display:"inline-block", flexShrink:0 }}/>
        {s==="online" ? "Online" : s==="offline" ? "Offline" : "Unknown"}
        {host.acknowledged && <span style={{ color: C.orange, marginLeft: 2 }}>✓</span>}
      </div>

      {/* Action buttons */}
      <div style={{ display: "flex", gap: 4, marginTop: 2 }}>
        <button onClick={() => onPing(host)} disabled={pinging[host.id]}
          title="Ping now"
          style={{ background:C.subheader, border:`1px solid ${C.border}`, borderRadius:3,
            color: C.teal, cursor:"pointer", fontSize:9, padding:"2px 7px",
            fontFamily:"inherit", fontWeight:700, opacity: pinging[host.id]?0.5:1 }}>
          {pinging[host.id] ? "…" : "Ping"}
        </button>
        {host.status==="offline" && !host.acknowledged && (
          <button onClick={() => onAck(host)} disabled={acking[host.id]}
            title="Acknowledge"
            style={{ background:"#1A0A00", border:`1px solid ${C.orange}44`, borderRadius:3,
              color: C.orange, cursor:"pointer", fontSize:9, padding:"2px 7px",
              fontFamily:"inherit", fontWeight:700 }}>
            {acking[host.id]?"…":"✓"}
          </button>
        )}
        {host.status==="offline" && host.acknowledged && (
          <button onClick={() => onUnack(host)} disabled={acking[host.id]}
            title="Unacknowledge"
            style={{ background:`${ACCENT.orange}15`, border:`1px solid ${C.muted}33`, borderRadius:3,
              color: C.muted, cursor:"pointer", fontSize:9, padding:"2px 7px",
              fontFamily:"inherit", fontWeight:700 }}>
            {acking[host.id]?"…":"✕"}
          </button>
        )}
        <button onClick={() => onEdit(host)}
          title="Edit"
          style={{ background:C.subheader, border:`1px solid ${C.border}`, borderRadius:3,
            color: C.blue, cursor:"pointer", fontSize:9, padding:"2px 7px",
            fontFamily:"inherit", fontWeight:700 }}>
          ✏
        </button>
        <button onClick={() => onDelete(host)}
          title="Delete"
          style={{ background:C.subheader, border:`1px solid ${C.border}`, borderRadius:3,
            color: C.red, cursor:"pointer", fontSize:9, padding:"2px 7px",
            fontFamily:"inherit", fontWeight:700 }}>
          ✕
        </button>
      </div>
    </div>
  );
}

function IconGrid({ hosts, grouped, groupOrder, onEdit, onDelete, onPing, pinging, acking, onAck, onUnack, onReorder, onDeleteGroup, onMoveGroup }) {
  const C = useC();
  const [dragId,      setDragId]      = useState(null);
  const [overId,      setOverId]      = useState(null);
  const [overGroup,   setOverGroup]   = useState(null);

  const dragHost = hosts.find(h => h.id === dragId);

  const handleDrop = async (targetHost) => {
    if (!dragId || dragId === targetHost.id || !dragHost) return;

    const sameGroup = dragHost.group === targetHost.group;

    if (sameGroup) {
      const group = grouped[dragHost.group];
      const fromIdx = group.findIndex(h => h.id === dragId);
      const toIdx   = group.findIndex(h => h.id === targetHost.id);
      const reordered = [...group];
      reordered.splice(fromIdx, 1);
      reordered.splice(toIdx, 0, dragHost);
      const updates = reordered.map((h, i) => ({ id: h.id, sort_order: i }));
      onReorder(updates);
    } else {
      const targetGroup = grouped[targetHost.group] || [];
      const toIdx = targetGroup.findIndex(h => h.id === targetHost.id);
      const newGroup = [...targetGroup];
      newGroup.splice(toIdx, 0, dragHost);
      const updates = newGroup.map((h, i) => ({
        id: h.id,
        sort_order: i,
        group: targetHost.group,
      }));
      onReorder(updates, dragId, targetHost.group);
    }

    setDragId(null);
    setOverId(null);
    setOverGroup(null);
  };

  const handleDropOnGroup = async (groupName) => {
    if (!dragId || !dragHost || dragHost.group === groupName) return;
    const targetGroup = grouped[groupName] || [];
    const updates = [{ id: dragId, sort_order: targetGroup.length, group: groupName }];
    onReorder(updates, dragId, groupName);
    setDragId(null);
    setOverId(null);
    setOverGroup(null);
  };

  // Use passed groupOrder, fall back to Object.keys
  const orderedGroups = groupOrder && groupOrder.length > 0
    ? groupOrder.filter(g => g in grouped)
    : Object.keys(grouped);

  const btnStyle = (disabled) => ({
    background:"none", border:`1px solid ${C.border}`, borderRadius:3,
    color: disabled ? C.border : C.muted, cursor: disabled ? "default" : "pointer",
    fontSize:10, padding:"1px 6px", fontFamily:"inherit", lineHeight:1.4,
    opacity: disabled ? 0.3 : 1, transition:"all 0.15s",
  });

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:24 }}>
      {orderedGroups.map((group, idx) => {
        const ghosts = grouped[group] || [];
        const anyOff = ghosts.some(h=>h.status==="offline"&&h.enabled!==false);
        const allOn  = ghosts.every(h=>h.status==="online"||h.enabled===false);
        const groupColor = anyOff ? C.red : allOn ? C.green : C.muted;
        const isGroupOver = overGroup === group && dragHost?.group !== group;
        const isFirst = idx === 0;
        const isLast  = idx === orderedGroups.length - 1;
        return (
          <div key={group}
            onDragOver={e => { e.preventDefault(); setOverGroup(group); }}
            onDrop={() => handleDropOnGroup(group)}
            style={{
              background: isGroupOver ? "#0A1A2A" : "transparent",
              border: isGroupOver ? `2px dashed ${C.teal}` : "2px solid transparent",
              borderRadius: 8, padding: isGroupOver ? 10 : 0,
              transition: "all 0.15s",
            }}>
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:12 }}>
              {/* Up / Down buttons */}
              <div style={{ display:"flex", flexDirection:"column", gap:2 }}>
                <button onClick={() => onMoveGroup(group, -1)} disabled={isFirst}
                  title="Move group up" style={btnStyle(isFirst)}>▲</button>
                <button onClick={() => onMoveGroup(group, +1)} disabled={isLast}
                  title="Move group down" style={btnStyle(isLast)}>▼</button>
              </div>
              <div style={{ width:3, height:18, background:groupColor, borderRadius:2 }}/>
              <span style={{ fontSize:11, fontWeight:700, color:groupColor,
                letterSpacing:"0.1em", textTransform:"uppercase" }}>{group}</span>
              <span style={{ fontSize:10, color:C.muted }}>
                — {ghosts.filter(h=>h.status==="online").length}/{ghosts.length} online
              </span>
              <button onClick={() => onDeleteGroup(group)} title="Delete group"
                style={{ marginLeft:"auto", background:"none", border:`1px solid ${C.red}44`,
                  borderRadius:3, color:C.red, cursor:"pointer", fontSize:10,
                  padding:"2px 8px", fontFamily:"inherit", opacity:0.7 }}>
                🗑 Delete Group
              </button>
            </div>
            <div style={{ display:"flex", flexWrap:"wrap", gap:12, minHeight:60 }}>
              {ghosts.length === 0 && (
                <div style={{ color:C.muted, fontSize:11, fontStyle:"italic",
                  display:"flex", alignItems:"center", padding:"8px 4px" }}>
                  Empty — drag hosts here
                </div>
              )}
              {ghosts.map(host => (
                <HostTile
                  key={host.id}
                  host={host}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onPing={onPing}
                  pinging={pinging}
                  acking={acking}
                  onAck={onAck}
                  onUnack={onUnack}
                  isDragOver={overId === host.id}
                  onDragStart={() => { setDragId(host.id); setOverGroup(null); }}
                  onDragOver={() => { setOverId(host.id); setOverGroup(group); }}
                  onDrop={() => handleDrop(host)}
                  onDragEnd={() => { setDragId(null); setOverId(null); setOverGroup(null); }}
                />
              ))}
            </div>
          </div>
        );
      })}
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
  const [groupList,  setGroupList] = useState([]); // persisted group names including empty ones
  const [siteName,   setSiteName]  = useState("");
  const [bgColor,    setBgColor]   = useState("");
  const bgColorRef = useRef(""); // tracks last user-set value so fetchAll won't overwrite it
  const [theme,      setThemeState] = useState("dark");
  const intervalRef = useRef(null);

  const safeFetch = async (url) => {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();
    try { return JSON.parse(text); } catch { throw new Error(`Bad JSON from ${url}`); }
  };

  const fetchHostsAndSummary = useCallback(async () => {
    try {
      const [hosts, summary] = await Promise.all([
        safeFetch(`${API}/api/hosts`),
        safeFetch(`${API}/api/summary`),
      ]);
      setHosts(hosts);
      setSummary(summary);
    } catch(e) { console.warn("Poll error:", e.message); }
  },[]);

  const fetchAll = useCallback(async () => {
    try {
      const [hosts, summary, cfg] = await Promise.all([
        safeFetch(`${API}/api/hosts`),
        safeFetch(`${API}/api/summary`),
        safeFetch(`${API}/api/config`),
      ]);
      setHosts(hosts);
      setSummary(summary);
      setSiteName(cfg.network_name || "");
      if (cfg.theme) setThemeState(cfg.theme);
      if (cfg.bg_color && !bgColorRef.current) {
        bgColorRef.current = cfg.bg_color;
        setBgColor(cfg.bg_color);
      }
    } catch(e) { console.warn("fetchAll error:", e.message); }
    setLoading(false);
  },[]);

  useEffect(()=>{
    fetchAll(); // full load including config on startup
    intervalRef.current = setInterval(fetchHostsAndSummary, 10000); // poll only hosts/summary
    return ()=>clearInterval(intervalRef.current);
  },[fetchAll, fetchHostsAndSummary]);

  const handleReorder = async (updates, movedId = null, newGroup = null) => {
    // Optimistically update local state
    setHosts(prev => prev.map(h => {
      if (movedId && h.id === movedId && newGroup) {
        return { ...h, group: newGroup };
      }
      const u = updates.find(x => x.id === h.id);
      if (u) return { ...h, sort_order: u.sort_order ?? h.sort_order };
      return h;
    }));
    // Always persist group change via PUT first
    if (movedId && newGroup) {
      await fetch(`${API}/api/hosts/${movedId}`, {
        method: "PUT",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({ group: newGroup }),
      });
    }
    // Then persist sort order
    await fetch(`${API}/api/hosts/reorder`, {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify(updates),
    });
    // Refresh to confirm persisted state
    fetchAll();
  };

  const handleDeleteGroup = (groupName) => {
    if (!window.confirm(`Delete group "${groupName}"? This cannot be undone.`)) return;
    setGroupList(prev => prev.filter(g => g !== groupName));
  };

  const handleMoveGroup = (groupName, direction) => {
    setGroupList(prev => {
      const idx = prev.indexOf(groupName);
      if (idx < 0) return prev;
      const newIdx = idx + direction;
      if (newIdx < 0 || newIdx >= prev.length) return prev;
      const next = [...prev];
      next.splice(idx, 1);
      next.splice(newIdx, 0, groupName);
      return next;
    });
  };

  const handleAddGroup = (groupName) => {
    if (!groupName.trim()) return;
    setGroupList(prev => prev.includes(groupName) ? prev : [...prev, groupName]);
  };

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
    // Optimistically update local host state instead of full re-fetch
    setHosts(prev => prev.map(x => x.id === h.id ? {...x, acknowledged: true} : x));
    setAcking(a => ({...a, [h.id]: false}));
  };

  const handleUnack = async (h) => {
    setAcking(a => ({...a, [h.id]: true}));
    await fetch(`${API}/api/hosts/${h.id}/unacknowledge`, {method:"POST"});
    setHosts(prev => prev.map(x => x.id === h.id ? {...x, acknowledged: false} : x));
    setAcking(a => ({...a, [h.id]: false}));
  };

  const groups = [...new Set([
    ...groupList,
    ...hosts.map(h=>h.group||"Ungrouped")
  ])]; // preserve groupList order — do NOT sort
  const groupNames = groups.filter(g=>g!=="Ungrouped");

  // Sync groupList whenever hosts change — add any new groups from hosts
  useEffect(() => {
    const hostGroups = [...new Set(hosts.map(h => h.group||"Ungrouped"))];
    setGroupList(prev => {
      const merged = [...new Set([...prev, ...hostGroups])];
      return merged;
    });
  }, [hosts]);

  // Group hosts for display
  const grouped = {};
  groups.forEach(g => { grouped[g] = []; }); // include empty groups
  hosts.forEach(h=>{
    const g = h.group||"Ungrouped";
    if (!grouped[g]) grouped[g]=[];
    grouped[g].push(h);
  });

  const offlineCount = hosts.filter(h=>h.status==="offline"&&h.enabled!==false).length;

  const themeValue = { ...(THEMES[theme] || THEMES.dark), ...ACCENT };

  return (
  <ThemeCtx.Provider value={themeValue}>
    <div style={{ fontFamily:"'IBM Plex Mono',monospace", background: bgColor || themeValue.dark,
      minHeight:"100vh", color:themeValue.bodyText, transition:"background 0.3s, color 0.3s" }}>
      <style>{`
        *{box-sizing:border-box;margin:0;padding:0}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}
        @keyframes fadeIn{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:none}}
        ::-webkit-scrollbar{width:5px;height:5px}
        ::-webkit-scrollbar-track{background:#050D18}
        ::-webkit-scrollbar-thumb{background:#1A3A5C;border-radius:3px}
      `}</style>

      {/* Modals */}
      {(showAdd||editHost) && (
        <HostModal host={editHost} groups={groupNames}
          onClose={()=>{setShowAdd(false);setEditHost(null);}}
          onSave={()=>{setShowAdd(false);setEditHost(null);fetchAll();}}/>
      )}
      {showSettings && <SettingsPanel
        onClose={()=>{setShowSettings(false);fetchHostsAndSummary();}}
        onThemeChange={t => setThemeState(t)}
        onNameChange={n => setSiteName(n)}
        onBgChange={c => { bgColorRef.current = c; setBgColor(c); }}
      />}

      {/* Header */}
      <div style={{
        background: themeValue.navy,
        borderBottom:`3px solid ${hosts.some(h=>h.status==="offline"&&h.enabled!==false) ? ACCENT.red : ACCENT.green}`,
        padding:"0 16px", display:"flex", alignItems:"center", height:54, gap:10,
        transition:"border-color 0.4s, background 0.4s", overflow:"hidden",
      }}>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          {/* Status light — green = all good, red = host(s) down */}
          <div
            title={hosts.some(h=>h.status==="offline"&&h.enabled!==false)
              ? `${hosts.filter(h=>h.status==="offline"&&h.enabled!==false).length} host(s) down`
              : "All systems online"}
            style={{
              width:36, height:36, borderRadius:"50%",
              background: hosts.some(h=>h.status==="offline"&&h.enabled!==false)
                ? `radial-gradient(circle at 35% 35%, ${themeValue.red}88, ${themeValue.red}22)`
                : `radial-gradient(circle at 35% 35%, ${themeValue.green}88, ${themeValue.green}22)`,
              border:`2px solid ${hosts.some(h=>h.status==="offline"&&h.enabled!==false) ? themeValue.red : themeValue.green}`,
              boxShadow: hosts.some(h=>h.status==="offline"&&h.enabled!==false)
                ? `0 0 14px ${themeValue.red}99, 0 0 4px ${themeValue.red}`
                : `0 0 14px ${themeValue.green}99, 0 0 4px ${themeValue.green}`,
              animation: hosts.some(h=>h.status==="offline"&&h.enabled!==false)
                ? "pulse 1.5s ease-in-out infinite" : "none",
              display:"flex", alignItems:"center", justifyContent:"center",
              fontSize:18, transition:"all 0.4s",
            }}
          >🌐</div>
          <div style={{ color:themeValue.white, fontWeight:700, fontSize:12,
            letterSpacing:"0.2em", textTransform:"uppercase" }}>
            {siteName || "Network Monitor"}
          </div>
        </div>
        {/* Live pulse indicator */}
        <div style={{ display:"flex", alignItems:"center", gap:6, flexShrink:0,
          background:"#050D1888", border:`1px solid ${themeValue.teal}55`,
          borderRadius:20, padding:"3px 12px" }}>
          <div style={{ width:6, height:6, borderRadius:"50%", background:ACCENT.green,
            animation:"pulse 2s ease-in-out infinite",
            boxShadow:`0 0 6px ${ACCENT.green}` }}/>
          <span style={{ fontSize:10, color:ACCENT.green, fontWeight:700,
            letterSpacing:"0.08em" }}>LIVE</span>
        </div>
        <div style={{ marginLeft:"auto", display:"flex", gap:8, flexShrink:0 }}>
          <Btn onClick={()=>setShowSettings(true)} color={themeValue.panel}
            style={{ border:`1px solid ${themeValue.border}` }} small>⚙ Settings</Btn>
          <Btn onClick={()=>{setEditHost(null);setShowAdd(true);}}
            color={ACCENT.orange} small>➕ Add Host</Btn>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ background:themeValue.tabBar, borderBottom:`1px solid ${themeValue.border}`,
        display:"flex", padding:"0 28px", gap:2 }}>
        {TABS.map((t,i)=>(
          <button key={t} onClick={()=>setTab(i)} style={{
            background:"transparent", color:tab===i?themeValue.white:themeValue.muted,
            border:"none", borderBottom:tab===i?`2px solid ${themeValue.orange}`:"2px solid transparent",
            padding:"10px 20px", cursor:"pointer", fontSize:11, fontWeight:700,
            fontFamily:"inherit", letterSpacing:"0.08em", textTransform:"uppercase",
          }}>
            {t}
            {t==="Hosts" && offlineCount>0 &&
              <span style={{ marginLeft:6, background:themeValue.orange, color:themeValue.white,
                borderRadius:10, padding:"1px 6px", fontSize:9 }}>{offlineCount}</span>}
          </button>
        ))}
      </div>

      <div style={{ padding:"24px 28px" }}>
        {loading && (
          <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"50vh", flexDirection:"column", gap:14 }}>
            <div style={{ width:36, height:36, border:`3px solid ${themeValue.border}`, borderTop:`3px solid ${themeValue.teal}`, borderRadius:"50%", animation:"spin 1s linear infinite" }}/>
            <div style={{ color:themeValue.muted, fontSize:12 }}>Connecting to backend…</div>
          </div>
        )}

        {!loading && <>
          <DownBanner hosts={hosts} onAck={handleAck} onUnack={handleUnack}/>

          {/* ════ DASHBOARD ════ */}
          {tab===0 && <>
            {/* KPIs */}
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))", gap:14, marginBottom:24 }}>
              <KPI label="Total Hosts"  value={summary?.total||0}   color={themeValue.teal}   icon="🖥" sub={`${groups.length} group${groups.length!==1?"s":""}`}/>
              <KPI label="Online"       value={summary?.online||0}  color={themeValue.green}  icon="🟢" sub="responding"/>
              <KPI label="Offline"      value={summary?.offline||0} color={themeValue.red}    icon="🔴" sub="not responding"/>
              <KPI label="Unknown"      value={summary?.unknown||0} color={themeValue.muted}  icon="⚪" sub="not yet checked"/>
            </div>

            {/* Group cards */}
            {Object.entries(summary?.groups||{}).length > 0 && (
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))", gap:14, marginBottom:24 }}>
                {Object.entries(summary?.groups||{}).map(([g,s])=>{
                  const allOn = s.offline===0&&s.unknown===0;
                  const anyOff = s.offline>0;
                  const border = anyOff?themeValue.red:allOn?themeValue.green:themeValue.muted;
                  return (
                    <div key={g} style={{ background:themeValue.panel, border:`1px solid ${border}44`,
                      borderTop:`3px solid ${border}`, borderRadius:6, padding:"14px 16px" }}>
                      <div style={{ fontSize:11, fontWeight:700, color:themeValue.text,
                        letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:10 }}>{g}</div>
                      <div style={{ display:"flex", gap:10 }}>
                        <div style={{ textAlign:"center" }}>
                          <div style={{ fontSize:22, fontWeight:800, color:themeValue.green }}>{s.online}</div>
                          <div style={{ fontSize:9, color:themeValue.muted }}>ONLINE</div>
                        </div>
                        <div style={{ textAlign:"center" }}>
                          <div style={{ fontSize:22, fontWeight:800, color:s.offline>0?themeValue.red:themeValue.border }}>{s.offline}</div>
                          <div style={{ fontSize:9, color:themeValue.muted }}>OFFLINE</div>
                        </div>
                        <div style={{ textAlign:"center" }}>
                          <div style={{ fontSize:22, fontWeight:800, color:themeValue.muted }}>{s.total}</div>
                          <div style={{ fontSize:9, color:themeValue.muted }}>TOTAL</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Icon grid */}
            <Panel>
              <SH title="All Hosts" action={
                <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                  <Btn small onClick={fetchAll}>↻ Refresh</Btn>
                  <Btn small color={themeValue.blue} onClick={() => {
                    const name = window.prompt("New group name:");
                    if (name?.trim()) handleAddGroup(name.trim());
                  }}>＋ Group</Btn>
                </div>
              }/>
              {hosts.length===0?(
                <div style={{ padding:40, textAlign:"center", color:themeValue.muted }}>
                  <div style={{ fontSize:36, marginBottom:12 }}>🖥</div>
                  <div style={{ fontSize:13, color:themeValue.text, marginBottom:8 }}>No hosts added yet</div>
                  <Btn onClick={()=>setShowAdd(true)}>➕ Add First Host</Btn>
                </div>
              ):(
                <div style={{ padding:20 }}>
                  <div style={{ fontSize:10, color:themeValue.muted, marginBottom:16 }}>
                    Drag tiles to reorder or move between groups.
                  </div>
                  <IconGrid
                    hosts={hosts}
                    grouped={grouped}
                    groupOrder={groupList}
                    onEdit={setEditHost}
                    onDelete={handleDelete}
                    onPing={handleManualPing}
                    pinging={pinging}
                    acking={acking}
                    onAck={handleAck}
                    onUnack={handleUnack}
                    onReorder={handleReorder}
                    onDeleteGroup={handleDeleteGroup}
                    onMoveGroup={handleMoveGroup}
                  />
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
                  <div style={{ padding:48, textAlign:"center", color:themeValue.muted }}>
                    <div style={{ fontSize:40, marginBottom:12 }}>🖥</div>
                    <div style={{ fontSize:14, color:themeValue.text, marginBottom:8 }}>No hosts configured</div>
                    <div style={{ fontSize:12, marginBottom:20 }}>Add a host to start monitoring.</div>
                    <Btn onClick={()=>setShowAdd(true)}>➕ Add First Host</Btn>
                  </div>
                </Panel>
              ) : (
                Object.entries(grouped).sort(([a],[b])=>a.localeCompare(b)).map(([group, ghosts])=>(
                  <Panel key={group}>
                    <SH title={`${group} — ${ghosts.length} host${ghosts.length!==1?"s":""}`}
                      color={ghosts.some(h=>h.status==="offline")?themeValue.red:themeValue.teal}/>
                    <div style={{ overflowX:"auto" }}>
                      <table style={{ width:"100%", borderCollapse:"collapse", fontSize:11 }}>
                        <thead><tr>
                          {["","Host Name","IP Address","Type","Status","Last Seen","Last Check","Connectivity (last 24)","Actions"].map(h=><TH key={h}>{h}</TH>)}
                        </tr></thead>
                        <tbody>
                          {ghosts.map((h,i)=>(
                            <tr key={h.id} style={{ borderBottom:`1px solid ${themeValue.border}`,
                              background:i%2===0?themeValue.panel:"#12192A",
                              opacity:h.enabled===false?0.45:1,
                              animation:"fadeIn 0.2s ease" }}>
                              <TD style={{ fontSize:16, paddingRight:4 }} title={deviceLabel(h.device_type)}>{deviceIcon(h.device_type)}</TD>
                              <TD style={{ color:themeValue.white, fontWeight:700 }}>
                                {h.name}
                                {h.enabled===false&&<span style={{color:themeValue.muted,fontSize:9,marginLeft:6}}>(disabled)</span>}
                              </TD>
                              <TD style={{ color:themeValue.teal, fontFamily:"monospace" }}>{h.ip}</TD>
                              <TD style={{ color:themeValue.muted }}>{deviceLabel(h.device_type||"other")}</TD>
                              <td style={{ padding:"8px 14px" }}><StatusBadge s={h.status} acked={h.acknowledged}/></td>
                              <td style={{ padding:"8px 14px" }}>
                                <span style={{ color:themeValue.text }} title={fmtDate(h.last_seen)}>
                                  {relTime(h.last_seen)}
                                </span>
                              </td>
                              <td style={{ padding:"8px 14px" }}>
                                <span style={{ color:themeValue.muted, fontSize:10 }} title={fmtDate(h.last_check)}>
                                  {relTime(h.last_check)}
                                </span>
                              </td>
                              <td style={{ padding:"8px 14px" }}><ConnBar hostId={h.id}/></td>
                              <td style={{ padding:"8px 14px" }}>
                                <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                                  <Btn small color={themeValue.teal}
                                    disabled={pinging[h.id]}
                                    onClick={()=>handleManualPing(h)}>
                                    {pinging[h.id]?"…":"Ping"}
                                  </Btn>
                                  {h.status==="offline" && !h.acknowledged && (
                                    <Btn small color={themeValue.orange}
                                      disabled={acking[h.id]}
                                      onClick={()=>handleAck(h)}
                                      style={{ border:`1px solid ${themeValue.orange}` }}>
                                      {acking[h.id]?"…":"✓ Ack"}
                                    </Btn>
                                  )}
                                  {h.status==="offline" && h.acknowledged && (
                                    <Btn small color={C.border}
                                      disabled={acking[h.id]}
                                      onClick={()=>handleUnack(h)}
                                      style={{ border:`1px solid #475569` }}>
                                      {acking[h.id]?"…":"✕ Unack"}
                                    </Btn>
                                  )}
                                  <Btn small color={themeValue.blue} onClick={()=>setEditHost(h)}>Edit</Btn>
                                  <Btn small color={themeValue.red} onClick={()=>handleDelete(h)}>Delete</Btn>
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
                  <div style={{ color:themeValue.text, fontSize:12, lineHeight:1.8 }}>
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
  </ThemeCtx.Provider>
  );
}

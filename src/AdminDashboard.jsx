import { useState, useEffect, useCallback } from "react";

const API = "https://eastlakemail.com/wp-json/eastlake/v1";

// Returns real name; falls back to email if display_name was set to email by WP default
const clientName = (c) => {
  if (!c) return '';
  if (c.display_name && !c.display_name.includes('@')) return c.display_name;
  if (c.first_name || c.last_name) return `${c.first_name||''} ${c.last_name||''}`.trim();
  return c.user_email || c.display_name || '';
};

// ─── Auth ────────────────────────────────────────────────────────────────────
function useAuth() {
const [token, setToken] = useState(() => localStorage.getItem("em_token"));
const [user, setUser] = useState(null);
const [loading, setLoading] = useState(true);

const login = async (username, password) => {
const res = await fetch("https://eastlakemail.com/wp-json/jwt-auth/v1/token", {
method: "POST",
headers: { "Content-Type": "application/json" },
body: JSON.stringify({ username, password }),
});
const data = await res.json();
if (data.token) {
localStorage.setItem("em_token", data.token);
setToken(data.token);
return true;
}
return false;
};

const logout = () => {
localStorage.removeItem("em_token");
setToken(null);
setUser(null);
};

const apiFetch = useCallback(async (path, options = {}) => {
const res = await fetch(API + path, {
...options,
headers: {
"Content-Type": "application/json",
Authorization: `Bearer ${token}`,
...(options.headers || {}),
},
});
if (!res.ok) throw new Error(await res.text());
return res.json();
}, [token]);

useEffect(() => {
if (!token) { setLoading(false); return; }
apiFetch("/auth/me").then(d => {
if (d.is_admin) setUser(d);
else { logout(); }
}).catch(logout).finally(() => setLoading(false));
}, [token]);

return { token, user, login, logout, apiFetch, loading };
}

// ─── Login Screen ────────────────────────────────────────────────────────────
function LoginScreen({ onLogin }) {
const [u, setU] = useState(""); const [p, setP] = useState("");
const [err, setErr] = useState(""); const [busy, setBusy] = useState(false);
const submit = async () => {
setBusy(true); setErr("");
const ok = await onLogin(u, p);
if (!ok) { setErr("Invalid credentials or not an admin"); setBusy(false); }
};
return (
<div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"#f0f4f8"}}>
<div style={{background:"#fff",borderRadius:12,padding:40,width:380,boxShadow:"0 4px 24px rgba(0,0,0,0.1)"}}>
<img src="https://eastlakemail.com/wp-content/uploads/Eastlake-MailboxCoworking-LO-FF-1.jpg" alt="logo" style={{width:"100%",marginBottom:24,borderRadius:8}}/>
<h2 style={{margin:"0 0 24px",fontSize:20,color:"#1a202c"}}>Admin Dashboard</h2>
<input value={u} onChange={e=>setU(e.target.value)} placeholder="Username" style={inputStyle} onKeyDown={e=>e.key==="Enter"&&submit()}/>
<input value={p} onChange={e=>setP(e.target.value)} placeholder="Password" type="password" style={{...inputStyle,marginTop:12}} onKeyDown={e=>e.key==="Enter"&&submit()}/>
{err && <p style={{color:"#e53e3e",fontSize:13,marginTop:8}}>{err}</p>}
<button onClick={submit} disabled={busy} style={btnStyle}>{busy?"Logging in...":"Login"}</button>
</div>
</div>
);
}

// ─── Sidebar ─────────────────────────────────────────────────────────────────
const TABS = [
{id:"dashboard", label:"📊 Dashboard"},
{id:"mail", label:"📬 Mail Items"},
{id:"requests", label:"📋 Requests"},
{id:"clients", label:"👥 Clients"},
{id:"messages", label:"💬 Messages"},
];

function Sidebar({ active, onChange, stats, onLogout }) {
return (
<div style={{width:220,background:"#1a202c",minHeight:"100vh",display:"flex",flexDirection:"column",flexShrink:0}}>
<div style={{padding:"20px 16px",borderBottom:"1px solid #2d3748"}}>
<div style={{color:"#fff",fontWeight:700,fontSize:15}}>Eastlake Mailbox</div>
<div style={{color:"#718096",fontSize:12,marginTop:2}}>Admin Dashboard</div>
</div>
<nav style={{flex:1,padding:"12px 0"}}>
{TABS.map(t => (
<button key={t.id} onClick={()=>onChange(t.id)} style={{
display:"block",width:"100%",textAlign:"left",padding:"10px 20px",
background:active===t.id?"#2d3748":"transparent",color:active===t.id?"#fff":"#a0aec0",
border:"none",cursor:"pointer",fontSize:14,position:"relative"
}}>
{t.label}
{t.id==="requests" && stats?.pending_requests>0 && <Badge n={stats.pending_requests}/>}
{t.id==="messages" && stats?.unread_messages>0 && <Badge n={stats.unread_messages}/>}
{t.id==="clients" && stats?.pending_mailbox>0 && <Badge n={stats.pending_mailbox}/>}
</button>
))}
</nav>
<div style={{padding:16}}>
<button onClick={onLogout} style={{width:"100%",padding:"8px",background:"#e53e3e",color:"#fff",border:"none",borderRadius:6,cursor:"pointer",fontSize:13}}>Logout</button>
</div>
</div>
);
}
const Badge = ({n}) => <span style={{position:"absolute",right:16,top:"50%",transform:"translateY(-50%)",background:"#e53e3e",color:"#fff",borderRadius:10,fontSize:11,padding:"1px 6px"}}>{n}</span>;

// ─── Dashboard Stats ──────────────────────────────────────────────────────────
function DashboardTab({ apiFetch }) {
const [stats, setStats] = useState(null);
useEffect(() => { apiFetch("/admin/stats").then(setStats).catch(()=>{}); }, []);
if (!stats) return <Loading/>;
const cards = [
{label:"Total Clients", value:stats.total_clients, color:"#4299e1"},
{label:"Active Clients", value:stats.active_clients, color:"#48bb78"},
{label:"Pending Mailbox", value:stats.pending_mailbox, color:"#ed8936"},
{label:"Mail Today", value:stats.new_mail_today, color:"#9f7aea"},
{label:"Pending Requests",value:stats.pending_requests, color:"#e53e3e"},
{label:"Unread Messages", value:stats.unread_messages, color:"#38b2ac"},
];
return (
<div>
<h2 style={h2Style}>Dashboard</h2>
<div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:16}}>
{cards.map(c=>(
<div key={c.label} style={{background:"#fff",borderRadius:10,padding:24,boxShadow:"0 1px 4px rgba(0,0,0,0.08)",borderLeft:`4px solid ${c.color}`}}>
<div style={{fontSize:32,fontWeight:700,color:c.color}}>{c.value}</div>
<div style={{fontSize:13,color:"#718096",marginTop:4}}>{c.label}</div>
</div>
))}
</div>
</div>
);
}

// ─── Mail Items Tab ───────────────────────────────────────────────────────────
function MailTab({ apiFetch }) {
const [items, setItems] = useState([]);
const [total, setTotal] = useState(0);
const [clients, setClients] = useState([]);
const [selClient, setSelClient] = useState("");
const [showUpload, setShowUpload] = useState(false);
const [uploading, setUploading] = useState(false);
const [form, setForm] = useState({client_id:"",sender:"",mail_type:"Letter",tag:"General",notes:""});
const [scanFile, setScanFile] = useState(null);
const [msg, setMsg] = useState("");

const load = useCallback(() => {
const q = selClient ? `?client_id=${selClient}&limit=50` : "?limit=50";
apiFetch("/admin/mail-items"+q).then(d=>{ setItems(d.items); setTotal(d.total); }).catch(()=>{});
}, [apiFetch, selClient]);

useEffect(() => { apiFetch("/admin/clients").then(setClients).catch(()=>{}); }, []);
useEffect(() => { load(); }, [load]);

const uploadAndCreate = async () => {
if (!form.client_id) return setMsg("Select a client first");
setUploading(true); setMsg("");
try {
let scan_url = "", r2_key = "";
if (scanFile) {
const fd = new FormData(); fd.append("file", scanFile);
const res = await fetch(API+"/upload", { method:"POST", headers:{Authorization:`Bearer ${localStorage.getItem("em_token")}`}, body:fd });
const up = await res.json();
scan_url = up.url; r2_key = up.r2_key;
}
await apiFetch("/mail-items", { method:"POST", body:JSON.stringify({...form, scan_url, r2_key}) });
setMsg("✅ Mail item created!"); setShowUpload(false);
setForm({client_id:"",sender:"",mail_type:"Letter",tag:"General",notes:""});
setScanFile(null); load();
} catch(e) { setMsg("Error: "+e.message); }
setUploading(false);
};

return (
<div>
<div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
<h2 style={{...h2Style,margin:0}}>Mail Items ({total})</h2>
<div style={{display:"flex",gap:10}}>
<select value={selClient} onChange={e=>setSelClient(e.target.value)} style={selectStyle}>
<option value="">All Clients</option>
{clients.map(c=><option key={c.id} value={c.id}>#{c.mailbox_number||"?"} {clientName(c)}</option>)}
</select>
<button onClick={()=>setShowUpload(true)} style={btnStyle}>+ Add Mail Item</button>
</div>
</div>

{showUpload && (
<div style={{background:"#fff",borderRadius:10,padding:24,marginBottom:20,boxShadow:"0 2px 8px rgba(0,0,0,0.1)"}}>
<h3 style={{margin:"0 0 16px",fontSize:16}}>New Mail Item</h3>
<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
<div>
<label style={labelStyle}>Client *</label>
<select value={form.client_id} onChange={e=>setForm({...form,client_id:e.target.value})} style={selectStyle}>
<option value="">Select client...</option>
{clients.map(c=><option key={c.id} value={c.id}>#{c.mailbox_number||"?"} {clientName(c)} ({c.user_email})</option>)}
</select>
</div>
<div>
<label style={labelStyle}>Sender</label>
<input value={form.sender} onChange={e=>setForm({...form,sender:e.target.value})} style={inputStyle} placeholder="e.g. USPS, Amazon"/>
</div>
<div>
<label style={labelStyle}>Mail Type</label>
<select value={form.mail_type} onChange={e=>setForm({...form,mail_type:e.target.value})} style={selectStyle}>
{["Letter","Package","Magazine","Legal","Check","Other"].map(t=><option key={t}>{t}</option>)}
</select>
</div>
<div>
<label style={labelStyle}>Tag</label>
<select value={form.tag} onChange={e=>setForm({...form,tag:e.target.value})} style={selectStyle}>
{["General","Personal","Business","Legal","Financial","Government"].map(t=><option key={t}>{t}</option>)}
</select>
</div>
<div style={{gridColumn:"1/-1"}}>
<label style={labelStyle}>Notes</label>
<input value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} style={inputStyle} placeholder="Optional notes"/>
</div>
<div style={{gridColumn:"1/-1"}}>
<label style={labelStyle}>Scan / Photo (optional)</label>
<input type="file" accept="image/*,application/pdf" onChange={e=>setScanFile(e.target.files[0])} style={{fontSize:13}}/>
</div>
</div>
{msg && <p style={{color:msg.startsWith("✅")?"#48bb78":"#e53e3e",fontSize:13,marginTop:8}}>{msg}</p>}
<div style={{display:"flex",gap:10,marginTop:16}}>
<button onClick={uploadAndCreate} disabled={uploading} style={btnStyle}>{uploading?"Uploading...":"Create Mail Item"}</button>
<button onClick={()=>setShowUpload(false)} style={btnOutline}>Cancel</button>
</div>
</div>
)}

<div style={{background:"#fff",borderRadius:10,boxShadow:"0 1px 4px rgba(0,0,0,0.08)",overflow:"hidden"}}>
<table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
<thead><tr style={{background:"#f7fafc"}}>
{["Item ID","Client","Type","Sender","Status","Date",""].map(h=><th key={h} style={thStyle}>{h}</th>)}
</tr></thead>
<tbody>
{items.length===0 && <tr><td colSpan={7} style={{textAlign:"center",padding:32,color:"#718096"}}>No mail items</td></tr>}
{items.map(item=>(
<tr key={item.id} style={{borderTop:"1px solid #edf2f7"}}>
<td style={tdStyle}><span style={{fontFamily:"monospace",fontWeight:600,color:"#4299e1"}}>{item.item_id}</span></td>
<td style={tdStyle}><div style={{fontWeight:500}}>{item.client_name}</div><div style={{color:"#718096",fontSize:11}}>#{item.mailbox_number}</div></td>
<td style={tdStyle}>{item.mail_type}</td>
<td style={tdStyle}>{item.sender||"—"}</td>
<td style={tdStyle}><StatusBadge s={item.status}/></td>
<td style={tdStyle}>{item.created_at?.slice(0,10)}</td>
<td style={tdStyle}>{item.scan_url && <a href={item.scan_url} target="_blank" rel="noreferrer" style={{color:"#4299e1",fontSize:12}}>View Scan</a>}</td>
</tr>
))}
</tbody>
</table>
</div>
</div>
);
}

// ─── Requests Tab ─────────────────────────────────────────────────────────────
function RequestsTab({ apiFetch }) {
const [items, setItems] = useState([]);
const [filter, setFilter] = useState("Pending");
const [notes, setNotes] = useState({});

const load = useCallback(() => {
apiFetch(`/admin/requests?status=${filter}`).then(setItems).catch(()=>{});
}, [apiFetch, filter]);

useEffect(()=>{ load(); },[load]);

const update = async (id, status, staff_notes) => {
await apiFetch(`/requests/${id}`, { method:"PUT", body:JSON.stringify({status, staff_notes}) });
load();
};

return (
<div>
<div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
<h2 style={{...h2Style,margin:0}}>Requests</h2>
<select value={filter} onChange={e=>setFilter(e.target.value)} style={selectStyle}>
{["Pending","Approved","Completed","Rejected"].map(s=><option key={s}>{s}</option>)}
</select>
</div>
<div style={{display:"flex",flexDirection:"column",gap:12}}>
{items.length===0 && <div style={{textAlign:"center",padding:40,color:"#718096",background:"#fff",borderRadius:10}}>No {filter.toLowerCase()} requests</div>}
{items.map(r=>(
<div key={r.id} style={{background:"#fff",borderRadius:10,padding:20,boxShadow:"0 1px 4px rgba(0,0,0,0.08)"}}>
<div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
<div>
<span style={{fontWeight:600,color:"#1a202c"}}>{r.request_type}</span>
<span style={{marginLeft:8}}><StatusBadge s={r.status}/></span>
<div style={{fontSize:13,color:"#718096",marginTop:4}}>
{r.client_name} • #{r.mailbox_number} • Item: <span style={{fontFamily:"monospace",color:"#4299e1"}}>{r.item_id||r.mail_item_id}</span>
</div>
{r.shipping_address && <div style={{fontSize:12,color:"#718096",marginTop:4}}>Ship to: {r.shipping_address}</div>}
{r.notes && <div style={{fontSize:12,color:"#718096",marginTop:2}}>Note: {r.notes}</div>}
</div>
<div style={{fontSize:12,color:"#718096"}}>{r.created_at?.slice(0,10)}</div>
</div>
{filter==="Pending" && (
<div style={{marginTop:12,display:"flex",gap:8,alignItems:"center"}}>
<input placeholder="Staff notes (optional)" value={notes[r.id]||""} onChange={e=>setNotes({...notes,[r.id]:e.target.value})} style={{...inputStyle,flex:1,marginBottom:0}}/>
<button onClick={()=>update(r.id,"Approved",notes[r.id])} style={{...btnStyle,background:"#48bb78",padding:"8px 14px"}}>Approve</button>
<button onClick={()=>update(r.id,"Rejected",notes[r.id])} style={{...btnStyle,background:"#e53e3e",padding:"8px 14px"}}>Reject</button>
</div>
)}
</div>
))}
</div>
</div>
);
}

// ─── Clients Tab ──────────────────────────────────────────────────────────────
function ClientsTab({ apiFetch, onMessage }) {
const [clients, setClients] = useState([]);
const [search, setSearch] = useState("");
const [editing, setEditing] = useState(null);
const [editData, setEditData] = useState({});
const [msg, setMsg] = useState("");
const [showAdd, setShowAdd] = useState(false);
const [addData, setAddData] = useState({name:"",email:"",password:"",plan:"Standard",mailbox_number:"",status:"Active",notes:""});
const [adding, setAdding] = useState(false);

const load = useCallback(() => {
const q = search ? `?search=${encodeURIComponent(search)}` : "";
apiFetch("/admin/clients"+q).then(setClients).catch(()=>{});
}, [apiFetch, search]);

useEffect(()=>{ load(); },[load]);

const save = async () => {
try {
await apiFetch(`/admin/clients/${editing}`, { method:"PUT", body:JSON.stringify(editData) });
setMsg("✅ Saved"); setEditing(null); load();
} catch(e) { setMsg("Error: "+e.message); }
};

const addClient = async () => {
if (!addData.name || !addData.email || !addData.password) return setMsg("Name, email, and password are required");
setAdding(true); setMsg("");
try {
await apiFetch("/admin/clients", { method:"POST", body:JSON.stringify(addData) });
setMsg("✅ Client added!"); setShowAdd(false);
setAddData({name:"",email:"",password:"",plan:"Standard",mailbox_number:"",status:"Active",notes:""});
load();
} catch(e) { setMsg("Error: "+e.message); }
setAdding(false);
};

return (
<div>
<div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
<h2 style={{...h2Style,margin:0}}>Clients ({clients.length})</h2>
<div style={{display:"flex",gap:10}}>
<input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search name, email, mailbox#..." style={{...inputStyle,width:260,marginBottom:0}}/>
<button onClick={()=>{setShowAdd(true);setMsg("");}} style={btnStyle}>+ Add Client</button>
</div>
</div>
{msg && <div style={{background:msg.startsWith("✅")?"#f0fff4":"#fff5f5",color:msg.startsWith("✅")?"#276749":"#c53030",padding:"10px 14px",borderRadius:8,marginBottom:12,fontSize:13}}>{msg}</div>}
{showAdd && (
<div style={{background:"#fff",borderRadius:10,padding:24,marginBottom:20,boxShadow:"0 2px 8px rgba(0,0,0,0.1)"}}>
<h3 style={{margin:"0 0 16px",fontSize:16}}>Add New Client</h3>
<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
<div><label style={labelStyle}>Full Name *</label><input value={addData.name} onChange={e=>setAddData({...addData,name:e.target.value})} style={inputStyle} placeholder="e.g. Jason Chen"/></div>
<div><label style={labelStyle}>Email *</label><input value={addData.email} onChange={e=>setAddData({...addData,email:e.target.value})} style={inputStyle} placeholder="client@email.com"/></div>
<div><label style={labelStyle}>Password *</label><input type="password" value={addData.password} onChange={e=>setAddData({...addData,password:e.target.value})} style={inputStyle} placeholder="Set initial password"/></div>
<div><label style={labelStyle}>Mailbox Number</label><input value={addData.mailbox_number} onChange={e=>setAddData({...addData,mailbox_number:e.target.value})} style={inputStyle} placeholder="e.g. 142"/></div>
<div><label style={labelStyle}>Plan</label><select value={addData.plan} onChange={e=>setAddData({...addData,plan:e.target.value})} style={selectStyle}>{["Essential","Grow","Primary","Standard"].map(p=><option key={p}>{p}</option>)}</select></div>
<div><label style={labelStyle}>Status</label><select value={addData.status} onChange={e=>setAddData({...addData,status:e.target.value})} style={selectStyle}>{["Active","Pending","Suspended"].map(s=><option key={s}>{s}</option>)}</select></div>
<div style={{gridColumn:"1/-1"}}><label style={labelStyle}>Notes</label><input value={addData.notes} onChange={e=>setAddData({...addData,notes:e.target.value})} style={inputStyle} placeholder="Internal notes (optional)"/></div>
</div>
<div style={{display:"flex",gap:10,marginTop:16}}>
<button onClick={addClient} disabled={adding} style={btnStyle}>{adding?"Adding...":"Add Client"}</button>
<button onClick={()=>setShowAdd(false)} style={btnOutline}>Cancel</button>
</div>
</div>
)}
<div style={{background:"#fff",borderRadius:10,boxShadow:"0 1px 4px rgba(0,0,0,0.08)",overflow:"hidden"}}>
<table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
<thead><tr style={{background:"#f7fafc"}}>
{["Mailbox #","Name","Email","Plan","Status","Mail","Actions"].map(h=><th key={h} style={thStyle}>{h}</th>)}
</tr></thead>
<tbody>
{clients.map(c=>(
<>
<tr key={c.id} style={{borderTop:"1px solid #edf2f7"}}>
<td style={tdStyle}>
{c.mailbox_number
? <span style={{fontFamily:"monospace",fontWeight:700,color:"#4299e1"}}>#{c.mailbox_number}</span>
: <span style={{color:"#e53e3e",fontSize:12}}>Not assigned</span>}
</td>
<td style={tdStyle}><div style={{fontWeight:500}}>{clientName(c)}</div></td>
<td style={tdStyle}>{c.user_email}</td>
<td style={tdStyle}>{c.plan}</td>
<td style={tdStyle}><StatusBadge s={c.status}/></td>
<td style={tdStyle}>{c.mail_count}</td>
<td style={tdStyle}>
<div style={{display:"flex",gap:6}}>
<button onClick={()=>{setEditing(c.id);setEditData({mailbox_number:c.mailbox_number||"",plan:c.plan,status:c.status,notes:c.notes||""});setMsg("");}} style={{...btnSmall,background:"#4299e1"}}>Edit</button>
<button onClick={()=>onMessage(c)} style={{...btnSmall,background:"#9f7aea",position:"relative"}}>
Msg {c.unread_messages>0 && <span style={{position:"absolute",top:-4,right:-4,background:"#e53e3e",color:"#fff",borderRadius:8,fontSize:10,padding:"0 4px"}}>{c.unread_messages}</span>}
</button>
</div>
</td>
</tr>
{editing===c.id && (
<tr key={`edit-${c.id}`} style={{background:"#f7fafc"}}>
<td colSpan={7} style={{padding:16}}>
<div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12}}>
<div>
<label style={labelStyle}>Mailbox Number</label>
<input value={editData.mailbox_number} onChange={e=>setEditData({...editData,mailbox_number:e.target.value})} style={inputStyle} placeholder="e.g. 142"/>
</div>
<div>
<label style={labelStyle}>Plan</label>
<select value={editData.plan} onChange={e=>setEditData({...editData,plan:e.target.value})} style={selectStyle}>
{["Essential","Grow","Primary","Standard"].map(p=><option key={p}>{p}</option>)}
</select>
</div>
<div>
<label style={labelStyle}>Status</label>
<select value={editData.status} onChange={e=>setEditData({...editData,status:e.target.value})} style={selectStyle}>
{["Active","Suspended","Pending","Cancelled"].map(s=><option key={s}>{s}</option>)}
</select>
</div>
<div>
<label style={labelStyle}>Notes</label>
<input value={editData.notes} onChange={e=>setEditData({...editData,notes:e.target.value})} style={inputStyle} placeholder="Internal notes"/>
</div>
</div>
<div style={{display:"flex",gap:8,marginTop:12}}>
<button onClick={save} style={btnStyle}>Save Changes</button>
<button onClick={()=>setEditing(null)} style={btnOutline}>Cancel</button>
</div>
</td>
</tr>
)}
</>
))}
</tbody>
</table>
</div>
</div>
);
}

// ─── Messages Tab ─────────────────────────────────────────────────────────────
function MessagesTab({ apiFetch, selectedClient, onClearClient }) {
const [clients, setClients] = useState([]);
const [activeClient, setActiveClient] = useState(selectedClient);
const [messages, setMessages] = useState([]);
const [newMsg, setNewMsg] = useState("");
const [sending, setSending] = useState(false);

useEffect(()=>{ apiFetch("/admin/clients").then(setClients).catch(()=>{}); },[]);
useEffect(()=>{ if(selectedClient) setActiveClient(selectedClient); },[selectedClient]);

useEffect(()=>{
if(!activeClient) return;
apiFetch(`/admin/messages?client_id=${activeClient.id}`).then(setMessages).catch(()=>{});
},[activeClient]);

const send = async () => {
if(!newMsg.trim()||!activeClient) return;
setSending(true);
await apiFetch("/admin/messages", { method:"POST", body:JSON.stringify({client_id:activeClient.id,message:newMsg}) });
setNewMsg("");
apiFetch(`/admin/messages?client_id=${activeClient.id}`).then(setMessages).catch(()=>{});
setSending(false);
};

return (
<div style={{display:"flex",gap:16,height:"calc(100vh - 120px)"}}>
<div style={{width:240,background:"#fff",borderRadius:10,boxShadow:"0 1px 4px rgba(0,0,0,0.08)",overflow:"auto"}}>
<div style={{padding:"12px 16px",borderBottom:"1px solid #edf2f7",fontWeight:600,fontSize:13,color:"#4a5568"}}>Clients</div>
{clients.map(c=>(
<button key={c.id} onClick={()=>{setActiveClient(c);if(onClearClient)onClearClient();}} style={{
display:"block",width:"100%",textAlign:"left",padding:"10px 16px",
background:activeClient?.id===c.id?"#ebf8ff":"transparent",
border:"none",borderTop:"1px solid #edf2f7",cursor:"pointer",position:"relative"
}}>
<div style={{fontSize:13,fontWeight:500,color:"#1a202c"}}>{clientName(c)}</div>
<div style={{fontSize:11,color:"#718096"}}>#{c.mailbox_number||"?"}</div>
{c.unread_messages>0 && <span style={{position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",background:"#e53e3e",color:"#fff",borderRadius:10,fontSize:11,padding:"1px 6px"}}>{c.unread_messages}</span>}
</button>
))}
</div>
<div style={{flex:1,display:"flex",flexDirection:"column",background:"#fff",borderRadius:10,boxShadow:"0 1px 4px rgba(0,0,0,0.08)"}}>
{!activeClient ? (
<div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",color:"#718096"}}>Select a client to view messages</div>
) : (
<>
<div style={{padding:"14px 20px",borderBottom:"1px solid #edf2f7",fontWeight:600,fontSize:14}}>
{clientName(activeClient)} <span style={{color:"#718096",fontWeight:400,fontSize:12}}>#{activeClient.mailbox_number}</span>
</div>
<div style={{flex:1,overflowY:"auto",padding:16,display:"flex",flexDirection:"column",gap:10}}>
{messages.map(m=>(
<div key={m.id} style={{display:"flex",justifyContent:m.sender_type==="admin"?"flex-end":"flex-start"}}>
<div style={{maxWidth:"70%",padding:"10px 14px",borderRadius:12,background:m.sender_type==="admin"?"#4299e1":"#f7fafc",color:m.sender_type==="admin"?"#fff":"#1a202c",fontSize:13}}>
{m.message}
<div style={{fontSize:10,opacity:0.7,marginTop:4}}>{m.created_at?.slice(0,16)}</div>
</div>
</div>
))}
{messages.length===0 && <div style={{textAlign:"center",color:"#718096",marginTop:40}}>No messages yet</div>}
</div>
<div style={{padding:16,borderTop:"1px solid #edf2f7",display:"flex",gap:10}}>
<input value={newMsg} onChange={e=>setNewMsg(e.target.value)} onKeyDown={e=>e.key==="Enter"&&send()} placeholder="Type a message..." style={{...inputStyle,flex:1,marginBottom:0}}/>
<button onClick={send} disabled={sending} style={btnStyle}>Send</button>
</div>
</>
)}
</div>
</div>
);
}

// ─── Shared Styles ────────────────────────────────────────────────────────────
const inputStyle = {width:"100%",padding:"8px 12px",border:"1px solid #e2e8f0",borderRadius:6,fontSize:13,boxSizing:"border-box",outline:"none"};
const selectStyle = {width:"100%",padding:"8px 12px",border:"1px solid #e2e8f0",borderRadius:6,fontSize:13,background:"#fff",outline:"none"};
const btnStyle = {padding:"9px 18px",background:"#4299e1",color:"#fff",border:"none",borderRadius:6,cursor:"pointer",fontSize:13,fontWeight:500};
const btnOutline = {padding:"9px 18px",background:"#fff",color:"#4a5568",border:"1px solid #e2e8f0",borderRadius:6,cursor:"pointer",fontSize:13};
const btnSmall = {padding:"5px 10px",color:"#fff",border:"none",borderRadius:4,cursor:"pointer",fontSize:12,position:"relative"};
const thStyle = {padding:"10px 14px",textAlign:"left",fontSize:12,fontWeight:600,color:"#718096",textTransform:"uppercase"};
const tdStyle = {padding:"12px 14px",color:"#2d3748"};
const h2Style = {fontSize:20,fontWeight:700,color:"#1a202c",marginBottom:20};
const labelStyle = {fontSize:12,fontWeight:500,color:"#4a5568",display:"block",marginBottom:4};

const STATUS_COLORS = {New:"#4299e1",Opened:"#48bb78",Active:"#48bb78",Pending:"#ed8936",Approved:"#48bb78",Rejected:"#e53e3e",Completed:"#718096",Suspended:"#e53e3e",Cancelled:"#718096",Forward:"#9f7aea",Shred:"#e53e3e",Pickup:"#ed8936"};
const StatusBadge = ({s}) => <span style={{padding:"2px 8px",borderRadius:10,fontSize:11,fontWeight:600,background:(STATUS_COLORS[s]||"#718096")+"22",color:STATUS_COLORS[s]||"#718096"}}>{s}</span>;
const Loading = () => <div style={{textAlign:"center",padding:60,color:"#718096"}}>Loading...</div>;

// ─── App Root ─────────────────────────────────────────────────────────────────
export default function AdminDashboard() {
const { user, login, logout, apiFetch, loading } = useAuth();
const [tab, setTab] = useState("dashboard");
const [stats, setStats] = useState(null);
const [msgClient, setMsgClient] = useState(null);

useEffect(()=>{
if(!user) return;
apiFetch("/admin/stats").then(setStats).catch(()=>{});
const iv = setInterval(()=>apiFetch("/admin/stats").then(setStats).catch(()=>{}), 30000);
return ()=>clearInterval(iv);
},[user]);

const openMessage = (client) => { setMsgClient(client); setTab("messages"); };

if (loading) return <Loading/>;
if (!user) return <LoginScreen onLogin={login}/>;

return (
<div style={{display:"flex",fontFamily:"'Inter',system-ui,sans-serif",minHeight:"100vh",background:"#f0f4f8"}}>
<Sidebar active={tab} onChange={setTab} stats={stats} onLogout={logout}/>
<main style={{flex:1,padding:28,overflowY:"auto"}}>
{tab==="dashboard" && <DashboardTab apiFetch={apiFetch}/>}
{tab==="mail" && <MailTab apiFetch={apiFetch}/>}
{tab==="requests" && <RequestsTab apiFetch={apiFetch}/>}
{tab==="clients" && <ClientsTab apiFetch={apiFetch} onMessage={openMessage}/>}
{tab==="messages" && <MessagesTab apiFetch={apiFetch} selectedClient={msgClient} onClearClient={()=>setMsgClient(null)}/>}
</main>
</div>
);
}

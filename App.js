import { useState, useEffect, useCallback } from "react";

const API = "https://eastlakemail.com/wp-json/eastlake/v1";

function useAuth() {
  const [token, setToken] = useState(() => localStorage.getItem("em_token"));
  const [user, setUser]   = useState(null);
  const [loading, setLoading] = useState(true);

  const login = async (username, password) => {
    const res = await fetch("https://eastlakemail.com/wp-json/jwt-auth/v1/token", {
      method:"POST", headers:{"Content-Type":"application/json"},
      body: JSON.stringify({username, password}),
    });
    const data = await res.json();
    if (data.token) { localStorage.setItem("em_token", data.token); setToken(data.token); return true; }
    return false;
  };

  const logout = () => { localStorage.removeItem("em_token"); setToken(null); setUser(null); };

  const apiFetch = useCallback(async (path, options={}) => {
    const res = await fetch(API+path, {
      ...options,
      headers: {"Content-Type":"application/json", Authorization:`Bearer ${token}`, ...(options.headers||{})},
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  }, [token]);

  useEffect(() => {
    if (!token) { setLoading(false); return; }
    apiFetch("/auth/me").then(d => setUser(d)).catch(logout).finally(()=>setLoading(false));
  }, [token]);

  return { token, user, login, logout, apiFetch, loading };
}

function LoginScreen({ onLogin }) {
  const [u,setU]=useState(""); const [p,setP]=useState("");
  const [err,setErr]=useState(""); const [busy,setBusy]=useState(false);
  const submit = async () => {
    setBusy(true); setErr("");
    const ok = await onLogin(u,p);
    if (!ok) { setErr("Invalid username or password"); setBusy(false); }
  };
  return (
    <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"linear-gradient(135deg,#e8f4fd 0%,#f0f4f8 100%)"}}>
      <div style={{background:"#fff",borderRadius:16,padding:40,width:380,boxShadow:"0 8px 32px rgba(0,0,0,0.12)"}}>
        <img src="https://eastlakemail.com/wp-content/uploads/Eastlake-MailboxCoworking-LO-FF-1.jpg" alt="logo" style={{width:"100%",marginBottom:24,borderRadius:8}}/>
        <h2 style={{margin:"0 0 6px",fontSize:22,color:"#1a202c",fontWeight:700}}>Client Portal</h2>
        <p style={{margin:"0 0 24px",color:"#718096",fontSize:14}}>Sign in to manage your mailbox</p>
        <label style={labelStyle}>Username or Email</label>
        <input value={u} onChange={e=>setU(e.target.value)} style={inputStyle} onKeyDown={e=>e.key==="Enter"&&submit()}/>
        <label style={{...labelStyle,marginTop:12}}>Password</label>
        <input value={p} onChange={e=>setP(e.target.value)} type="password" style={inputStyle} onKeyDown={e=>e.key==="Enter"&&submit()}/>
        {err && <p style={{color:"#e53e3e",fontSize:13,marginTop:8}}>{err}</p>}
        <button onClick={submit} disabled={busy} style={{...btnStyle,width:"100%",marginTop:20,padding:12}}>{busy?"Signing in...":"Sign In"}</button>
        <p style={{textAlign:"center",marginTop:16,fontSize:13,color:"#718096"}}>
          Need a mailbox? <a href="https://eastlakemail.com/mailbox-signup/" style={{color:"#4299e1"}}>Sign up here</a>
        </p>
      </div>
    </div>
  );
}

const NAV = [
  {id:"dashboard",label:"Dashboard",icon:"🏠"},
  {id:"mail",     label:"My Mail",  icon:"📬"},
  {id:"requests", label:"Requests", icon:"📋"},
  {id:"messages", label:"Messages", icon:"💬"},
  {id:"profile",  label:"Profile",  icon:"👤"},
];

function ClientPortal() {
  const { user, login, logout, apiFetch, loading } = useAuth();
  const [tab, setTab]   = useState("dashboard");
  const [stats, setStats] = useState(null);

  useEffect(()=>{
    if (!user) return;
    apiFetch("/client/stats").then(setStats).catch(()=>{});
  },[user]);

  if (loading) return <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100vh",color:"#718096"}}>Loading...</div>;
  if (!user)   return <LoginScreen onLogin={login}/>;

  const client = user.client;

  return (
    <div style={{display:"flex",fontFamily:"'Inter',system-ui,sans-serif",minHeight:"100vh",background:"#f0f4f8"}}>
      {/* Sidebar */}
      <div style={{width:220,background:"#1a202c",minHeight:"100vh",display:"flex",flexDirection:"column",flexShrink:0}}>
        <div style={{padding:"20px 16px",borderBottom:"1px solid #2d3748"}}>
          <div style={{color:"#fff",fontWeight:700,fontSize:15}}>Eastlake Mailbox</div>
          <div style={{color:"#68d391",fontSize:12,marginTop:2}}>
            {client?.mailbox_number ? `Mailbox #${client.mailbox_number}` : "Mailbox pending assignment"}
          </div>
        </div>
        <nav style={{flex:1,padding:"12px 0"}}>
          {NAV.map(n=>(
            <button key={n.id} onClick={()=>setTab(n.id)} style={{
              display:"block",width:"100%",textAlign:"left",padding:"10px 20px",
              background:tab===n.id?"#2d3748":"transparent",
              color:tab===n.id?"#fff":"#a0aec0",border:"none",cursor:"pointer",fontSize:14,
            }}>
              {n.icon} {n.label}
              {n.id==="messages" && user.unread_messages>0 && <span style={{marginLeft:6,background:"#e53e3e",color:"#fff",borderRadius:10,fontSize:11,padding:"1px 6px"}}>{user.unread_messages}</span>}
              {n.id==="mail" && stats?.new_mail>0 && <span style={{marginLeft:6,background:"#4299e1",color:"#fff",borderRadius:10,fontSize:11,padding:"1px 6px"}}>{stats.new_mail}</span>}
            </button>
          ))}
        </nav>
        <div style={{padding:16}}>
          <div style={{color:"#718096",fontSize:12,marginBottom:8}}>{user.name}</div>
          <button onClick={logout} style={{width:"100%",padding:"8px",background:"#e53e3e",color:"#fff",border:"none",borderRadius:6,cursor:"pointer",fontSize:13}}>Sign Out</button>
        </div>
      </div>
      {/* Main */}
      <main style={{flex:1,padding:28,overflowY:"auto"}}>
        {tab==="dashboard" && <ClientDashboard stats={stats} client={client} user={user} onTab={setTab}/>}
        {tab==="mail"      && <MailInbox apiFetch={apiFetch}/>}
        {tab==="requests"  && <RequestsView apiFetch={apiFetch}/>}
        {tab==="messages"  && <MessagesView apiFetch={apiFetch} clientId={client?.id}/>}
        {tab==="profile"   && <ProfileView apiFetch={apiFetch} user={user}/>}
      </main>
    </div>
  );
}

function ClientDashboard({ stats, client, user, onTab }) {
  const cards = [
    {label:"New Mail",        value:stats?.new_mail||0,    color:"#4299e1", tab:"mail"},
    {label:"Total Mail",      value:stats?.total_mail||0,  color:"#48bb78", tab:"mail"},
    {label:"Pending Requests",value:stats?.pending_req||0, color:"#ed8936", tab:"requests"},
    {label:"Unread Messages", value:stats?.unread_msg||0,  color:"#9f7aea", tab:"messages"},
  ];
  return (
    <div>
      <h2 style={h2Style}>Welcome back, {user.name.split(" ")[0]}!</h2>
      {!client?.mailbox_number && (
        <div style={{background:"#fffbeb",border:"1px solid #f6e05e",borderRadius:10,padding:16,marginBottom:20,fontSize:14,color:"#744210"}}>
          ⏳ Your mailbox number is being assigned. You'll receive an email notification within 24 hours.
        </div>
      )}
      <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:16,marginBottom:24}}>
        {cards.map(c=>(
          <button key={c.label} onClick={()=>onTab(c.tab)} style={{background:"#fff",borderRadius:10,padding:24,boxShadow:"0 1px 4px rgba(0,0,0,0.08)",borderLeft:`4px solid ${c.color}`,textAlign:"left",cursor:"pointer",border:`none`,borderLeft:`4px solid ${c.color}`}}>
            <div style={{fontSize:32,fontWeight:700,color:c.color}}>{c.value}</div>
            <div style={{fontSize:13,color:"#718096",marginTop:4}}>{c.label}</div>
          </button>
        ))}
      </div>
      {client?.mailbox_number && (
        <div style={{background:"#fff",borderRadius:10,padding:20,boxShadow:"0 1px 4px rgba(0,0,0,0.08)"}}>
          <h3 style={{margin:"0 0 12px",fontSize:15,color:"#1a202c"}}>Your Mailing Address</h3>
          <div style={{fontFamily:"monospace",fontSize:14,color:"#2d3748",lineHeight:1.8}}>
            {user.name}<br/>
            2226 Eastlake Ave E, #{client.mailbox_number}<br/>
            Seattle, WA 98102
          </div>
        </div>
      )}
    </div>
  );
}

function MailInbox({ apiFetch }) {
  const [items, setItems] = useState([]);
  const [selected, setSelected] = useState(null);
  const [showRequest, setShowRequest] = useState(false);
  const [reqType, setReqType] = useState("Forward");
  const [reqData, setReqData] = useState({shipping_address:"",shipping_method:"Priority Mail",notes:""});
  const [msg, setMsg] = useState("");

  useEffect(()=>{ apiFetch("/mail-items").then(setItems).catch(()=>{}); },[]);

  const openItem = async (item) => {
    setSelected(item); setShowRequest(false); setMsg("");
    if (item.status==="New") {
      await apiFetch(`/mail-items/${item.id}`).catch(()=>{});
      setItems(prev=>prev.map(i=>i.id===item.id?{...i,status:"Opened"}:i));
    }
  };

  const submitRequest = async () => {
    try {
      await apiFetch("/requests", { method:"POST", body:JSON.stringify({
        mail_item_id: selected.id,
        request_type: reqType,
        ...reqData,
      })});
      setMsg("✅ Request submitted!");
      setShowRequest(false);
      setItems(prev=>prev.map(i=>i.id===selected.id?{...i,status:reqType}:i));
    } catch(e) { setMsg("Error: "+e.message); }
  };

  return (
    <div style={{display:"flex",gap:16,height:"calc(100vh - 120px)"}}>
      <div style={{width:300,background:"#fff",borderRadius:10,boxShadow:"0 1px 4px rgba(0,0,0,0.08)",overflow:"auto",flexShrink:0}}>
        <div style={{padding:"14px 16px",borderBottom:"1px solid #edf2f7",fontWeight:600,fontSize:14}}>📬 Mail Inbox</div>
        {items.length===0 && <div style={{padding:32,textAlign:"center",color:"#718096",fontSize:13}}>No mail items yet</div>}
        {items.map(item=>(
          <button key={item.id} onClick={()=>openItem(item)} style={{
            display:"block",width:"100%",textAlign:"left",padding:"12px 16px",
            background:selected?.id===item.id?"#ebf8ff":"transparent",
            border:"none",borderTop:"1px solid #edf2f7",cursor:"pointer",
          }}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
              <div style={{fontFamily:"monospace",fontSize:11,color:"#4299e1",fontWeight:600}}>{item.item_id}</div>
              {item.status==="New" && <span style={{background:"#4299e1",color:"#fff",borderRadius:8,fontSize:10,padding:"2px 6px"}}>NEW</span>}
            </div>
            <div style={{fontWeight:item.status==="New"?600:400,fontSize:13,color:"#1a202c",marginTop:3}}>{item.mail_type}</div>
            <div style={{fontSize:12,color:"#718096",marginTop:2}}>{item.sender||"Unknown sender"}</div>
            <div style={{fontSize:11,color:"#a0aec0",marginTop:2}}>{item.created_at?.slice(0,10)}</div>
          </button>
        ))}
      </div>
      <div style={{flex:1,background:"#fff",borderRadius:10,boxShadow:"0 1px 4px rgba(0,0,0,0.08)",display:"flex",flexDirection:"column"}}>
        {!selected ? (
          <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",color:"#718096",fontSize:14}}>Select a mail item to view details</div>
        ) : (
          <div style={{padding:24,overflowY:"auto"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:20}}>
              <div>
                <div style={{fontFamily:"monospace",fontSize:13,color:"#4299e1",fontWeight:700}}>{selected.item_id}</div>
                <h2 style={{margin:"4px 0",fontSize:20,color:"#1a202c"}}>{selected.mail_type}</h2>
                <StatusBadge s={selected.status}/>
              </div>
              <div style={{fontSize:12,color:"#718096"}}>{selected.created_at?.slice(0,10)}</div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:20}}>
              <InfoRow label="Sender"   value={selected.sender||"—"}/>
              <InfoRow label="Type"     value={selected.mail_type}/>
              <InfoRow label="Tag"      value={selected.tag}/>
              <InfoRow label="Folder"   value={selected.folder}/>
            </div>
            {selected.notes && <div style={{background:"#f7fafc",borderRadius:8,padding:12,fontSize:13,color:"#4a5568",marginBottom:16}}><strong>Notes:</strong> {selected.notes}</div>}
            {selected.scan_url && (
              <div style={{marginBottom:20}}>
                <div style={{fontSize:12,fontWeight:600,color:"#718096",marginBottom:8}}>SCAN</div>
                <img src={selected.scan_url} alt="scan" style={{maxWidth:"100%",borderRadius:8,border:"1px solid #e2e8f0"}} onError={e=>{e.target.style.display="none";}}/>
                <a href={selected.scan_url} target="_blank" rel="noreferrer" style={{display:"block",marginTop:8,fontSize:13,color:"#4299e1"}}>Open full scan ↗</a>
              </div>
            )}
            {!showRequest && !["Forward","Shred","Pickup"].includes(selected.status) && (
              <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
                {["Forward","Pickup","Shred"].map(t=>(
                  <button key={t} onClick={()=>{setReqType(t);setShowRequest(true);setMsg("");}} style={{...btnStyle,background:t==="Shred"?"#e53e3e":t==="Pickup"?"#ed8936":"#4299e1"}}>{t}</button>
                ))}
              </div>
            )}
            {showRequest && (
              <div style={{background:"#f7fafc",borderRadius:10,padding:20,marginTop:16}}>
                <h3 style={{margin:"0 0 16px",fontSize:15}}>Request: {reqType}</h3>
                {reqType==="Forward" && (
                  <>
                    <label style={labelStyle}>Shipping Address</label>
                    <textarea value={reqData.shipping_address} onChange={e=>setReqData({...reqData,shipping_address:e.target.value})} style={{...inputStyle,height:80,resize:"vertical"}} placeholder="Full shipping address"/>
                    <label style={{...labelStyle,marginTop:12}}>Shipping Method</label>
                    <select value={reqData.shipping_method} onChange={e=>setReqData({...reqData,shipping_method:e.target.value})} style={selectStyle}>
                      {["Priority Mail","First Class","Priority Mail Express","Media Mail"].map(m=><option key={m}>{m}</option>)}
                    </select>
                  </>
                )}
                <label style={{...labelStyle,marginTop:12}}>Notes (optional)</label>
                <input value={reqData.notes} onChange={e=>setReqData({...reqData,notes:e.target.value})} style={inputStyle} placeholder="Any special instructions"/>
                {msg && <p style={{color:msg.startsWith("✅")?"#48bb78":"#e53e3e",fontSize:13,marginTop:8}}>{msg}</p>}
                <div style={{display:"flex",gap:10,marginTop:16}}>
                  <button onClick={submitRequest} style={btnStyle}>Submit Request</button>
                  <button onClick={()=>setShowRequest(false)} style={btnOutline}>Cancel</button>
                </div>
              </div>
            )}
            {msg && !showRequest && <p style={{color:"#48bb78",fontSize:13,marginTop:12}}>{msg}</p>}
          </div>
        )}
      </div>
    </div>
  );
}

function RequestsView({ apiFetch }) {
  const [items, setItems] = useState([]);
  useEffect(()=>{ apiFetch("/requests").then(setItems).catch(()=>{}); },[]);
  return (
    <div>
      <h2 style={h2Style}>My Requests</h2>
      {items.length===0 && <div style={{textAlign:"center",padding:48,color:"#718096",background:"#fff",borderRadius:10}}>No requests yet</div>}
      <div style={{display:"flex",flexDirection:"column",gap:12}}>
        {items.map(r=>(
          <div key={r.id} style={{background:"#fff",borderRadius:10,padding:20,boxShadow:"0 1px 4px rgba(0,0,0,0.08)"}}>
            <div style={{display:"flex",justifyContent:"space-between"}}>
              <div>
                <span style={{fontWeight:600}}>{r.request_type}</span>
                <span style={{marginLeft:8}}><StatusBadge s={r.status}/></span>
                <div style={{fontSize:13,color:"#718096",marginTop:4}}>Item: <span style={{fontFamily:"monospace",color:"#4299e1"}}>{r.item_id||r.mail_item_id}</span></div>
                {r.shipping_address && <div style={{fontSize:12,color:"#718096",marginTop:2}}>To: {r.shipping_address}</div>}
                {r.staff_notes && <div style={{fontSize:12,color:"#4a5568",marginTop:4,background:"#f7fafc",padding:"6px 10px",borderRadius:6}}>Staff note: {r.staff_notes}</div>}
              </div>
              <div style={{fontSize:12,color:"#718096"}}>{r.created_at?.slice(0,10)}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MessagesView({ apiFetch, clientId }) {
  const [messages, setMessages] = useState([]);
  const [newMsg, setNewMsg]     = useState("");
  const [sending, setSending]   = useState(false);

  const load = () => apiFetch("/messages").then(setMessages).catch(()=>{});
  useEffect(()=>{ load(); apiFetch("/messages/read",{method:"POST"}).catch(()=>{}); },[]);

  const send = async () => {
    if (!newMsg.trim()) return;
    setSending(true);
    await apiFetch("/messages",{method:"POST",body:JSON.stringify({message:newMsg})});
    setNewMsg(""); load(); setSending(false);
  };

  return (
    <div style={{display:"flex",flexDirection:"column",height:"calc(100vh - 120px)",background:"#fff",borderRadius:10,boxShadow:"0 1px 4px rgba(0,0,0,0.08)"}}>
      <div style={{padding:"14px 20px",borderBottom:"1px solid #edf2f7",fontWeight:600,fontSize:14}}>💬 Messages with Eastlake Mailbox</div>
      <div style={{flex:1,overflowY:"auto",padding:16,display:"flex",flexDirection:"column",gap:10}}>
        {messages.length===0 && <div style={{textAlign:"center",color:"#718096",marginTop:40,fontSize:14}}>No messages yet. Say hello!</div>}
        {messages.map(m=>(
          <div key={m.id} style={{display:"flex",justifyContent:m.sender_type==="client"?"flex-end":"flex-start"}}>
            <div style={{maxWidth:"70%",padding:"10px 14px",borderRadius:12,
              background:m.sender_type==="client"?"#4299e1":"#f7fafc",
              color:m.sender_type==="client"?"#fff":"#1a202c",fontSize:13}}>
              {m.sender_type==="admin" && <div style={{fontSize:11,fontWeight:600,marginBottom:4,opacity:0.7}}>Eastlake Mailbox</div>}
              {m.message}
              <div style={{fontSize:10,opacity:0.6,marginTop:4}}>{m.created_at?.slice(0,16)}</div>
            </div>
          </div>
        ))}
      </div>
      <div style={{padding:16,borderTop:"1px solid #edf2f7",display:"flex",gap:10}}>
        <input value={newMsg} onChange={e=>setNewMsg(e.target.value)} onKeyDown={e=>e.key==="Enter"&&send()} placeholder="Type a message..." style={{...inputStyle,flex:1}}/>
        <button onClick={send} disabled={sending} style={btnStyle}>Send</button>
      </div>
    </div>
  );
}

function ProfileView({ apiFetch, user }) {
  const [form, setForm] = useState({display_name:user.name,phone:"",forwarding_address:""});
  const [loaded, setLoaded] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(()=>{
    apiFetch("/client/profile").then(d=>{
      setForm({display_name:d.display_name||user.name,phone:d.phone||"",forwarding_address:d.forwarding_address||""});
      setLoaded(true);
    }).catch(()=>setLoaded(true));
  },[]);

  const save = async () => {
    try { await apiFetch("/client/profile",{method:"PUT",body:JSON.stringify(form)}); setMsg("✅ Profile updated!"); }
    catch(e) { setMsg("Error: "+e.message); }
  };

  if (!loaded) return <div style={{color:"#718096"}}>Loading...</div>;
  return (
    <div>
      <h2 style={h2Style}>My Profile</h2>
      <div style={{background:"#fff",borderRadius:10,padding:24,boxShadow:"0 1px 4px rgba(0,0,0,0.08)",maxWidth:520}}>
        <div style={{marginBottom:16}}>
          <label style={labelStyle}>Full Name</label>
          <input value={form.display_name} onChange={e=>setForm({...form,display_name:e.target.value})} style={inputStyle}/>
        </div>
        <div style={{marginBottom:16}}>
          <label style={labelStyle}>Email</label>
          <input value={user.email} disabled style={{...inputStyle,background:"#f7fafc",color:"#718096"}}/>
        </div>
        <div style={{marginBottom:16}}>
          <label style={labelStyle}>Phone</label>
          <input value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} style={inputStyle} placeholder="e.g. 206-555-1234"/>
        </div>
        <div style={{marginBottom:20}}>
          <label style={labelStyle}>Default Forwarding Address</label>
          <textarea value={form.forwarding_address} onChange={e=>setForm({...form,forwarding_address:e.target.value})} style={{...inputStyle,height:80,resize:"vertical"}} placeholder="Your home or business address for mail forwarding"/>
        </div>
        {msg && <p style={{color:msg.startsWith("✅")?"#48bb78":"#e53e3e",fontSize:13,marginBottom:12}}>{msg}</p>}
        <button onClick={save} style={btnStyle}>Save Profile</button>
      </div>
    </div>
  );
}

const InfoRow = ({label,value}) => (
  <div><div style={{fontSize:11,fontWeight:600,color:"#718096",textTransform:"uppercase",marginBottom:2}}>{label}</div><div style={{fontSize:14,color:"#1a202c"}}>{value}</div></div>
);

const inputStyle  = {width:"100%",padding:"8px 12px",border:"1px solid #e2e8f0",borderRadius:6,fontSize:13,boxSizing:"border-box",outline:"none",fontFamily:"inherit"};
const selectStyle = {width:"100%",padding:"8px 12px",border:"1px solid #e2e8f0",borderRadius:6,fontSize:13,background:"#fff",outline:"none",fontFamily:"inherit"};
const btnStyle    = {padding:"9px 18px",background:"#4299e1",color:"#fff",border:"none",borderRadius:6,cursor:"pointer",fontSize:13,fontWeight:500,fontFamily:"inherit"};
const btnOutline  = {padding:"9px 18px",background:"#fff",color:"#4a5568",border:"1px solid #e2e8f0",borderRadius:6,cursor:"pointer",fontSize:13,fontFamily:"inherit"};
const labelStyle  = {fontSize:12,fontWeight:500,color:"#4a5568",display:"block",marginBottom:4};
const h2Style     = {fontSize:20,fontWeight:700,color:"#1a202c",marginBottom:20};
const STATUS_COLORS = {New:"#4299e1",Opened:"#48bb78",Active:"#48bb78",Pending:"#ed8936",Approved:"#48bb78",Rejected:"#e53e3e",Completed:"#718096",Forward:"#9f7aea",Shred:"#e53e3e",Pickup:"#ed8936"};
const StatusBadge = ({s}) => <span style={{padding:"2px 8px",borderRadius:10,fontSize:11,fontWeight:600,background:(STATUS_COLORS[s]||"#718096")+"22",color:STATUS_COLORS[s]||"#718096"}}>{s}</span>;

export default ClientPortal;

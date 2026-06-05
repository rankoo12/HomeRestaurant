/* ============================================================
   HOME RESTAURANT — app shell (nav, footer, context)
   ============================================================ */
const { createContext, useContext, useState, useEffect, useRef } = React;

const AppCtx = createContext(null);
const useApp = ()=>useContext(AppCtx);

/* ---------------- top navigation ---------------- */
function Nav(){
  const { go, screen, role, setRole, bookings } = useApp();
  const guestLinks = [
    {id:"home", label:"Browse"},
    {id:"bookings", label:"My dinners"},
  ];
  const hostLinks = [
    {id:"dashboard", label:"Dashboard"},
    {id:"ai", label:"Menu Assistant"},
  ];
  const links = role==="host"? hostLinks : guestLinks;
  const upcoming = bookings.filter(b=>b.status==="upcoming").length;

  return (
    <header style={{position:"sticky", top:0, zIndex:50,
      background:"var(--nav-bg)", backdropFilter:"blur(14px)",
      borderBottom:"1px solid var(--line)"}}>
      <div className="wrap row" style={{height:72, gap:22}}>
        <button onClick={()=>go(role==="host"?"dashboard":"home")} style={{background:"none",border:0,padding:0}}>
          <Logo size={20}/>
        </button>

        {/* center links */}
        <nav className="row grow" style={{gap:6, justifyContent:"center"}}>
          {links.map(l=>(
            <button key={l.id} onClick={()=>go(l.id)}
              style={{background:"none",border:0,padding:"8px 14px",borderRadius:99,
                color: screen===l.id?"var(--text)":"var(--text-2)",
                fontSize:14, fontWeight:600, position:"relative"}}>
              {l.label}
              {l.id==="bookings" && upcoming>0 &&
                <span className="badge badge-gold" style={{marginLeft:7, padding:"2px 7px"}}>{upcoming}</span>}
              {screen===l.id &&
                <span style={{position:"absolute",left:14,right:14,bottom:0,height:2,
                  background:"var(--gold)",borderRadius:2}}/>}
            </button>
          ))}
        </nav>

        {/* right actions */}
        <div className="row" style={{gap:12}}>
          {/* role switch */}
          <div className="row" style={{background:"var(--surface)",border:"1px solid var(--line)",
            borderRadius:99, padding:3}}>
            {["guest","host"].map(r=>(
              <button key={r} onClick={()=>{ setRole(r); go(r==="host"?"dashboard":"home"); }}
                style={{border:0, borderRadius:99, padding:"7px 15px", fontSize:12.5, fontWeight:700,
                  letterSpacing:".02em", textTransform:"capitalize",
                  background: role===r?"var(--gold-soft)":"transparent",
                  color: role===r?"var(--gold-2)":"var(--text-3)"}}>
                {r==="guest"?"Dine":"Host"}
              </button>
            ))}
          </div>
          <button onClick={()=>go("bookings")} className="row"
            style={{width:42,height:42,borderRadius:"50%",border:"1px solid var(--line)",
              background:"var(--surface)",justifyContent:"center",color:"var(--text-2)"}}>
            <Icon name="bell" size={18}/>
          </button>
          <button onClick={()=>go("auth")}>
            <Avatar seed={7} name="Noa Ben-David" size={42} ring/>
          </button>
        </div>
      </div>
    </header>
  );
}

/* ---------------- footer ---------------- */
function Footer(){
  const { go } = useApp();
  const cols = [
    {h:"Discover", items:["Browse dinners","Cuisines","Cities","Gift a seat"]},
    {h:"Hosting", items:["Become a host","Host resources","Menu Assistant","Community"]},
    {h:"Trust & safety", items:["How verification works","Food safety","Cancellation policy","Help center"]},
  ];
  return (
    <footer style={{borderTop:"1px solid var(--line)", marginTop:90, background:"var(--bg-2)"}}>
      <div className="wrap" style={{padding:"56px 32px 40px"}}>
        <div style={{display:"grid", gridTemplateColumns:"1.4fr 1fr 1fr 1fr", gap:40}}>
          <div className="col" style={{gap:16, maxWidth:280}}>
            <Logo size={19}/>
            <p className="muted" style={{fontSize:13.5, lineHeight:1.6}}>
              Authentic home-cooked dinners, hosted by verified chefs in their own kitchens.
              Find a seat at someone's table tonight.
            </p>
            <div className="row" style={{gap:10}}>
              <span className="badge badge-verified"><Icon name="shield" size={13} stroke={1.8}/> Verified hosts</span>
              <span className="badge badge-gold"><Icon name="lock" size={12} stroke={1.8}/> Secure pay</span>
            </div>
          </div>
          {cols.map(c=>(
            <div key={c.h} className="col" style={{gap:13}}>
              <div className="kicker" style={{color:"var(--text-3)"}}>{c.h}</div>
              {c.items.map(it=>(
                <button key={it} onClick={()=>go("home")}
                  style={{background:"none",border:0,padding:0,textAlign:"left",
                    color:"var(--text-2)",fontSize:13.5}}>{it}</button>
              ))}
            </div>
          ))}
        </div>
        <div className="hr" style={{margin:"36px 0 20px"}}/>
        <div className="row" style={{justifyContent:"space-between", fontSize:12.5, color:"var(--text-3)"}}>
          <span>© 2026 Home Restaurant · Inbar Halutzy & Ran Eckstein</span>
          <span className="row" style={{gap:18}}>
            <a>Privacy</a><a>Terms</a><a>Food-safety policy</a>
          </span>
        </div>
      </div>
    </footer>
  );
}

Object.assign(window,{ AppCtx, useApp, Nav, Footer });

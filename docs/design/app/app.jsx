/* ============================================================
   HOME RESTAURANT — app router
   ============================================================ */
const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "theme": "Warm",
  "accent": "#C25A33",
  "display": "Bodoni Moda",
  "homeLayout": "Editorial"
}/*EDITMODE-END*/;

function HomeVariantToggle({variant,setVariant}){
  return (
    <div style={{position:"fixed", left:"50%", bottom:24, transform:"translateX(-50%)", zIndex:60}}>
      <div className="row" style={{background:"var(--float-bg)", backdropFilter:"blur(12px)",
        border:"1px solid var(--line-strong)", borderRadius:99, padding:5, gap:4, boxShadow:"var(--shadow-pop)"}}>
        <span className="dim" style={{fontSize:11.5, fontWeight:700, letterSpacing:".1em",
          textTransform:"uppercase", padding:"0 12px"}}>Home layout</span>
        {["Editorial","Discovery"].map(k=>(
          <button key={k} onClick={()=>setVariant(k)}
            style={{border:0, borderRadius:99, padding:"9px 18px", fontSize:13, fontWeight:600,
              background: variant===k?"var(--gold)":"transparent",
              color: variant===k?"var(--on-gold)":"var(--text-2)"}}>{k}</button>
        ))}
      </div>
    </div>
  );
}

function Placeholder({title}){
  return (
    <div className="wrap screen-enter" style={{padding:"80px 32px", minHeight:"60vh"}}>
      <div className="card col" style={{padding:60, alignItems:"center", gap:14, textAlign:"center"}}>
        <Icon name="sparkle" size={32} style={{color:"var(--gold)"}}/>
        <h2 className="serif" style={{fontSize:26}}>{title}</h2>
        <p className="muted">This screen is being built next.</p>
      </div>
    </div>
  );
}

function App(){
  const [t,setTweak]=useTweaks(TWEAK_DEFAULTS);
  const [screen,setScreen]=useState("home");
  const [params,setParams]=useState({});
  const [role,setRole]=useState("guest");
  const [bookings,setBookings]=useState(MY_BOOKINGS);

  const variant = t.homeLayout==="Discovery" ? "B" : "A";
  const setVariant = (label)=>setTweak("homeLayout", label);

  const go=(s,p={})=>{ setScreen(s); setParams(p); window.scrollTo(0,0); };
  const addBooking=(b)=>setBookings(prev=>[{...b},...prev]);

  useEffect(()=>{
    document.documentElement.dataset.theme = t.theme==="Dark" ? "dark" : "light";
  },[t.theme]);

  useEffect(()=>{
    document.documentElement.style.setProperty("--gold", t.accent);
    document.documentElement.style.setProperty("--serif", '"'+t.display+'", "Playfair Display", Georgia, serif');
  },[t.accent, t.display]);

  const ctx={ go, screen, params, role, setRole, variant, setVariant, bookings, addBooking };

  let view;
  switch(screen){
    case "home":      view = variant==="A"? <HomeA go={go}/> : <HomeB go={go}/>; break;
    case "event":     view = <EventScreen go={go} eventId={params.eventId}/>; break;
    case "chef":      view = <ChefScreen go={go} chefId={params.chefId}/>; break;
    case "checkout":  view = <CheckoutScreen go={go} params={params}/>; break;
    case "confirm":   view = <ConfirmScreen go={go} params={params}/>; break;
    case "bookings":  view = <BookingsScreen go={go}/>; break;
    case "auth":      view = <AuthScreen go={go}/>; break;
    case "dashboard": view = <DashboardScreen go={go}/>; break;
    case "ai":        view = <AIScreen go={go}/>; break;
    default:          view = <Placeholder title={screen}/>;
  }

  const fullbleed = screen==="auth";

  return (
    <AppCtx.Provider value={ctx}>
      {!fullbleed && <Nav/>}
      <main>{view}</main>
      {!fullbleed && screen!=="checkout" && screen!=="ai" && <Footer/>}
      {screen==="home" && <HomeVariantToggle variant={t.homeLayout} setVariant={setVariant}/>}

      <TweaksPanel title="Tweaks">
        <TweakSection label="Theme"/>
        <TweakRadio label="Mood" value={t.theme}
          options={["Warm","Dark"]}
          onChange={(v)=>setTweak("theme",v)}/>
        <TweakColor label="Accent" value={t.accent}
          options={["#C25A33","#BC3A2C","#C68A2A","#5E7A47","#8E4A5C"]}
          onChange={(v)=>setTweak("accent",v)}/>
        <TweakRadio label="Display type" value={t.display}
          options={["Bodoni Moda","Playfair Display"]}
          onChange={(v)=>setTweak("display",v)}/>
        <TweakSection label="Home page"/>
        <TweakRadio label="Layout" value={t.homeLayout}
          options={["Editorial","Discovery"]}
          onChange={(v)=>{ setTweak("homeLayout",v); setScreen("home"); }}/>
      </TweaksPanel>
    </AppCtx.Provider>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App/>);

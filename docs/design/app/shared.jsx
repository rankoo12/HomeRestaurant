/* ============================================================
   HOME RESTAURANT — shared UI primitives
   ============================================================ */

/* ---------- icons (monoline) ---------- */
const ICONS = {
  search:"M11 4a7 7 0 1 0 4.95 11.95l4.55 4.55M11 4a7 7 0 0 1 4.95 11.95",
  star:"M12 3.5l2.6 5.27 5.82.85-4.21 4.1.99 5.79L12 16.77 6.8 19.5l.99-5.79-4.21-4.1 5.82-.85z",
  pin:"M12 21s7-5.7 7-11a7 7 0 1 0-14 0c0 5.3 7 11 7 11zM12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z",
  clock:"M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7.5V12l3 2",
  users:"M16 19v-1.5A3.5 3.5 0 0 0 12.5 14h-5A3.5 3.5 0 0 0 4 17.5V19M10 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM20 19v-1.5a3.5 3.5 0 0 0-2.6-3.38M15.5 5.2a3 3 0 0 1 0 5.6",
  check:"M5 12.5l4.2 4.2L19 7",
  shield:"M12 3l7 3v5c0 4.5-3 7.6-7 9-4-1.4-7-4.5-7-9V6l7-3zM9 11.8l2 2 4-4",
  heart:"M12 20s-7-4.4-9.2-8.3C1.3 9 2.3 5.7 5.4 5.1 7.3 4.7 9 5.6 12 8.2c3-2.6 4.7-3.5 6.6-3.1 3.1.6 4.1 3.9 2.6 6.6C19 15.6 12 20 12 20z",
  cal:"M4 7h16v13H4zM4 7l0-2h16v2M8 3v4M16 3v4M8 12h3M8 16h8",
  arrow:"M5 12h14M13 6l6 6-6 6",
  chevR:"M9 5l7 7-7 7",
  chevL:"M15 5l-7 7 7 7",
  chevD:"M5 9l7 7 7-7",
  plus:"M12 5v14M5 12h14",
  minus:"M5 12h14",
  sparkle:"M12 3l1.8 5.5L19 10l-5.2 1.5L12 17l-1.8-5.5L5 10l5.2-1.5zM18.5 14l.8 2.4L21.5 17l-2.2.6-.8 2.4-.8-2.4L15.5 17l2.2-.6z",
  bell:"M18 16V11a6 6 0 1 0-12 0v5l-2 2.5h16zM10 20a2 2 0 0 0 4 0",
  lock:"M6 11h12v9H6zM8.5 11V8a3.5 3.5 0 1 1 7 0v3",
  card:"M3 7h18v11H3zM3 10.5h18",
  leaf:"M5 19c0-8 6-13 14-13 0 9-5 14-14 14M5 19c2-4 5-6 9-7.5",
  flame:"M12 3c.5 3-1.5 4.5-3 6.5-2 2.6-1 6 .5 7.5-1-2 1.5-3.5 2.5-5 .8 1.2 1.5 1.5 2 3 1.5-1.2 2.5-3.5 1.5-6.5C18 8 13 7 12 3z",
  plate:"M12 21a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z",
  wheat:"M12 4v17M12 8c-2-1-3.5-.5-4 1 2 .8 3 .5 4-1zm0 0c2-1 3.5-.5 4 1-2 .8-3 .5-4-1zm0 5c-2-1-3.5-.5-4 1 2 .8 3 .5 4-1zm0 0c2-1 3.5-.5 4 1-2 .8-3 .5-4-1z",
  fish:"M3 12c3-4 7-5 10-5 4 0 7 2 8 5-1 3-4 5-8 5-3 0-7-1-10-5zm14-1.5h.01",
  pepper:"M14 7c0-2 1.5-3 3-3-.5 2 0 3-1 4 1.5 1 2 3 1 5-1.5 3-5 4-7 4-3 0-5-2-5-4 0-3 4-6 9-6z",
  edit:"M4 20h4L19 9l-4-4L4 16zM14 6l4 4",
  trash:"M5 7h14M9 7V5h6v2M7 7l1 13h8l1-13",
  chart:"M5 19V9M10 19V5M15 19v-7M20 19v-11",
  cam:"M4 8h3l1.5-2h7L17 8h3v11H4zM12 16.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z",
  globe:"M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM3 12h18M12 3c2.5 2.5 3.5 6 3.5 9s-1 6.5-3.5 9c-2.5-2.5-3.5-6-3.5-9S9.5 5.5 12 3z",
  message:"M4 5h16v11H9l-4 4V5z",
  back:"M10 5l-7 7 7 7M3 12h18",
};
function Icon({name, size=20, stroke=1.6, fill=false, style={}}){
  const d=ICONS[name]||"";
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={fill?"currentColor":"none"}
      stroke={fill?"none":"currentColor"} strokeWidth={stroke} strokeLinecap="round"
      strokeLinejoin="round" style={{flexShrink:0,...style}} aria-hidden="true">
      <path d={d}/>
    </svg>
  );
}

/* ---------- brand wordmark ---------- */
function Logo({size=20, mono=false}){
  return (
    <div className="row" style={{gap:10}}>
      <svg width={size+8} height={size+8} viewBox="0 0 32 32" fill="none" aria-hidden="true">
        <path d="M5 15 L16 5 L27 15" stroke={mono?"currentColor":"var(--gold)"} strokeWidth="2"
          strokeLinecap="round" strokeLinejoin="round"/>
        <circle cx="16" cy="20" r="4.2" stroke={mono?"currentColor":"var(--gold)"} strokeWidth="2"/>
        <path d="M16 14.5v1.4M16 24.1v1.4M11.8 20h-1.4M21.6 20h-1.4"
          stroke={mono?"currentColor":"var(--gold-2)"} strokeWidth="1.6" strokeLinecap="round"/>
      </svg>
      <div style={{fontFamily:"var(--serif)", fontSize:size, lineHeight:1, letterSpacing:".01em"}}>
        Home <span style={{fontStyle:"italic", color: mono?"inherit":"var(--gold-2)"}}>Restaurant</span>
      </div>
    </div>
  );
}

/* ---------- food image placeholder ----------
   Warm duotone gradients + monoline glyph. Reads as a deliberate
   editorial photo treatment, fully self-contained.                */
const FOOD_GRADS = [
  ["#5a2110","#9c3a18","#dc6322","#f3a445"], // jollof / tomato-saffron
  ["#4a2e0c","#8a5a18","#cf9a2c","#f0c766"], // golden pasta / brodo
  ["#2a1107","#6e2812","#aa3f1c","#d97a3b"], // mole / chili-cocoa
  ["#16271b","#33502f","#6f9450","#aecb7e"], // kaiseki / herb-jade
  ["#2a0f1c","#5e2236","#9c3a56","#cf6a82"], // plum / beet
  ["#3a2208","#7a4d14","#c5882a","#edc069"], // bread / honey amber
  ["#16180c","#3c4418","#7d8f38","#b8c266"], // pesto / olive
  ["#381407","#8a3210","#d96a22","#f29a40"], // paprika / charred
];
const FOOD_GLYPHS = ["plate","leaf","flame","wheat","fish","pepper"];
function FoodImage({seed=0, children, glyph=true, style={}, vignette=true}){
  const g = FOOD_GRADS[seed % FOOD_GRADS.length];
  const gl = FOOD_GLYPHS[(seed*3) % FOOD_GLYPHS.length];
  const ang = 120 + (seed*37)%90;
  const cx = 38 + (seed*11)%26;
  return (
    <div style={{
      position:"relative", overflow:"hidden", width:"100%", height:"100%",
      background:`
        radial-gradient(48% 46% at 50% 46%, ${g[3]} 0%, ${g[2]} 40%, transparent 70%),
        radial-gradient(130% 100% at ${cx}% 16%, ${g[2]}44, transparent 54%),
        radial-gradient(120% 120% at 84% 108%, ${g[0]}, transparent 56%),
        linear-gradient(${ang}deg, ${g[0]} 0%, ${g[1]} 100%)`,
      ...style,
    }}>
      {glyph &&
        <svg width="40%" height="40%" viewBox="0 0 24 24" fill="none"
          stroke={g[3]} strokeWidth="0.55" strokeLinecap="round" strokeLinejoin="round"
          style={{position:"absolute", left:"50%", top:"50%", transform:"translate(-50%,-50%)", opacity:.20}}>
          <path d={ICONS[gl]}/>
        </svg>}
      {vignette &&
        <div style={{position:"absolute", inset:0,
          background:"radial-gradient(130% 110% at 50% 30%, transparent 52%, rgba(0,0,0,.42))"}}/>}
      {children}
    </div>
  );
}

/* ---------- avatar ---------- */
function Avatar({seed=0, name="", size=44, ring=false}){
  const g = FOOD_GRADS[(seed+2) % FOOD_GRADS.length];
  const initials = name.split(" ").map(s=>s[0]).slice(0,2).join("");
  return (
    <div style={{
      width:size, height:size, borderRadius:"50%", flexShrink:0,
      display:"grid", placeItems:"center",
      background:`radial-gradient(circle at 36% 30%, ${g[2]}, ${g[1]} 55%, ${g[0]})`,
      color:g[3], fontFamily:"var(--serif)", fontSize:size*0.4,
      border: ring?"2px solid var(--gold-line)":"1px solid rgba(255,255,255,.14)",
      boxShadow: ring?"0 0 0 3px var(--gold-soft)":"none",
    }}>{initials}</div>
  );
}

/* ---------- star rating ---------- */
function Stars({value=5, size=14}){
  return (
    <span className="stars" style={{fontSize:0}}>
      {[1,2,3,4,5].map(i=>(
        <Icon key={i} name="star" size={size} fill={i<=Math.round(value)}
          stroke={1.4} style={{color: i<=Math.round(value)?"var(--gold)":"var(--text-3)"}}/>
      ))}
    </span>
  );
}

/* ---------- seats meter ---------- */
function SeatsMeter({left, total}){
  const pct = Math.round(((total-left)/total)*100);
  const low = left<=3;
  return (
    <div className="col" style={{gap:6, minWidth:120}}>
      <div className="row" style={{justifyContent:"space-between", fontSize:12.5, fontWeight:600}}>
        <span style={{color: low?"var(--terra)":"var(--text-2)"}}>
          {low? `Only ${left} seats left` : `${left} of ${total} open`}
        </span>
      </div>
      <div style={{height:5, borderRadius:99, background:"var(--surface-3)", overflow:"hidden"}}>
        <div style={{height:"100%", width:pct+"%", borderRadius:99,
          background: low?"linear-gradient(90deg,var(--terra),#e07a4f)":"linear-gradient(90deg,var(--gold),var(--gold-2))"}}/>
      </div>
    </div>
  );
}

/* ---------- price tag ---------- */
function Price({value, suffix="/ seat", big=false}){
  return (
    <div className="row" style={{alignItems:"baseline", gap:5}}>
      <span style={{fontFamily:"var(--serif)", fontSize: big?34:19, lineHeight:1}}>${value}</span>
      <span className="dim" style={{fontSize: big?14:12.5}}>{suffix}</span>
    </div>
  );
}

/* ---------- stepper ---------- */
function Stepper({value, onChange, min=1, max=99}){
  const btn = (dir)=>(
    <button onClick={()=>onChange(Math.max(min,Math.min(max,value+dir)))}
      disabled={dir<0?value<=min:value>=max}
      style={{width:38,height:38,borderRadius:"50%",border:"1px solid var(--line-strong)",
        background:"transparent",color:"var(--text)",display:"grid",placeItems:"center",
        opacity:(dir<0?value<=min:value>=max)?.35:1}}>
      <Icon name={dir<0?"minus":"plus"} size={16}/>
    </button>
  );
  return (
    <div className="row" style={{gap:14}}>
      {btn(-1)}
      <span className="tnum" style={{fontFamily:"var(--serif)", fontSize:20, minWidth:22, textAlign:"center"}}>{value}</span>
      {btn(1)}
    </div>
  );
}

/* ---------- verified pill ---------- */
function VerifiedPill(){
  return <span className="badge badge-verified"><Icon name="shield" size={13} stroke={1.8}/> Verified host</span>;
}

Object.assign(window,{ Icon, ICONS, Logo, FoodImage, FOOD_GRADS, Avatar, Stars, SeatsMeter, Price, Stepper, VerifiedPill });

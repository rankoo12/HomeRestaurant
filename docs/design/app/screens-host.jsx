/* ============================================================
   HOME RESTAURANT — host: dashboard + AI menu assistant
   ============================================================ */

/* ---------------- CHEF DASHBOARD ---------------- */
function KPI({label,value,sub,ic,accent}){
  return (
    <div className="card col" style={{padding:22, gap:12}}>
      <div className="row" style={{justifyContent:"space-between"}}>
        <span className="dim" style={{fontSize:13}}>{label}</span>
        <div className="row" style={{width:34,height:34,borderRadius:10,
          background: accent?"var(--gold-soft)":"var(--surface-2)",
          color: accent?"var(--gold-2)":"var(--text-2)", justifyContent:"center"}}>
          <Icon name={ic} size={17}/></div>
      </div>
      <span className="serif" style={{fontSize:32, lineHeight:1}}>{value}</span>
      <span className="row" style={{gap:6, fontSize:12.5, color:"var(--sage)"}}>{sub}</span>
    </div>
  );
}

function DashboardScreen({go}){
  const chef = chefById("amara");
  const evs = eventsByChef("amara");
  const payouts=[
    {d:"Jun 2", ev:"Sunday Jollof & Suya Table", amt:476, status:"Paid"},
    {d:"May 26", ev:"Friday Small-Plates & Highlife", amt:324, status:"Paid"},
    {d:"May 19", ev:"Sunday Jollof & Suya Table", amt:544, status:"Paid"},
  ];
  return (
    <div className="screen-enter wrap" style={{paddingTop:36, paddingBottom:60}}>
      {/* header */}
      <div className="row" style={{justifyContent:"space-between", alignItems:"flex-end", marginBottom:28}}>
        <div className="row" style={{gap:18}}>
          <Avatar seed={chef.avatarSeed} name={chef.name} size={64} ring/>
          <div className="col" style={{gap:5}}>
            <div className="kicker">Host dashboard</div>
            <h1 className="serif" style={{fontSize:34}}>Your kitchen, {chef.name.split(" ")[0]}</h1>
          </div>
        </div>
        <div className="row" style={{gap:12}}>
          <button className="btn btn-ghost" onClick={()=>go("ai")}><Icon name="sparkle" size={17}/> Menu Assistant</button>
          <button className="btn btn-gold"><Icon name="plus" size={17}/> Create a dinner</button>
        </div>
      </div>

      {/* KPIs */}
      <div style={{display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:18, marginBottom:30}}>
        <KPI label="Upcoming dinners" value="2" sub={<><Icon name="cal" size={13}/> Next: Sun, Jun 7</>} ic="cal" accent/>
        <KPI label="Seats sold this week" value="12" sub={<><Icon name="arrow" size={13} style={{transform:"rotate(-45deg)"}}/> 3 from yesterday</>} ic="users"/>
        <KPI label="Earnings (30 days)" value="$1,344" sub={<><Icon name="arrow" size={13} style={{transform:"rotate(-45deg)"}}/> +18% vs last</>} ic="card"/>
        <KPI label="Host rating" value={chef.rating} sub={<><Icon name="star" size={13} fill/> {chef.reviews} reviews</>} ic="star"/>
      </div>

      <div style={{display:"grid", gridTemplateColumns:"1fr 340px", gap:30, alignItems:"start"}}>
        {/* events table */}
        <div className="col" style={{gap:18}}>
          <div className="row" style={{justifyContent:"space-between"}}>
            <h2 className="serif" style={{fontSize:23}}>Your dinners</h2>
            <div className="row" style={{gap:8}}>
              <button className="chip active" style={{height:32}}>Published</button>
              <button className="chip" style={{height:32}}>Drafts</button>
              <button className="chip" style={{height:32}}>Past</button>
            </div>
          </div>
          <div className="card col" style={{padding:0, overflow:"hidden"}}>
            {evs.map((ev,i)=>{
              const filled = ev.seatsTotal-ev.seatsLeft;
              const pct=Math.round(filled/ev.seatsTotal*100);
              return (
                <div key={ev.id} className="row" style={{padding:18, gap:18, alignItems:"center",
                  borderBottom: i<evs.length-1?"1px solid var(--line)":"none"}}>
                  <div style={{width:64,height:64,borderRadius:11,overflow:"hidden",flexShrink:0}}><FoodImage seed={ev.seed}/></div>
                  <div className="col grow" style={{gap:5}}>
                    <span className="serif" style={{fontSize:17}}>{ev.title}</span>
                    <span className="row dim" style={{gap:7, fontSize:12.5}}><Icon name="cal" size={13}/> {ev.date} · {ev.time}</span>
                  </div>
                  <div className="col" style={{minWidth:140, gap:6}}>
                    <span style={{fontSize:13, fontWeight:600}}>{filled}/{ev.seatsTotal} seats sold</span>
                    <div style={{height:5,borderRadius:99,background:"var(--surface-3)",overflow:"hidden"}}>
                      <div style={{height:"100%",width:pct+"%",background:"linear-gradient(90deg,var(--gold),var(--gold-2))",borderRadius:99}}/>
                    </div>
                  </div>
                  <span className="serif" style={{fontSize:17, minWidth:70, textAlign:"right"}}>${ev.price*filled}</span>
                  <div className="row" style={{gap:6}}>
                    <button className="row" style={{width:36,height:36,borderRadius:9,border:"1px solid var(--line)",
                      background:"transparent",color:"var(--text-2)",justifyContent:"center"}} onClick={()=>go("event",{eventId:ev.id})}><Icon name="edit" size={16}/></button>
                    <button className="row" style={{width:36,height:36,borderRadius:9,border:"1px solid var(--line)",
                      background:"transparent",color:"var(--text-2)",justifyContent:"center"}}><Icon name="chart" size={16}/></button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* recent guests / reviews */}
          <h2 className="serif" style={{fontSize:23, marginTop:8}}>Recent reviews</h2>
          <div className="col" style={{gap:14}}>
            {REVIEWS.filter(r=>r.chef==="amara").map(rv=>(
              <div key={rv.id} className="card row" style={{padding:18, gap:14, alignItems:"flex-start"}}>
                <Avatar seed={rv.seed} name={rv.author} size={40}/>
                <div className="col" style={{gap:6}}>
                  <div className="row" style={{gap:9}}>
                    <span style={{fontWeight:600, fontSize:14}}>{rv.author}</span>
                    <Stars value={rv.rating} size={12}/>
                    <span className="dim" style={{fontSize:12}}>{rv.date}</span>
                  </div>
                  <p className="muted" style={{fontSize:13.5, lineHeight:1.6}}>"{rv.text}"</p>
                  <button className="row" style={{background:"none",border:0,color:"var(--gold-2)",fontSize:12.5,gap:6,padding:0}}>
                    <Icon name="message" size={13}/> Reply</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* sidebar */}
        <div className="col" style={{gap:20, position:"sticky", top:96}}>
          {/* next dinner */}
          <div className="card col" style={{padding:0, overflow:"hidden"}}>
            <div style={{height:120, position:"relative"}}>
              <FoodImage seed={evs[0].seed} glyph={false}/>
              <div style={{position:"absolute",inset:0,background:"linear-gradient(180deg,transparent,rgba(16,12,9,.85))"}}/>
              <div className="col" style={{position:"absolute",left:18,bottom:14,gap:3, color:"#F6EFE2"}}>
                <span className="kicker" style={{fontSize:10, color:"#F2BE72"}}>Next dinner</span>
                <span className="serif" style={{fontSize:17}}>{evs[0].date} · {evs[0].time}</span>
              </div>
            </div>
            <div className="col" style={{padding:18, gap:12}}>
              <div className="row" style={{justifyContent:"space-between", fontSize:13.5}}>
                <span className="muted">Guests confirmed</span><span><b>{evs[0].seatsTotal-evs[0].seatsLeft}</b> of {evs[0].seatsTotal}</span>
              </div>
              <div className="row" style={{justifyContent:"space-between", fontSize:13.5}}>
                <span className="muted">Dietary notes</span><span>2 flagged</span>
              </div>
              <button className="btn btn-solid btn-block btn-sm"><Icon name="users" size={15}/> View guest list</button>
            </div>
          </div>

          {/* payouts */}
          <div className="card col" style={{padding:20, gap:14}}>
            <div className="row" style={{justifyContent:"space-between"}}>
              <span style={{fontWeight:700, fontSize:14}}>Recent payouts</span>
              <Icon name="card" size={16} style={{color:"var(--gold)"}}/>
            </div>
            {payouts.map((p,i)=>(
              <div key={i} className="row" style={{justifyContent:"space-between", fontSize:13}}>
                <div className="col">
                  <span style={{fontWeight:500}}>{p.ev.length>22?p.ev.slice(0,22)+"…":p.ev}</span>
                  <span className="dim" style={{fontSize:11.5}}>{p.d}</span>
                </div>
                <div className="col" style={{alignItems:"flex-end"}}>
                  <span className="serif" style={{fontSize:15}}>${p.amt}</span>
                  <span className="badge badge-verified" style={{padding:"1px 7px",fontSize:10}}>{p.status}</span>
                </div>
              </div>
            ))}
            <button className="dim" style={{background:"none",border:0,fontSize:12.5,alignSelf:"center"}}>View all payouts →</button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------- AI MENU ASSISTANT ---------------- */
function AIScreen({go}){
  const chef = chefById("amara");
  const [dish,setDish]=useState("Party Jollof Rice");
  const [ingredients,setIngredients]=useState("long-grain rice, scotch bonnet, smoked paprika, tomato, red bell pepper, bay leaf, thyme");
  const [tone,setTone]=useState("Warm & evocative");
  const [loading,setLoading]=useState(false);
  const [out,setOut]=useState(null);
  const [shown,setShown]=useState("");

  const generate=()=>{
    setLoading(true); setOut(null); setShown("");
    setTimeout(()=>{
      const ings = ingredients.split(",").map(s=>s.trim()).filter(Boolean);
      const lead = {
        "Warm & evocative":"Cooked low and slow until the grains drink up every drop,",
        "Punchy & short":"Smoky. Spicy. The dish that started arguments.",
        "Refined & restrained":"A study in restraint and smoke,",
      }[tone];
      const desc = tone==="Punchy & short"
        ? `${lead} our ${dish.toLowerCase()} leans on ${ings[1]||"scotch bonnet"} and ${ings[2]||"smoked paprika"}. Come hungry.`
        : `${lead} this ${dish.toLowerCase()} carries the deep, smoky heat of ${ings[1]||"scotch bonnet"} and ${ings[2]||"smoked paprika"}, built on a base of slow-blistered ${ings[3]||"tomato"} and ${ings[4]||"red pepper"}. Finished with ${ings[5]||"bay leaf"} and ${ings[6]||"thyme"}, it's the dish my grandmother would recognise from across the room.`;
      const subs=[
        {from:"Scotch bonnet", to:"Fresno chili", why:"Milder heat for sensitive guests"},
        {from:"Shellfish stock", to:"Roasted mushroom dashi", why:"Vegan, keeps the umami depth"},
      ];
      setOut({desc, subs, langs:["English","Español","Français","Yorùbá"]});
      setLoading(false);
    },1500);
  };

  // typewriter reveal
  useEffect(()=>{
    if(!out) return;
    let i=0; const full=out.desc;
    const t=setInterval(()=>{ i+=3; setShown(full.slice(0,i)); if(i>=full.length) clearInterval(t); },14);
    return ()=>clearInterval(t);
  },[out]);

  useEffect(()=>{ generate(); },[]); // first run

  return (
    <div className="screen-enter">
      {/* sub-header */}
      <div style={{borderBottom:"1px solid var(--line)", background:"var(--bg-2)"}}>
        <div className="wrap row" style={{height:70, gap:14, justifyContent:"space-between"}}>
          <button onClick={()=>go("dashboard")} className="row dim" style={{gap:7,background:"none",border:0,fontSize:13}}>
            <Icon name="chevL" size={15}/> Dashboard
          </button>
          <div className="row" style={{gap:10}}>
            <span className="badge badge-gold"><Icon name="sparkle" size={13}/> Runs privately on-device</span>
          </div>
        </div>
      </div>

      <div className="wrap" style={{paddingTop:34, paddingBottom:60}}>
        <div className="col" style={{gap:8, marginBottom:30}}>
          <div className="kicker"><Icon name="sparkle" size={13} style={{display:"inline",verticalAlign:"-2px"}}/> Menu Assistant</div>
          <h1 className="serif" style={{fontSize:36}}>Write a menu that makes people hungry</h1>
          <p className="muted" style={{fontSize:15, maxWidth:600}}>
            Describe your dish in a few ingredients — the assistant drafts a description, suggests allergen-friendly
            swaps, and translates your menu. Your recipes never leave your kitchen.
          </p>
        </div>

        <div style={{display:"grid", gridTemplateColumns:"420px 1fr", gap:30, alignItems:"start"}}>
          {/* input panel */}
          <div className="card col" style={{padding:24, gap:18}}>
            <div className="field"><label>Dish name</label>
              <input className="input" value={dish} onChange={e=>setDish(e.target.value)}/></div>
            <div className="field"><label>Key ingredients <span className="dim">(comma separated)</span></label>
              <textarea className="input" rows="3" value={ingredients} onChange={e=>setIngredients(e.target.value)}></textarea></div>
            <div className="field"><label>Tone</label>
              <div className="row" style={{gap:8, flexWrap:"wrap"}}>
                {["Warm & evocative","Punchy & short","Refined & restrained"].map(t=>(
                  <button key={t} className={"chip"+(tone===t?" active":"")} onClick={()=>setTone(t)} style={{height:34}}>{t}</button>
                ))}
              </div>
            </div>
            <button className="btn btn-gold btn-block btn-lg" onClick={generate} disabled={loading}>
              {loading? <span className="row" style={{gap:9}}><Spinner/> Generating…</span>
                      : <span className="row" style={{gap:9}}><Icon name="sparkle" size={17}/> Generate description</span>}
            </button>
            <p className="dim row" style={{gap:7, fontSize:12, justifyContent:"center"}}>
              <Icon name="lock" size={13}/> Local LLM · zero cost per generation
            </p>
          </div>

          {/* output */}
          <div className="col" style={{gap:20}}>
            <div className="card col" style={{padding:26, gap:16, minHeight:200}}>
              <div className="row" style={{justifyContent:"space-between"}}>
                <span className="kicker">Suggested description</span>
                {out && !loading &&
                  <div className="row" style={{gap:8}}>
                    <button className="btn btn-solid btn-sm" onClick={generate}><Icon name="sparkle" size={14}/> Regenerate</button>
                    <button className="btn btn-solid btn-sm"><Icon name="check" size={14}/> Use this</button>
                  </div>}
              </div>
              {loading
                ? <div className="col" style={{gap:10}}>
                    {[100,92,80].map((w,i)=><div key={i} style={{height:14,width:w+"%",borderRadius:7,
                      background:"linear-gradient(90deg,var(--surface-2),var(--surface-3),var(--surface-2))",
                      backgroundSize:"200% 100%",animation:"shimmer 1.3s linear infinite"}}/>)}
                  </div>
                : <p className="serif" style={{fontSize:21, lineHeight:1.5, fontStyle:"italic", color:"var(--text)"}}>
                    "{shown}<span style={{opacity: shown.length<(out?out.desc.length:0)?1:0, color:"var(--gold)"}}>▌</span>"
                  </p>}
            </div>

            {out && !loading &&
              <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:20}}>
                {/* substitutions */}
                <div className="card col" style={{padding:22, gap:14}}>
                  <span className="row" style={{gap:9, fontWeight:700, fontSize:14}}>
                    <Icon name="leaf" size={17} style={{color:"var(--sage)"}}/> Smart substitutions
                  </span>
                  {out.subs.map((s,i)=>(
                    <div key={i} className="col" style={{gap:4, paddingBottom:i<out.subs.length-1?12:0,
                      borderBottom:i<out.subs.length-1?"1px solid var(--line)":"none"}}>
                      <div className="row" style={{gap:8, fontSize:14}}>
                        <span className="dim" style={{textDecoration:"line-through"}}>{s.from}</span>
                        <Icon name="arrow" size={14} style={{color:"var(--gold)"}}/>
                        <span style={{fontWeight:600}}>{s.to}</span>
                      </div>
                      <span className="dim" style={{fontSize:12.5}}>{s.why}</span>
                    </div>
                  ))}
                </div>
                {/* translations */}
                <div className="card col" style={{padding:22, gap:14}}>
                  <span className="row" style={{gap:9, fontWeight:700, fontSize:14}}>
                    <Icon name="globe" size={17} style={{color:"var(--gold)"}}/> Instant translation
                  </span>
                  <div className="row" style={{gap:8, flexWrap:"wrap"}}>
                    {out.langs.map((l,i)=>(
                      <span key={l} className={"chip"+(i===0?" active":"")} style={{height:32}}>{l}</span>
                    ))}
                  </div>
                  <p className="muted" style={{fontSize:13.5, lineHeight:1.55}}>
                    Menu translated into 4 languages while preserving culinary nuance — no dish loses its name.
                  </p>
                </div>
              </div>}
          </div>
        </div>
      </div>
    </div>
  );
}

const _aiStyle=document.createElement("style");
_aiStyle.textContent="@keyframes shimmer{to{background-position:-200% 0}}";
document.head.appendChild(_aiStyle);

Object.assign(window,{ DashboardScreen, AIScreen, KPI });

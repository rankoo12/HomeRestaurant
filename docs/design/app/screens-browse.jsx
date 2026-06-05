/* ============================================================
   HOME RESTAURANT — browse: cards, search, two home variations
   ============================================================ */

/* ---------------- event card (vertical) ---------------- */
function EventCard({ev, onOpen, compact=false}){
  const chef = chefById(ev.chef);
  const [liked,setLiked]=useState(false);
  return (
    <button onClick={()=>onOpen(ev.id)} className="card fade-up"
      style={{textAlign:"left", padding:0, cursor:"pointer", display:"block", width:"100%",
        transition:"transform .2s ease, border-color .2s", border:"1px solid var(--line)"}}
      onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-4px)";e.currentTarget.style.borderColor="var(--line-strong)";}}
      onMouseLeave={e=>{e.currentTarget.style.transform="none";e.currentTarget.style.borderColor="var(--line)";}}>
      <div style={{position:"relative", aspectRatio: compact?"16/10":"16/11"}}>
        <FoodImage seed={ev.seed}/>
        <div className="row" style={{position:"absolute", top:13, left:13, gap:8}}>
          {ev.seatsLeft<=3 && <span className="badge badge-soon">Almost full</span>}
          {chef.superhost && <span className="badge badge-gold">Superhost</span>}
        </div>
        <div onClick={(e)=>{e.stopPropagation();setLiked(!liked);}}
          style={{position:"absolute", top:11, right:11, width:36,height:36,borderRadius:"50%",
            display:"grid",placeItems:"center",background:"rgba(16,12,9,.5)",backdropFilter:"blur(6px)",
            color: liked?"var(--terra)":"#fff", border:"1px solid rgba(255,255,255,.18)"}}>
          <Icon name="heart" size={17} fill={liked}/>
        </div>
        <div className="row" style={{position:"absolute", left:13, bottom:13, gap:9}}>
          <Avatar seed={chef.avatarSeed} name={chef.name} size={34}/>
          <div className="col">
            <span style={{fontSize:13, fontWeight:600, color:"#fff", whiteSpace:"nowrap"}}>{chef.name}</span>
            <span style={{fontSize:11.5, color:"rgba(244,236,221,.7)"}}>{ev.cuisine}</span>
          </div>
        </div>
      </div>
      <div className="col" style={{padding:"15px 17px 17px", gap:9}}>
        <div className="row" style={{justifyContent:"space-between", gap:10}}>
          <span className="row" style={{gap:5, fontSize:12.5, color:"var(--text-2)"}}>
            <Icon name="cal" size={13}/> {ev.date} · {ev.time}
          </span>
          <span className="row" style={{gap:4, fontSize:12.5, color:"var(--gold)"}}>
            <Icon name="star" size={12} fill/> {chef.rating}
          </span>
        </div>
        <h3 className="serif" style={{fontSize:19, lineHeight:1.18}}>{ev.title}</h3>
        <span className="row dim" style={{gap:5, fontSize:12.5}}>
          <Icon name="pin" size={13}/> {ev.neighborhood}
        </span>
        <div className="hr" style={{margin:"3px 0"}}/>
        <div className="row" style={{justifyContent:"space-between"}}>
          <Price value={ev.price}/>
          <span style={{fontSize:12.5, fontWeight:600,
            color: ev.seatsLeft<=3?"var(--terra)":"var(--text-2)"}}>
            {ev.seatsLeft} seats left
          </span>
        </div>
      </div>
    </button>
  );
}

/* ---------------- horizontal feature row ---------------- */
function EventFeature({ev, onOpen, reverse=false}){
  const chef = chefById(ev.chef);
  return (
    <div className="card" style={{display:"grid",
      gridTemplateColumns: reverse?"1fr 1.05fr":"1.05fr 1fr", overflow:"hidden", minHeight:300}}>
      <div style={{position:"relative", order:reverse?2:1}}>
        <FoodImage seed={ev.seed}/>
      </div>
      <div className="col" style={{order:reverse?1:2, padding:"38px 36px", gap:16, justifyContent:"center"}}>
        <div className="kicker">{ev.cuisine} · {ev.neighborhood.split(",")[1]}</div>
        <h3 className="serif" style={{fontSize:30, lineHeight:1.12}}>{ev.title}</h3>
        <p className="muted" style={{fontSize:14.5, lineHeight:1.6}}>{ev.short}</p>
        <div className="row" style={{gap:11}}>
          <Avatar seed={chef.avatarSeed} name={chef.name} size={40}/>
          <div className="col">
            <span className="row" style={{gap:6, fontSize:13.5, fontWeight:600}}>
              {chef.name} <Icon name="shield" size={13} stroke={1.8} style={{color:"var(--sage)"}}/>
            </span>
            <span className="row" style={{gap:4, fontSize:12.5, color:"var(--text-2)"}}>
              <Stars value={chef.rating} size={12}/> {chef.rating} · {chef.reviews} reviews
            </span>
          </div>
        </div>
        <div className="row" style={{justifyContent:"space-between", marginTop:6}}>
          <div className="col" style={{gap:2}}>
            <Price value={ev.price} big/>
            <span className="dim" style={{fontSize:12.5}}>{ev.date} · {ev.time}</span>
          </div>
          <button className="btn btn-gold" onClick={()=>onOpen(ev.id)}>
            Reserve a seat <Icon name="arrow" size={17}/>
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------------- search bar ---------------- */
function SearchBar({floating=false}){
  const fields = [
    {ic:"pin", label:"Where", val:"Brooklyn, NY"},
    {ic:"cal", label:"When", val:"This week"},
    {ic:"users", label:"Seats", val:"2 guests"},
  ];
  return (
    <div className="row" style={{background:"var(--surface)", border:"1px solid var(--line-strong)",
      borderRadius:99, padding:6, gap:2, boxShadow: floating?"var(--shadow-pop)":"var(--shadow-soft)",
      width:"100%", maxWidth:680}}>
      {fields.map((f,i)=>(
        <React.Fragment key={f.label}>
          <button className="row grow" style={{gap:11, background:"none",border:0,padding:"9px 18px",
            borderRadius:99, textAlign:"left"}}
            onMouseEnter={e=>e.currentTarget.style.background="var(--surface-2)"}
            onMouseLeave={e=>e.currentTarget.style.background="none"}>
            <Icon name={f.ic} size={18} style={{color:"var(--gold)"}}/>
            <div className="col">
              <span style={{fontSize:11, fontWeight:700, letterSpacing:".08em",
                textTransform:"uppercase", color:"var(--text-3)"}}>{f.label}</span>
              <span style={{fontSize:13.5, fontWeight:600}}>{f.val}</span>
            </div>
          </button>
          {i<fields.length-1 && <div style={{width:1, height:30, background:"var(--line)"}}/>}
        </React.Fragment>
      ))}
      <button className="btn btn-gold" style={{width:48, height:48, padding:0, borderRadius:"50%"}}>
        <Icon name="search" size={19}/>
      </button>
    </div>
  );
}

/* ---------------- category chips ---------------- */
function CategoryRow({active, setActive}){
  return (
    <div className="row" style={{gap:10, flexWrap:"wrap"}}>
      {CATEGORIES.map(c=>(
        <button key={c.id} className={"chip"+(active===c.id?" active":"")}
          onClick={()=>setActive(c.id)}>{c.label}</button>
      ))}
    </div>
  );
}

/* ================= HOME VARIATION A — editorial ================= */
function HomeA({go}){
  const [cat,setCat]=useState("all");
  const hero = eventById("jollof-sunday");
  const heroChef = chefById(hero.chef);
  const tonight = EVENTS.slice(0,3);
  const feature = eventById("jollof-sunday");
  return (
    <div className="screen-enter">
      {/* hero */}
      <section style={{position:"relative", height:560, overflow:"hidden"}}>
        <div style={{position:"absolute", inset:0}}><FoodImage seed={hero.seed} glyph={false}/></div>
        <div style={{position:"absolute", inset:0,
          background:"linear-gradient(180deg, rgba(16,12,9,.5) 0%, rgba(16,12,9,.2) 35%, rgba(16,12,9,.92) 100%)"}}/>
        <div className="wrap col" style={{position:"relative", height:"100%", justifyContent:"flex-end",
          paddingBottom:120, gap:20, color:"#F6EFE2"}}>
          <div className="kicker fade-up">A seat at someone's table</div>
          <h1 className="serif fade-up" style={{fontSize:62, lineHeight:1.02, maxWidth:780,
            textWrap:"balance"}}>
            Dinner is ready in <span style={{fontStyle:"italic",color:"#F2BE72"}}>someone's home</span> tonight
          </h1>
          <p className="fade-up" style={{fontSize:17, color:"rgba(246,239,226,.84)", maxWidth:540, lineHeight:1.55}}>
            Book a place at intimate dinners cooked by verified home chefs — from a five-seat
            kaiseki counter to a loud, generous jollof table.
          </p>
          <div className="row fade-up" style={{gap:14, marginTop:6}}>
            <button className="btn btn-gold btn-lg" onClick={()=>go("event",{eventId:hero.id})}>
              Explore tonight's dinners <Icon name="arrow" size={18}/>
            </button>
            <button className="btn btn-lg" onClick={()=>go("chef",{chefId:heroChef.id})}
              style={{background:"rgba(255,255,255,.10)", color:"#F6EFE2", border:"1px solid rgba(255,255,255,.4)", backdropFilter:"blur(4px)"}}>
              Meet the chefs
            </button>
          </div>
        </div>
        {/* floating search */}
        <div className="wrap" style={{position:"absolute", left:0, right:0, bottom:-28}}>
          <SearchBar floating/>
        </div>
      </section>

      <div className="wrap col" style={{gap:54, paddingTop:80}}>
        {/* categories */}
        <CategoryRow active={cat} setActive={setCat}/>

        {/* tonight near you */}
        <section className="col" style={{gap:24}}>
          <div className="row" style={{justifyContent:"space-between", alignItems:"flex-end"}}>
            <div className="col" style={{gap:6}}>
              <div className="kicker">Tonight near you</div>
              <h2 className="serif" style={{fontSize:30}}>Tables filling up this week</h2>
            </div>
            <button className="btn btn-solid btn-sm" onClick={()=>go("home")}>View all 142 dinners</button>
          </div>
          <div style={{display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:24}}>
            {tonight.map(ev=><EventCard key={ev.id} ev={ev} onOpen={(id)=>go("event",{eventId:id})}/>)}
          </div>
        </section>

        {/* feature */}
        <EventFeature ev={feature} onOpen={(id)=>go("event",{eventId:id})}/>

        {/* how it works */}
        <section className="col" style={{gap:28, padding:"20px 0"}}>
          <div className="col" style={{gap:6, alignItems:"center", textAlign:"center"}}>
            <div className="kicker">How it works</div>
            <h2 className="serif" style={{fontSize:30}}>Trust, built into every booking</h2>
          </div>
          <div style={{display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:22}}>
            {[
              {ic:"shield", h:"Every host is verified", d:"ID checks, food-safety certification and a kitchen inspection before a single seat goes on sale."},
              {ic:"lock", h:"Pay securely, in seconds", d:"Your card is charged only when a seat is confirmed. Full refund if a host cancels."},
              {ic:"users", h:"Sit down with strangers", d:"Communal tables and chef's counters designed for conversation, not just a meal."},
            ].map(s=>(
              <div key={s.h} className="card col" style={{padding:"28px 26px", gap:14}}>
                <div className="row" style={{width:48,height:48,borderRadius:14,background:"var(--gold-soft)",
                  color:"var(--gold-2)",justifyContent:"center"}}><Icon name={s.ic} size={22}/></div>
                <h3 className="serif" style={{fontSize:20}}>{s.h}</h3>
                <p className="muted" style={{fontSize:14, lineHeight:1.6}}>{s.d}</p>
              </div>
            ))}
          </div>
        </section>

        {/* chefs strip */}
        <section className="col" style={{gap:24}}>
          <div className="row" style={{justifyContent:"space-between", alignItems:"flex-end"}}>
            <div className="col" style={{gap:6}}>
              <div className="kicker">The hosts</div>
              <h2 className="serif" style={{fontSize:30}}>Chefs worth crossing town for</h2>
            </div>
          </div>
          <div style={{display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:20}}>
            {CHEFS.map(c=>(
              <button key={c.id} className="card col" onClick={()=>go("chef",{chefId:c.id})}
                style={{textAlign:"left", overflow:"hidden", padding:0}}>
                <div style={{height:150, position:"relative"}}>
                  <FoodImage seed={c.coverSeed}/>
                  <div style={{position:"absolute", left:18, bottom:-22}}>
                    <Avatar seed={c.avatarSeed} name={c.name} size={56} ring/>
                  </div>
                </div>
                <div className="col" style={{padding:"30px 18px 20px", gap:7}}>
                  <span className="row" style={{gap:6, fontWeight:600, fontSize:15}}>
                    {c.name} <Icon name="shield" size={13} stroke={1.8} style={{color:"var(--sage)"}}/>
                  </span>
                  <span className="dim" style={{fontSize:12.5}}>{c.cuisine} · {c.city}</span>
                  <span className="row" style={{gap:5, fontSize:12.5, color:"var(--gold)", marginTop:2}}>
                    <Icon name="star" size={12} fill/> {c.rating} · {c.reviews} reviews
                  </span>
                </div>
              </button>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

/* ================= HOME VARIATION B — discovery grid ================= */
function FilterRail(){
  const [price,setPrice]=useState(140);
  const groups=[
    {h:"Cuisine", items:["West African","Italian","Kaiseki","Oaxacan","Levantine","Vegan"]},
    {h:"Dietary", items:["Vegetarian","Halal","Gluten-free","Pescatarian"]},
    {h:"Format", items:["Communal table","Chef's counter","Hands-on","Wine pairing"]},
  ];
  const [sel,setSel]=useState({});
  const toggle=(k)=>setSel(s=>({...s,[k]:!s[k]}));
  return (
    <aside className="col" style={{gap:26, position:"sticky", top:96, alignSelf:"start"}}>
      <div className="col" style={{gap:13}}>
        <div className="row" style={{justifyContent:"space-between"}}>
          <span style={{fontWeight:700, fontSize:14}}>Filters</span>
          <button className="dim" style={{background:"none",border:0,fontSize:12.5}} onClick={()=>setSel({})}>Clear all</button>
        </div>
        <div className="field">
          <label>Max price · <span style={{color:"var(--gold)"}}>${price}/seat</span></label>
          <input type="range" min="40" max="160" value={price} onChange={e=>setPrice(+e.target.value)}
            style={{accentColor:"var(--gold)"}}/>
        </div>
      </div>
      {groups.map(g=>(
        <div key={g.h} className="col" style={{gap:12}}>
          <div className="hr"/>
          <span style={{fontWeight:700, fontSize:13.5}}>{g.h}</span>
          <div className="col" style={{gap:9}}>
            {g.items.map(it=>(
              <label key={it} className="row" style={{gap:10, cursor:"pointer", fontSize:13.5,
                color: sel[it]?"var(--text)":"var(--text-2)"}}>
                <span onClick={()=>toggle(it)} style={{width:19,height:19,borderRadius:5,
                  border:"1px solid "+(sel[it]?"var(--gold)":"var(--line-strong)"),
                  background: sel[it]?"var(--gold)":"transparent", display:"grid", placeItems:"center",
                  color:"var(--on-gold)", flexShrink:0}}>
                  {sel[it] && <Icon name="check" size={13} stroke={2.5}/>}
                </span>
                {it}
              </label>
            ))}
          </div>
        </div>
      ))}
    </aside>
  );
}

function HomeB({go}){
  const [cat,setCat]=useState("all");
  const [sort,setSort]=useState("Recommended");
  return (
    <div className="screen-enter">
      {/* compact hero */}
      <section style={{borderBottom:"1px solid var(--line)", background:"var(--bg-2)"}}>
        <div className="wrap col" style={{padding:"40px 32px 34px", gap:22, alignItems:"center", textAlign:"center"}}>
          <h1 className="serif" style={{fontSize:40, lineHeight:1.08, maxWidth:640, textWrap:"balance"}}>
            Find a seat at a <span style={{fontStyle:"italic",color:"var(--gold-2)"}}>home dinner</span> near you
          </h1>
          <SearchBar/>
          <CategoryRow active={cat} setActive={setCat}/>
        </div>
      </section>

      <div className="wrap" style={{display:"grid", gridTemplateColumns:"248px 1fr", gap:40, paddingTop:34}}>
        <FilterRail/>
        <div className="col" style={{gap:22}}>
          <div className="row" style={{justifyContent:"space-between"}}>
            <div className="col" style={{gap:3}}>
              <h2 className="serif" style={{fontSize:23}}>142 dinners this week</h2>
              <span className="dim" style={{fontSize:13}}>Brooklyn & nearby · within 5 miles</span>
            </div>
            <div className="row" style={{gap:8}}>
              {["Recommended","Soonest","Price","Top rated"].map(s=>(
                <button key={s} className={"chip"+(sort===s?" active":"")} onClick={()=>setSort(s)}
                  style={{height:34}}>{s}</button>
              ))}
            </div>
          </div>
          <div style={{display:"grid", gridTemplateColumns:"repeat(2,1fr)", gap:22}}>
            {EVENTS.map(ev=><EventCard key={ev.id} ev={ev} compact onOpen={(id)=>go("event",{eventId:id})}/>)}
          </div>
          <button className="btn btn-solid" style={{alignSelf:"center", marginTop:8}}>Load more dinners</button>
        </div>
      </div>
    </div>
  );
}

Object.assign(window,{ EventCard, EventFeature, SearchBar, CategoryRow, HomeA, HomeB, FilterRail });

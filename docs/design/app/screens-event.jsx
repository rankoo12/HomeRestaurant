/* ============================================================
   HOME RESTAURANT — event detail (+ booking) and chef profile
   ============================================================ */

/* small label/value stat */
function MetaStat({ic,label,value}){
  return (
    <div className="row" style={{gap:11}}>
      <div className="row" style={{width:42,height:42,borderRadius:12,background:"var(--surface-2)",
        color:"var(--gold)",justifyContent:"center",flexShrink:0}}><Icon name={ic} size={19}/></div>
      <div className="col">
        <span className="dim" style={{fontSize:12}}>{label}</span>
        <span style={{fontSize:14.5, fontWeight:600}}>{value}</span>
      </div>
    </div>
  );
}

/* ---------------- EVENT SCREEN ---------------- */
function EventScreen({go, eventId}){
  const ev = eventById(eventId) || EVENTS[0];
  const chef = chefById(ev.chef);
  const [seats,setSeats]=useState(2);
  const evReviews = REVIEWS.filter(r=>r.chef===ev.chef).slice(0,2);
  const gallery=[ev.seed, (ev.seed+1)%8, (ev.seed+3)%8, (ev.seed+5)%8];

  return (
    <div className="screen-enter wrap" style={{paddingTop:24}}>
      {/* breadcrumb */}
      <button onClick={()=>go("home")} className="row dim" style={{gap:7, background:"none",border:0,
        fontSize:13, marginBottom:18}}>
        <Icon name="chevL" size={15}/> All dinners
      </button>

      {/* gallery */}
      <div style={{display:"grid", gridTemplateColumns:"2fr 1fr 1fr", gridTemplateRows:"170px 170px",
        gap:10, borderRadius:"var(--r-lg)", overflow:"hidden", height:350}}>
        <div style={{gridRow:"1 / span 2", position:"relative"}}>
          <FoodImage seed={gallery[0]} glyph={false}/>
          <span className="badge badge-gold" style={{position:"absolute", left:16, top:16}}>
            <Icon name="cam" size={13}/> 12 photos
          </span>
        </div>
        {gallery.slice(1).map((s,i)=><div key={i} style={{position:"relative"}}><FoodImage seed={s}/></div>)}
      </div>

      {/* body: content + sticky booking */}
      <div style={{display:"grid", gridTemplateColumns:"1fr 380px", gap:48, marginTop:36, alignItems:"start"}}>
        {/* left content */}
        <div className="col" style={{gap:30}}>
          <div className="col" style={{gap:14}}>
            <div className="row" style={{gap:10}}>
              <span className="kicker">{ev.cuisine}</span>
              {ev.seatsLeft<=3 && <span className="badge badge-soon">Only {ev.seatsLeft} seats left</span>}
            </div>
            <h1 className="serif" style={{fontSize:42, lineHeight:1.05, maxWidth:560}}>{ev.title}</h1>
            <div className="row" style={{gap:18, flexWrap:"wrap", color:"var(--text-2)", fontSize:14}}>
              <span className="row" style={{gap:6}}><Icon name="star" size={14} fill style={{color:"var(--gold)"}}/>
                <b style={{color:"var(--text)"}}>{chef.rating}</b> · {chef.reviews} reviews</span>
              <span className="row" style={{gap:6}}><Icon name="pin" size={14}/> {ev.neighborhood}</span>
              <span className="row" style={{gap:6}}><Icon name="users" size={14}/> Hosted by {chef.name.split(" ")[0]}</span>
            </div>
          </div>

          {/* host strip */}
          <button onClick={()=>go("chef",{chefId:chef.id})} className="card row"
            style={{padding:18, gap:16, textAlign:"left", justifyContent:"space-between"}}>
            <div className="row" style={{gap:16}}>
              <Avatar seed={chef.avatarSeed} name={chef.name} size={56} ring/>
              <div className="col" style={{gap:4}}>
                <span className="row" style={{gap:7, fontSize:16, fontWeight:600}}>
                  {chef.name} <VerifiedPill/>
                </span>
                <span className="muted" style={{fontSize:13.5}}>{chef.tagline}</span>
              </div>
            </div>
            <Icon name="chevR" size={20} style={{color:"var(--text-3)"}}/>
          </button>

          {/* meta grid */}
          <div style={{display:"grid", gridTemplateColumns:"repeat(2,1fr)", gap:18}}>
            <MetaStat ic="cal" label="Date" value={`${ev.date} · ${ev.time}`}/>
            <MetaStat ic="clock" label="Duration" value={ev.duration}/>
            <MetaStat ic="users" label="Table size" value={`Up to ${ev.seatsTotal} guests`}/>
            <MetaStat ic="pin" label="Neighborhood" value={ev.neighborhood}/>
          </div>

          <div className="hr"/>

          {/* about */}
          <div className="col" style={{gap:12}}>
            <h2 className="serif" style={{fontSize:24}}>About this dinner</h2>
            <p style={{fontSize:15.5, lineHeight:1.7, color:"var(--text-2)"}}>{ev.short} {chef.bio}</p>
            <div className="row" style={{gap:9, flexWrap:"wrap", marginTop:4}}>
              {ev.tags.map(t=><span key={t} className="chip" style={{height:32}}>{t}</span>)}
            </div>
          </div>

          {/* menu */}
          <div className="col" style={{gap:16}}>
            <h2 className="serif" style={{fontSize:24}}>The menu</h2>
            <div className="card col" style={{padding:"6px 26px"}}>
              {ev.courses.map((c,i)=>(
                <div key={i} className="row" style={{padding:"20px 0", gap:24,
                  borderBottom: i<ev.courses.length-1?"1px solid var(--line)":"none", alignItems:"flex-start"}}>
                  <span className="serif" style={{fontSize:14, fontStyle:"italic", color:"var(--gold)",
                    minWidth:90, paddingTop:2}}>{c.n}</span>
                  <span style={{fontSize:15, lineHeight:1.5}}>{c.d}</span>
                </div>
              ))}
            </div>
            <p className="dim row" style={{fontSize:13, gap:7}}>
              <Icon name="leaf" size={14}/> Dietary needs? Message {chef.name.split(" ")[0]} after booking — substitutions are welcome.
            </p>
          </div>

          <div className="hr"/>

          {/* reviews */}
          <div className="col" style={{gap:18}}>
            <div className="row" style={{gap:10}}>
              <Icon name="star" size={22} fill style={{color:"var(--gold)"}}/>
              <h2 className="serif" style={{fontSize:24}}>{chef.rating} · {chef.reviews} reviews</h2>
            </div>
            <div style={{display:"grid", gridTemplateColumns:"repeat(2,1fr)", gap:18}}>
              {evReviews.map(rv=>(
                <div key={rv.id} className="card col" style={{padding:22, gap:12}}>
                  <div className="row" style={{justifyContent:"space-between"}}>
                    <div className="row" style={{gap:11}}>
                      <Avatar seed={rv.seed} name={rv.author} size={40}/>
                      <div className="col">
                        <span style={{fontWeight:600, fontSize:14}}>{rv.author}</span>
                        <span className="dim" style={{fontSize:12}}>{rv.date}</span>
                      </div>
                    </div>
                    <Stars value={rv.rating} size={13}/>
                  </div>
                  <p className="muted" style={{fontSize:14, lineHeight:1.6}}>"{rv.text}"</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* sticky booking card */}
        <div style={{position:"sticky", top:96}}>
          <div className="card col" style={{padding:24, gap:18, boxShadow:"var(--shadow-pop)"}}>
            <div className="row" style={{justifyContent:"space-between", alignItems:"flex-end"}}>
              <Price value={ev.price} big/>
              <span className="row" style={{gap:5, fontSize:13, color:"var(--gold)"}}>
                <Icon name="star" size={13} fill/> {chef.rating}
              </span>
            </div>
            <SeatsMeter left={ev.seatsLeft} total={ev.seatsTotal}/>
            <div className="hr"/>
            <div className="col" style={{gap:14}}>
              <div className="row" style={{justifyContent:"space-between"}}>
                <div className="col">
                  <span style={{fontSize:13.5, fontWeight:600}}>Seats</span>
                  <span className="dim" style={{fontSize:12.5}}>{ev.seatsLeft} available</span>
                </div>
                <Stepper value={seats} onChange={setSeats} min={1} max={ev.seatsLeft}/>
              </div>
              <div className="field">
                <div className="input row" style={{justifyContent:"space-between", cursor:"pointer"}}>
                  <span className="row" style={{gap:10}}><Icon name="cal" size={16} style={{color:"var(--gold)"}}/> {ev.date}</span>
                  <Icon name="chevD" size={16} style={{color:"var(--text-3)"}}/>
                </div>
              </div>
            </div>
            <button className="btn btn-gold btn-block btn-lg" onClick={()=>go("checkout",{eventId:ev.id, seats})}>
              Reserve {seats} {seats>1?"seats":"seat"}
            </button>
            <div className="col" style={{gap:10, fontSize:13.5}}>
              <div className="row" style={{justifyContent:"space-between"}}>
                <span className="muted">${ev.price} × {seats} {seats>1?"seats":"seat"}</span>
                <span className="tnum">${ev.price*seats}</span>
              </div>
              <div className="row" style={{justifyContent:"space-between"}}>
                <span className="muted">Service fee</span>
                <span className="tnum">${Math.round(ev.price*seats*0.1)}</span>
              </div>
              <div className="hr"/>
              <div className="row" style={{justifyContent:"space-between", fontWeight:700}}>
                <span>Total</span>
                <span className="tnum serif" style={{fontSize:18}}>${ev.price*seats+Math.round(ev.price*seats*0.1)}</span>
              </div>
            </div>
            <p className="dim row" style={{fontSize:12, gap:7, justifyContent:"center"}}>
              <Icon name="lock" size={13}/> You won't be charged until confirmed
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------- CHEF PROFILE ---------------- */
function ChefScreen({go, chefId}){
  const chef = chefById(chefId) || CHEFS[0];
  const evs = eventsByChef(chef.id);
  const revs = REVIEWS.filter(r=>r.chef===chef.id);
  const stats=[
    {n:chef.dinners, l:"Dinners hosted"},
    {n:chef.reviews, l:"Reviews"},
    {n:chef.rating, l:"Avg rating"},
    {n:chef.since, l:"Hosting since"},
  ];
  return (
    <div className="screen-enter">
      {/* cover */}
      <div style={{position:"relative", height:300}}>
        <FoodImage seed={chef.coverSeed} glyph={false}/>
        <div style={{position:"absolute", inset:0,
          background:"linear-gradient(180deg, rgba(16,12,9,.25), rgba(16,12,9,.9))"}}/>
        <button onClick={()=>go("home")} className="row" style={{position:"absolute", top:22, left:32,
          gap:7, background:"rgba(16,12,9,.5)", backdropFilter:"blur(8px)", border:"1px solid var(--line-strong)",
          borderRadius:99, padding:"9px 16px", color:"#fff", fontSize:13}}>
          <Icon name="chevL" size={15}/> Back
        </button>
      </div>

      <div className="wrap" style={{marginTop:-72, position:"relative"}}>
        {/* header */}
        <div className="row" style={{gap:22, alignItems:"flex-end", marginBottom:34}}>
          <Avatar seed={chef.avatarSeed} name={chef.name} size={128} ring/>
          <div className="col grow" style={{gap:8, paddingBottom:6}}>
            <div className="row" style={{gap:11}}>
              <h1 className="serif" style={{fontSize:38}}>{chef.name}</h1>
              {chef.superhost && <span className="badge badge-gold" style={{alignSelf:"center"}}>Superhost</span>}
            </div>
            <div className="row" style={{gap:16, color:"var(--text-2)", fontSize:14}}>
              <span className="row" style={{gap:6}}><Icon name="pin" size={14}/> {chef.city}</span>
              <span className="row" style={{gap:6}}><Icon name="globe" size={14}/> {chef.cuisine}</span>
              <VerifiedPill/>
            </div>
          </div>
          <button className="btn btn-ghost"><Icon name="message" size={17}/> Message</button>
        </div>

        <div style={{display:"grid", gridTemplateColumns:"320px 1fr", gap:44, alignItems:"start"}}>
          {/* left: about + verification */}
          <div className="col" style={{gap:24, position:"sticky", top:96}}>
            <div className="card col" style={{padding:24, gap:18}}>
              <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:18}}>
                {stats.map(s=>(
                  <div key={s.l} className="col">
                    <span className="serif" style={{fontSize:26}}>{s.n}</span>
                    <span className="dim" style={{fontSize:12.5}}>{s.l}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="card col" style={{padding:24, gap:15}}>
              <span style={{fontWeight:700, fontSize:14}}>Verified by Home Restaurant</span>
              {chef.badges.map(b=>(
                <div key={b} className="row" style={{gap:11, fontSize:13.5, color:"var(--text-2)"}}>
                  <Icon name="check" size={16} stroke={2.2} style={{color:"var(--sage)"}}/> {b}
                </div>
              ))}
            </div>
          </div>

          {/* right: bio + events + reviews */}
          <div className="col" style={{gap:34}}>
            <div className="col" style={{gap:12}}>
              <h2 className="serif" style={{fontSize:24}}>About {chef.name.split(" ")[0]}</h2>
              <p style={{fontSize:15.5, lineHeight:1.75, color:"var(--text-2)"}}>{chef.bio}</p>
            </div>
            <div className="col" style={{gap:18}}>
              <h2 className="serif" style={{fontSize:24}}>Upcoming dinners</h2>
              <div style={{display:"grid", gridTemplateColumns:"repeat(2,1fr)", gap:22}}>
                {evs.map(ev=><EventCard key={ev.id} ev={ev} compact onOpen={(id)=>go("event",{eventId:id})}/>)}
              </div>
            </div>
            <div className="col" style={{gap:18}}>
              <h2 className="serif row" style={{fontSize:24, gap:10, alignItems:"center"}}>
                <Icon name="star" size={20} fill style={{color:"var(--gold)"}}/> {chef.rating} · {chef.reviews} reviews
              </h2>
              <div className="col" style={{gap:16}}>
                {revs.map(rv=>(
                  <div key={rv.id} className="card row" style={{padding:22, gap:16, alignItems:"flex-start"}}>
                    <Avatar seed={rv.seed} name={rv.author} size={44}/>
                    <div className="col" style={{gap:8}}>
                      <div className="row" style={{gap:10}}>
                        <span style={{fontWeight:600, fontSize:14.5}}>{rv.author}</span>
                        <span className="dim" style={{fontSize:12.5}}>· {rv.date}</span>
                        <Stars value={rv.rating} size={13}/>
                      </div>
                      <p className="muted" style={{fontSize:14.5, lineHeight:1.65}}>"{rv.text}"</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window,{ EventScreen, ChefScreen, MetaStat });

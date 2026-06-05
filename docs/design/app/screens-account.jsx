/* ============================================================
   HOME RESTAURANT — checkout, confirmation, bookings, auth
   ============================================================ */

/* ---------------- CHECKOUT ---------------- */
function CheckoutScreen({go, params}){
  const ev = eventById(params.eventId) || EVENTS[0];
  const chef = chefById(ev.chef);
  const seats = params.seats || 2;
  const { addBooking } = useApp();
  const [step,setStep]=useState(0); // 0 details, processing handled inline
  const [card,setCard]=useState("");
  const sub = ev.price*seats, fee=Math.round(sub*0.1), total=sub+fee;

  const pay=()=>{
    setStep(1);
    setTimeout(()=>{
      const code = "HR-"+Math.random().toString(36).slice(2,6).toUpperCase();
      addBooking({id:"b"+Date.now(), event:ev.id, chef:ev.chef, seats, status:"upcoming", code, paid:total});
      go("confirm",{eventId:ev.id, seats, code, total});
    },1700);
  };

  return (
    <div className="screen-enter">
      <div style={{borderBottom:"1px solid var(--line)", background:"var(--bg-2)"}}>
        <div className="wrap row" style={{height:64, gap:16}}>
          <button onClick={()=>go("event",{eventId:ev.id})} className="row dim"
            style={{gap:7, background:"none", border:0, fontSize:13}}>
            <Icon name="chevL" size={15}/> Back to dinner
          </button>
          <div className="grow"/>
          <span className="row dim" style={{gap:8, fontSize:13}}>
            <Icon name="lock" size={14}/> Secure checkout
          </span>
        </div>
      </div>

      <div className="wrap" style={{display:"grid", gridTemplateColumns:"1fr 400px", gap:48, paddingTop:40, paddingBottom:60}}>
        {/* left: form */}
        <div className="col" style={{gap:30, maxWidth:620}}>
          <h1 className="serif" style={{fontSize:34}}>Confirm and pay</h1>

          {/* who's coming */}
          <section className="col" style={{gap:16}}>
            <h2 className="serif" style={{fontSize:20}}>Who's coming</h2>
            <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:14}}>
              <div className="field"><label>Full name</label><input className="input" defaultValue="Noa Ben-David"/></div>
              <div className="field"><label>Phone</label><input className="input" defaultValue="+1 (917) 555-0148"/></div>
            </div>
            <div className="field"><label>Email for confirmation</label><input className="input" defaultValue="noa@example.com"/></div>
            <div className="field"><label>Dietary notes for {chef.name.split(" ")[0]} <span className="dim">(optional)</span></label>
              <textarea className="input" rows="2" placeholder="Allergies, preferences, anything the chef should know…"></textarea></div>
          </section>

          <div className="hr"/>

          {/* payment */}
          <section className="col" style={{gap:16}}>
            <div className="row" style={{justifyContent:"space-between"}}>
              <h2 className="serif" style={{fontSize:20}}>Payment</h2>
              <div className="row" style={{gap:7}}>
                {["Visa","MC","Amex"].map(c=>(
                  <span key={c} style={{fontSize:10.5, fontWeight:800, padding:"4px 8px", borderRadius:5,
                    border:"1px solid var(--line-strong)", color:"var(--text-3)"}}>{c}</span>
                ))}
              </div>
            </div>
            <div className="field"><label>Card number</label>
              <div className="input row" style={{gap:10}}>
                <Icon name="card" size={18} style={{color:"var(--gold)"}}/>
                <input value={card} onChange={e=>setCard(e.target.value)} placeholder="4242 4242 4242 4242"
                  style={{flex:1, background:"none", border:0, color:"var(--text)", outline:"none", fontSize:14.5}}/>
              </div>
            </div>
            <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:14}}>
              <div className="field"><label>Expiry</label><input className="input" placeholder="MM / YY"/></div>
              <div className="field"><label>CVC</label><input className="input" placeholder="123"/></div>
            </div>
            <label className="row" style={{gap:10, fontSize:13, color:"var(--text-2)", cursor:"pointer", marginTop:4}}>
              <span style={{width:18,height:18,borderRadius:5,background:"var(--gold)",display:"grid",placeItems:"center",color:"var(--on-gold)"}}>
                <Icon name="check" size={12} stroke={2.5}/></span>
              Save this card for future dinners
            </label>
          </section>

          {/* cancellation */}
          <div className="card row" style={{padding:18, gap:14, background:"var(--surface)"}}>
            <Icon name="shield" size={22} style={{color:"var(--sage)", flexShrink:0}}/>
            <div className="col" style={{gap:2}}>
              <span style={{fontWeight:600, fontSize:14}}>Free cancellation until 48h before</span>
              <span className="dim" style={{fontSize:13}}>Full refund if you cancel by {ev.date.split(",")[0]} two days prior, or if {chef.name.split(" ")[0]} cancels.</span>
            </div>
          </div>

          <button className="btn btn-gold btn-lg" onClick={pay} disabled={step===1}
            style={{alignSelf:"flex-start", minWidth:240, opacity: step===1?.7:1}}>
            {step===1
              ? <span className="row" style={{gap:10}}><Spinner/> Confirming your seat…</span>
              : <span className="row" style={{gap:9}}><Icon name="lock" size={16}/> Pay ${total} & reserve</span>}
          </button>
        </div>

        {/* right: order summary */}
        <div style={{position:"sticky", top:96, alignSelf:"start"}}>
          <div className="card col" style={{padding:0, overflow:"hidden"}}>
            <div className="row" style={{gap:14, padding:18}}>
              <div style={{width:80,height:80,borderRadius:12,overflow:"hidden",flexShrink:0}}>
                <FoodImage seed={ev.seed}/>
              </div>
              <div className="col" style={{gap:5}}>
                <span className="kicker" style={{fontSize:10.5}}>{ev.cuisine}</span>
                <span className="serif" style={{fontSize:17, lineHeight:1.15}}>{ev.title}</span>
                <span className="dim row" style={{gap:5, fontSize:12.5}}><Icon name="pin" size={12}/>{ev.neighborhood}</span>
              </div>
            </div>
            <div className="hr"/>
            <div className="col" style={{padding:18, gap:13}}>
              <div className="row" style={{gap:11, fontSize:13.5}}>
                <Avatar seed={chef.avatarSeed} name={chef.name} size={32}/>
                <span>Hosted by <b>{chef.name}</b></span>
              </div>
              <div className="row" style={{justifyContent:"space-between", fontSize:13.5}}>
                <span className="muted row" style={{gap:7}}><Icon name="cal" size={14}/> Date</span>
                <span>{ev.date} · {ev.time}</span>
              </div>
              <div className="row" style={{justifyContent:"space-between", fontSize:13.5}}>
                <span className="muted row" style={{gap:7}}><Icon name="users" size={14}/> Seats</span>
                <span>{seats} {seats>1?"guests":"guest"}</span>
              </div>
            </div>
            <div className="hr"/>
            <div className="col" style={{padding:18, gap:11, fontSize:13.5}}>
              <div className="row" style={{justifyContent:"space-between"}}><span className="muted">${ev.price} × {seats}</span><span className="tnum">${sub}</span></div>
              <div className="row" style={{justifyContent:"space-between"}}><span className="muted">Service fee</span><span className="tnum">${fee}</span></div>
              <div className="hr"/>
              <div className="row" style={{justifyContent:"space-between", fontWeight:700}}>
                <span>Total (USD)</span><span className="serif tnum" style={{fontSize:20}}>${total}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Spinner(){
  return <span style={{width:16,height:16,borderRadius:"50%",border:"2px solid rgba(255,255,255,.35)",
    borderTopColor:"var(--on-gold)",display:"inline-block",animation:"spin .7s linear infinite"}}/>;
}

/* ---------------- CONFIRMATION ---------------- */
function ConfirmScreen({go, params}){
  const ev = eventById(params.eventId) || EVENTS[0];
  const chef = chefById(ev.chef);
  return (
    <div className="screen-enter wrap" style={{paddingTop:50, paddingBottom:40, maxWidth:760}}>
      <div className="col" style={{alignItems:"center", textAlign:"center", gap:18, marginBottom:34}}>
        <div className="row" style={{width:74,height:74,borderRadius:"50%",background:"var(--sage-soft)",
          color:"var(--sage)",justifyContent:"center"}}>
          <Icon name="check" size={36} stroke={2.4}/>
        </div>
        <div className="kicker" style={{color:"var(--sage)"}}>Reservation confirmed</div>
        <h1 className="serif" style={{fontSize:40, lineHeight:1.1, maxWidth:520}}>
          You're in. {chef.name.split(" ")[0]} is expecting you.
        </h1>
        <p className="muted" style={{fontSize:15.5, maxWidth:460, lineHeight:1.6}}>
          A confirmation and the exact address have been sent to your email. The address unlocks 24 hours before the dinner.
        </p>
      </div>

      <div className="card col" style={{overflow:"hidden"}}>
        <div className="row" style={{padding:22, gap:18}}>
          <div style={{width:96,height:96,borderRadius:14,overflow:"hidden",flexShrink:0}}><FoodImage seed={ev.seed}/></div>
          <div className="col grow" style={{gap:6}}>
            <span className="serif" style={{fontSize:21}}>{ev.title}</span>
            <span className="row muted" style={{gap:7, fontSize:13.5}}><Icon name="cal" size={14}/> {ev.date} · {ev.time} · {ev.duration}</span>
            <span className="row muted" style={{gap:7, fontSize:13.5}}><Icon name="pin" size={14}/> {ev.neighborhood}</span>
          </div>
          <div className="col" style={{alignItems:"flex-end", gap:6}}>
            <span className="dim" style={{fontSize:12}}>Confirmation</span>
            <span className="serif" style={{fontSize:20, letterSpacing:".06em", color:"var(--gold-2)"}}>{params.code||"HR-9F2K"}</span>
          </div>
        </div>
        <div className="hr"/>
        <div className="row" style={{padding:18, gap:12, justifyContent:"space-between"}}>
          <span className="row" style={{gap:11, fontSize:13.5}}>
            <Avatar seed={chef.avatarSeed} name={chef.name} size={36}/>
            <span>{params.seats||2} seats · paid <b>${params.total||ev.price*2}</b></span>
          </span>
          <div className="row" style={{gap:10}}>
            <button className="btn btn-solid btn-sm"><Icon name="cal" size={15}/> Add to calendar</button>
            <button className="btn btn-solid btn-sm"><Icon name="message" size={15}/> Message host</button>
          </div>
        </div>
      </div>

      <div className="row" style={{gap:14, marginTop:26, justifyContent:"center"}}>
        <button className="btn btn-gold btn-lg" onClick={()=>go("bookings")}>View my dinners</button>
        <button className="btn btn-ghost btn-lg" onClick={()=>go("home")}>Keep browsing</button>
      </div>
    </div>
  );
}

/* ---------------- MY BOOKINGS + REVIEWS ---------------- */
function ReviewModal({booking, onClose, onSubmit}){
  const ev = eventById(booking.event); const chef=chefById(booking.chef);
  const [rating,setRating]=useState(5); const [text,setText]=useState("");
  return (
    <div onClick={onClose} style={{position:"fixed", inset:0, zIndex:80, background:"rgba(8,5,3,.7)",
      backdropFilter:"blur(4px)", display:"grid", placeItems:"center", padding:20}}>
      <div onClick={e=>e.stopPropagation()} className="card col fade-up"
        style={{padding:30, gap:20, width:480, maxWidth:"100%"}}>
        <div className="row" style={{gap:14}}>
          <div style={{width:56,height:56,borderRadius:12,overflow:"hidden"}}><FoodImage seed={ev.seed}/></div>
          <div className="col" style={{gap:3}}>
            <span className="dim" style={{fontSize:12.5}}>How was</span>
            <span className="serif" style={{fontSize:18}}>{ev.title}?</span>
          </div>
        </div>
        <div className="col" style={{gap:9, alignItems:"center"}}>
          <span className="dim" style={{fontSize:13}}>Your rating for {chef.name.split(" ")[0]}</span>
          <div className="row" style={{gap:6}}>
            {[1,2,3,4,5].map(i=>(
              <button key={i} onClick={()=>setRating(i)} style={{background:"none",border:0,padding:2}}>
                <Icon name="star" size={34} fill={i<=rating} stroke={1.4}
                  style={{color:i<=rating?"var(--gold)":"var(--text-3)"}}/>
              </button>
            ))}
          </div>
        </div>
        <textarea className="input" rows="4" value={text} onChange={e=>setText(e.target.value)}
          placeholder="Tell others what the evening was like…"></textarea>
        <div className="row" style={{gap:12, justifyContent:"flex-end"}}>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-gold" onClick={()=>onSubmit(booking.id)}>Post review</button>
        </div>
      </div>
    </div>
  );
}

function BookingsScreen({go}){
  const { bookings, setRole } = useApp();
  const appCtx = useApp();
  const [tab,setTab]=useState("upcoming");
  const [reviewing,setReviewing]=useState(null);
  const [reviewed,setReviewed]=useState({});
  const list = bookings.filter(b=> tab==="upcoming"? b.status==="upcoming" : b.status==="past");

  return (
    <div className="screen-enter wrap" style={{paddingTop:36}}>
      <div className="row" style={{justifyContent:"space-between", alignItems:"flex-end", marginBottom:26}}>
        <div className="col" style={{gap:7}}>
          <div className="kicker">Your table</div>
          <h1 className="serif" style={{fontSize:38}}>My dinners</h1>
        </div>
        <button className="btn btn-solid" onClick={()=>go("home")}><Icon name="search" size={16}/> Find another dinner</button>
      </div>

      <div className="row" style={{gap:6, borderBottom:"1px solid var(--line)", marginBottom:26}}>
        {[["upcoming","Upcoming"],["past","Past"]].map(([k,l])=>(
          <button key={k} onClick={()=>setTab(k)} style={{background:"none",border:0,padding:"12px 18px",
            fontSize:14.5, fontWeight:600, color: tab===k?"var(--text)":"var(--text-3)",
            borderBottom: tab===k?"2px solid var(--gold)":"2px solid transparent", marginBottom:-1}}>
            {l} <span className="dim">({bookings.filter(b=>b.status===k).length})</span>
          </button>
        ))}
      </div>

      <div className="col" style={{gap:16}}>
        {list.length===0 &&
          <div className="card col" style={{padding:50, alignItems:"center", gap:12, textAlign:"center"}}>
            <Icon name="cal" size={30} style={{color:"var(--text-3)"}}/>
            <p className="muted">No {tab} dinners yet.</p>
            <button className="btn btn-gold btn-sm" onClick={()=>go("home")}>Browse dinners</button>
          </div>}
        {list.map(b=>{
          const ev=eventById(b.event); const chef=chefById(b.chef);
          const isReviewed = b.reviewed || reviewed[b.id];
          return (
            <div key={b.id} className="card row" style={{padding:0, overflow:"hidden", alignItems:"stretch"}}>
              <div style={{width:200, position:"relative", flexShrink:0}}><FoodImage seed={ev.seed}/></div>
              <div className="row grow" style={{padding:22, gap:20, justifyContent:"space-between"}}>
                <div className="col" style={{gap:9}}>
                  <div className="row" style={{gap:10}}>
                    <span className="kicker" style={{fontSize:10.5}}>{ev.cuisine}</span>
                    {b.status==="upcoming"
                      ? <span className="badge badge-verified">Confirmed</span>
                      : <span className="badge" style={{background:"var(--surface-3)",color:"var(--text-2)"}}>Completed</span>}
                  </div>
                  <h3 className="serif" style={{fontSize:22}}>{ev.title}</h3>
                  <div className="row" style={{gap:16, color:"var(--text-2)", fontSize:13.5, flexWrap:"wrap"}}>
                    <span className="row" style={{gap:6}}><Icon name="cal" size={14}/> {ev.date} · {ev.time}</span>
                    <span className="row" style={{gap:6}}><Icon name="users" size={14}/> {b.seats} seats</span>
                    <span className="row" style={{gap:6}}><Icon name="pin" size={14}/> {ev.neighborhood}</span>
                  </div>
                  <div className="row" style={{gap:10, marginTop:4}}>
                    <Avatar seed={chef.avatarSeed} name={chef.name} size={30}/>
                    <span style={{fontSize:13.5}}>{chef.name} · <span className="dim">{b.code}</span></span>
                  </div>
                </div>
                <div className="col" style={{alignItems:"flex-end", justifyContent:"space-between"}}>
                  <span className="serif" style={{fontSize:18}}>${b.paid}</span>
                  {b.status==="upcoming"
                    ? <div className="col" style={{gap:9, alignItems:"flex-end"}}>
                        <button className="btn btn-gold btn-sm" onClick={()=>go("event",{eventId:ev.id})}>View details</button>
                        <button className="dim" style={{background:"none",border:0,fontSize:12.5}}>Cancel reservation</button>
                      </div>
                    : isReviewed
                      ? <span className="row badge badge-gold"><Icon name="check" size={13}/> Reviewed</span>
                      : <button className="btn btn-ghost btn-sm" onClick={()=>setReviewing(b)}>
                          <Icon name="star" size={15}/> Leave a review</button>}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {reviewing && <ReviewModal booking={reviewing} onClose={()=>setReviewing(null)}
        onSubmit={(id)=>{ setReviewed(r=>({...r,[id]:true})); setReviewing(null); }}/>}
    </div>
  );
}

/* ---------------- AUTH ---------------- */
function AuthScreen({go}){
  const [mode,setMode]=useState("signin");
  const isSignup = mode==="signup";
  return (
    <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", minHeight:"100vh"}}>
      {/* left: form */}
      <div className="col" style={{padding:"48px 64px", justifyContent:"center", maxWidth:560, margin:"0 auto", width:"100%"}}>
        <button onClick={()=>go("home")} style={{background:"none",border:0,alignSelf:"flex-start",marginBottom:40}}>
          <Logo size={20}/>
        </button>
        <div className="col fade-up" style={{gap:8, marginBottom:28}}>
          <h1 className="serif" style={{fontSize:36, lineHeight:1.1}}>
            {isSignup? "Pull up a chair" : "Welcome back"}
          </h1>
          <p className="muted" style={{fontSize:15}}>
            {isSignup? "Create an account to book your first home dinner." : "Sign in to manage your dinners and reservations."}
          </p>
        </div>

        <div className="col" style={{gap:14}}>
          {isSignup &&
            <div className="field"><label>Full name</label><input className="input" placeholder="Your name"/></div>}
          <div className="field"><label>Email</label><input className="input" placeholder="you@example.com"/></div>
          <div className="field"><label>Password</label>
            <div className="input row" style={{gap:10}}>
              <Icon name="lock" size={16} style={{color:"var(--gold)"}}/>
              <input type="password" defaultValue="········"
                style={{flex:1,background:"none",border:0,color:"var(--text)",outline:"none",fontSize:14.5}}/>
            </div>
          </div>
          {!isSignup &&
            <button className="dim" style={{background:"none",border:0,alignSelf:"flex-end",fontSize:12.5}}>Forgot password?</button>}
          <button className="btn btn-gold btn-lg btn-block" onClick={()=>go("home")}>
            {isSignup? "Create account" : "Sign in"}
          </button>

          <div className="row" style={{gap:14, margin:"6px 0"}}>
            <div className="hr grow"/><span className="dim" style={{fontSize:12}}>or</span><div className="hr grow"/>
          </div>
          <div className="row" style={{gap:12}}>
            {["Continue with Google","Continue with Apple"].map(t=>(
              <button key={t} className="btn btn-solid btn-block" style={{fontSize:13}}>{t}</button>
            ))}
          </div>
        </div>

        <p className="muted" style={{fontSize:14, marginTop:26, textAlign:"center"}}>
          {isSignup? "Already have an account? " : "New to Home Restaurant? "}
          <button onClick={()=>setMode(isSignup?"signin":"signup")}
            style={{background:"none",border:0,color:"var(--gold-2)",fontWeight:600,fontSize:14}}>
            {isSignup? "Sign in" : "Create one"}
          </button>
        </p>
        <p className="dim row" style={{gap:7, fontSize:12, marginTop:18, justifyContent:"center"}}>
          <Icon name="shield" size={13}/> Identity verified for every host and guest
        </p>
      </div>

      {/* right: imagery */}
      <div style={{position:"relative", overflow:"hidden"}}>
        <FoodImage seed={1} glyph={false}/>
        <div style={{position:"absolute", inset:0, background:"linear-gradient(180deg, rgba(16,12,9,.3), rgba(16,12,9,.75))"}}/>
        <div className="col" style={{position:"absolute", inset:0, padding:64, justifyContent:"flex-end", gap:18, color:"#F6EFE2"}}>
          <Icon name="sparkle" size={30} style={{color:"#F2BE72"}}/>
          <h2 className="serif" style={{fontSize:32, lineHeight:1.25, maxWidth:440}}>
            "The most generous table I've sat at in years — we left as friends."
          </h2>
          <div className="row" style={{gap:12}}>
            <Avatar seed={31} name="Mara L." size={42}/>
            <div className="col">
              <span style={{fontWeight:600}}>Mara L.</span>
              <span style={{fontSize:13, color:"rgba(246,239,226,.7)"}}>after Amara's Sunday Jollof Table</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const _spinStyle=document.createElement("style");
_spinStyle.textContent="@keyframes spin{to{transform:rotate(360deg)}}";
document.head.appendChild(_spinStyle);

Object.assign(window,{ CheckoutScreen, ConfirmScreen, BookingsScreen, AuthScreen, ReviewModal, Spinner });

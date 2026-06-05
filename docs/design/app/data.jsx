/* ============================================================
   HOME RESTAURANT — mock data
   ============================================================ */
const CHEFS = [
  {
    id:"amara", name:"Amara Okafor", city:"Brooklyn, NY", cuisine:"West African",
    tagline:"Lagos-born, Brooklyn-based. Cooking my grandmother's recipes for strangers who leave as friends.",
    rating:4.97, reviews:214, since:2021, dinners:186, verified:true, superhost:true,
    avatarSeed:1, coverSeed:11,
    bio:"I grew up in my mother's catering kitchen in Lagos before moving to New York to study food anthropology. My table is loud, generous and built around jollof rice that has started arguments. Everything is cooked fresh the morning of, and I always send guests home with something wrapped in foil.",
    badges:["ID verified","Food-safety certified","Kitchen inspected"],
  },
  {
    id:"luca", name:"Luca Moretti", city:"North End, Boston", cuisine:"Emilian Italian",
    tagline:"Hand-rolled pasta and a bottle of Lambrusco on a Tuesday. That's the whole pitch.",
    rating:4.92, reviews:158, since:2020, dinners:240, verified:true, superhost:true,
    avatarSeed:2, coverSeed:12,
    bio:"Third-generation cook from Modena. I make tortellini the way my nonna taught me — by feel, never by recipe. Dinners are five courses, slow, and unapologetically carb-forward.",
    badges:["ID verified","Food-safety certified"],
  },
  {
    id:"sora", name:"Sora Tanaka", city:"Mission, SF", cuisine:"Modern Kaiseki",
    tagline:"A quiet, seasonal counter for eight. Seven courses, no phones, all intention.",
    rating:4.99, reviews:96, since:2022, dinners:72, verified:true, superhost:false,
    avatarSeed:3, coverSeed:13,
    bio:"Trained in Kyoto, cooking in San Francisco. My dinners follow the season — what's at the farmers market on Saturday decides the menu on Sunday. Eight seats, one sitting.",
    badges:["ID verified","Food-safety certified","Kitchen inspected"],
  },
  {
    id:"diego", name:"Diego Herrera", city:"Pilsen, Chicago", cuisine:"Oaxacan",
    tagline:"Mole that takes three days. Mezcal that takes the edge off. Come hungry.",
    rating:4.95, reviews:131, since:2021, dinners:140, verified:true, superhost:true,
    avatarSeed:4, coverSeed:14,
    bio:"From Oaxaca City to Chicago's Pilsen. I cook the food of my state — seven moles, fresh masa, smoke and chiles. My grandmother's comal came with me on the plane.",
    badges:["ID verified","Food-safety certified"],
  },
];

const EVENTS = [
  {
    id:"jollof-sunday", chef:"amara",
    title:"Sunday Jollof & Suya Table",
    cuisine:"West African", seed:16,
    date:"Sun, Jun 7", time:"6:30 PM", duration:"3 hrs",
    price:68, seatsTotal:10, seatsLeft:3,
    neighborhood:"Bed-Stuy, Brooklyn",
    tags:["Communal table","Halal options","Vegetarian friendly"],
    short:"A loud, generous family-style feast built around smoky jollof, grilled suya and fried plantain.",
    courses:[
      {n:"To start", d:"Suya skewers, kuli-kuli crumble, fresh kachumbari"},
      {n:"The table", d:"Party jollof rice, grilled tilapia, dodo (fried plantain), efo riro greens"},
      {n:"Sweet", d:"Coconut puff-puff with hibiscus caramel"},
    ],
    seatsView:8,
  },
  {
    id:"tortellini-tuesday", chef:"luca",
    title:"Tortellini in Brodo, Five Courses",
    cuisine:"Emilian Italian", seed:17,
    date:"Tue, Jun 9", time:"7:00 PM", duration:"3.5 hrs",
    price:95, seatsTotal:8, seatsLeft:5,
    neighborhood:"North End, Boston",
    tags:["Wine pairing","Hand-rolled pasta","5 courses"],
    short:"Five slow courses of Emilian cooking, finishing with tortellini floated in a 12-hour capon brodo.",
    courses:[
      {n:"Primo", d:"Culatello, mortadella, gnocco fritto"},
      {n:"Secondo", d:"Tortellini in capon brodo"},
      {n:"Terzo", d:"Tagliatelle al ragù, 4-hour bolognese"},
      {n:"Dolce", d:"Zuppa inglese, espresso"},
    ],
    seatsView:6,
  },
  {
    id:"kaiseki-eight", chef:"sora",
    title:"Seasonal Kaiseki — Eight Seats",
    cuisine:"Modern Kaiseki", seed:19,
    date:"Sat, Jun 13", time:"6:00 PM", duration:"2.5 hrs",
    price:140, seatsTotal:8, seatsLeft:2,
    neighborhood:"Mission, San Francisco",
    tags:["Counter seating","Pescatarian","No phones"],
    short:"Seven quiet, intentional courses that follow the market. A single sitting at a counter for eight.",
    courses:[
      {n:"Sakizuke", d:"Chilled corn tofu, sea grape, dashi gelée"},
      {n:"Mukozuke", d:"Hokkaido scallop, yuzu kosho, shiso"},
      {n:"Yakimono", d:"Charcoal-grilled black cod, sansho"},
      {n:"Mizumono", d:"Hojicha custard, brown-sugar warabi"},
    ],
    seatsView:4,
  },
  {
    id:"mole-night", chef:"diego",
    title:"Seven Moles & Mezcal",
    cuisine:"Oaxacan", seed:18,
    date:"Fri, Jun 12", time:"7:30 PM", duration:"3 hrs",
    price:82, seatsTotal:12, seatsLeft:7,
    neighborhood:"Pilsen, Chicago",
    tags:["Mezcal flight","Gluten-free","Communal table"],
    short:"A three-day mole negro, fresh-pressed masa and a guided mezcal flight from small Oaxacan palenques.",
    courses:[
      {n:"Botana", d:"Tlayuda, chapulines, queso Oaxaca"},
      {n:"Plato fuerte", d:"Mole negro with heritage chicken, masa tetelas"},
      {n:"Postre", d:"Nicuatole, mezcal caramel"},
    ],
    seatsView:9,
  },
  {
    id:"jollof-friday", chef:"amara",
    title:"Friday Small-Plates & Highlife",
    cuisine:"West African", seed:24,
    date:"Fri, Jun 19", time:"8:00 PM", duration:"2.5 hrs",
    price:54, seatsTotal:14, seatsLeft:9,
    neighborhood:"Bed-Stuy, Brooklyn",
    tags:["Small plates","Vinyl & highlife","Vegan options"],
    short:"A looser, later night of West African small plates with a highlife record collection on rotation.",
    courses:[
      {n:"Plates", d:"Moin-moin, akara, pepper-soup dumplings"},
      {n:"Sweet", d:"Chin-chin, hibiscus sorbet"},
    ],
    seatsView:11,
  },
  {
    id:"pasta-lab", chef:"luca",
    title:"Hands-On Pasta Lab + Dinner",
    cuisine:"Emilian Italian", seed:25,
    date:"Sun, Jun 21", time:"5:00 PM", duration:"4 hrs",
    price:120, seatsTotal:6, seatsLeft:4,
    neighborhood:"North End, Boston",
    tags:["Hands-on","Bring an apron","Wine included"],
    short:"Roll your own tortellini alongside Luca, then sit down to eat the spoils with a bottle of Lambrusco.",
    courses:[
      {n:"Make", d:"Sfoglia rolling, tortellini folding"},
      {n:"Eat", d:"Your pasta, two ways, plus dessert"},
    ],
    seatsView:3,
  },
];

const CATEGORIES = [
  {id:"all",   label:"All experiences"},
  {id:"tonight",label:"Tonight"},
  {id:"chefs", label:"Chef's tables"},
  {id:"communal",label:"Communal"},
  {id:"handson",label:"Hands-on"},
  {id:"pairing",label:"Wine & pairings"},
  {id:"vegetarian",label:"Vegetarian"},
];

const REVIEWS = [
  {id:1, event:"jollof-sunday", chef:"amara", author:"Mara L.", seed:31, rating:5, date:"May 2026",
   text:"The most generous table I've sat at in years. Amara made everyone introduce themselves and by dessert we'd exchanged numbers. The jollof deserves its reputation."},
  {id:2, event:"kaiseki-eight", chef:"sora", author:"Devon W.", seed:32, rating:5, date:"May 2026",
   text:"Eight strangers, total silence at the counter, and somehow the warmest evening. Sora explained each course in two sentences and then let the food talk."},
  {id:3, event:"mole-night", chef:"diego", author:"Priya R.", seed:33, rating:5, date:"Apr 2026",
   text:"You can taste the three days in the mole. The mezcal flight was the right amount of education and the right amount of fun."},
  {id:4, event:"tortellini-tuesday", chef:"luca", author:"Sam K.", seed:34, rating:4, date:"Apr 2026",
   text:"Felt like eating at someone's nonna's house, which is the point. Came for pasta, stayed two extra hours talking."},
];

/* user's own bookings (prototype state seed) */
const MY_BOOKINGS = [
  {id:"b1", event:"mole-night", chef:"diego", seats:2, status:"upcoming", code:"HR-9F2K", paid:164},
  {id:"b2", event:"kaiseki-eight", chef:"sora", seats:1, status:"past", code:"HR-7T1A", paid:140, reviewed:false},
  {id:"b3", event:"tortellini-tuesday", chef:"luca", seats:2, status:"past", code:"HR-3M8C", paid:190, reviewed:true},
];

const chefById = (id)=>CHEFS.find(c=>c.id===id);
const eventById = (id)=>EVENTS.find(e=>e.id===id);
const eventsByChef = (id)=>EVENTS.filter(e=>e.chef===id);

Object.assign(window,{ CHEFS, EVENTS, CATEGORIES, REVIEWS, MY_BOOKINGS, chefById, eventById, eventsByChef });

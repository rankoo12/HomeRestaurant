/**
 * Seed data — a faithful port of docs/design/app/data.jsx into real domain shapes.
 * Display strings ("Sun, Jun 7", "$68") are converted to timestamptz + integer cents.
 * Dates are anchored to 2026 to match the prototype's "Jun" framing.
 */

export interface SeedChef {
  // user
  email: string;
  fullName: string;
  avatarSeed: number;
  // profile
  slug: string;
  cuisine: string;
  city: string;
  tagline: string;
  bio: string;
  coverSeed: number;
  isSuperhost: boolean;
  hostingSince: number;
  badges: string[];
}

export interface SeedEvent {
  slug: string;
  chefSlug: string;
  title: string;
  cuisine: string;
  shortDescription: string;
  neighborhood: string;
  addressLine: string;
  latitude: number;
  longitude: number;
  startsAt: string; // ISO
  durationMinutes: number;
  priceCents: number;
  seatsTotal: number;
  seatsBooked: number;
  imageSeed: number;
  status: 'published';
  courses: Array<{ position: number; name: string; description: string }>;
  tags: string[];
  /** Filenames under backend/scripts/seed-photos/ — real cuisine-matched covers. */
  photos: string[];
}

export interface SeedReview {
  eventSlug: string;
  chefSlug: string;
  authorEmail: string;
  rating: number;
  body: string;
}

export const SEED_CHEFS: SeedChef[] = [
  {
    email: 'amara@homerestaurant.test',
    fullName: 'Amara Okafor',
    avatarSeed: 1,
    slug: 'amara',
    cuisine: 'West African',
    city: 'Brooklyn, NY',
    tagline:
      "Lagos-born, Brooklyn-based. Cooking my grandmother's recipes for strangers who leave as friends.",
    bio: "I grew up in my mother's catering kitchen in Lagos before moving to New York to study food anthropology. My table is loud, generous and built around jollof rice that has started arguments. Everything is cooked fresh the morning of, and I always send guests home with something wrapped in foil.",
    coverSeed: 11,
    isSuperhost: true,
    hostingSince: 2021,
    badges: ['ID verified', 'Food-safety certified', 'Kitchen inspected'],
  },
  {
    email: 'lucia@homerestaurant.test',
    fullName: 'Lucia Moretti',
    avatarSeed: 2,
    slug: 'lucia',
    cuisine: 'Emilian Italian',
    city: 'North End, Boston',
    tagline: "Hand-rolled pasta and a bottle of Lambrusco on a Tuesday. That's the whole pitch.",
    bio: 'Third-generation cook from Modena. I make tortellini the way my nonna taught me — by feel, never by recipe. Dinners are five courses, slow, and unapologetically carb-forward.',
    coverSeed: 12,
    isSuperhost: true,
    hostingSince: 2020,
    badges: ['ID verified', 'Food-safety certified'],
  },
  {
    email: 'sora@homerestaurant.test',
    fullName: 'Sora Tanaka',
    avatarSeed: 3,
    slug: 'sora',
    cuisine: 'Modern Kaiseki',
    city: 'Mission, SF',
    tagline: 'A quiet, seasonal counter for eight. Seven courses, no phones, all intention.',
    bio: "Trained in Kyoto, cooking in San Francisco. My dinners follow the season — what's at the farmers market on Saturday decides the menu on Sunday. Eight seats, one sitting.",
    coverSeed: 13,
    isSuperhost: false,
    hostingSince: 2022,
    badges: ['ID verified', 'Food-safety certified', 'Kitchen inspected'],
  },
  {
    email: 'diego@homerestaurant.test',
    fullName: 'Diego Herrera',
    avatarSeed: 4,
    slug: 'diego',
    cuisine: 'Oaxacan',
    city: 'Pilsen, Chicago',
    tagline: 'Mole that takes three days. Mezcal that takes the edge off. Come hungry.',
    bio: "From Oaxaca City to Chicago's Pilsen. I cook the food of my state — seven moles, fresh masa, smoke and chiles. My grandmother's comal came with me on the plane.",
    coverSeed: 14,
    isSuperhost: true,
    hostingSince: 2021,
    badges: ['ID verified', 'Food-safety certified'],
  },
];

export const SEED_EVENTS: SeedEvent[] = [
  {
    slug: 'jollof-sunday',
    chefSlug: 'amara',
    title: 'Sunday Jollof & Suya Table',
    cuisine: 'West African',
    shortDescription:
      'A loud, generous family-style feast built around smoky jollof, grilled suya and fried plantain.',
    neighborhood: 'Bed-Stuy, Brooklyn',
    addressLine: '123 Greene Ave, Brooklyn, NY 11216',
    latitude: 40.6857,
    longitude: -73.9442,
    startsAt: '2026-06-07T18:30:00-04:00',
    durationMinutes: 180,
    priceCents: 6800,
    seatsTotal: 10,
    seatsBooked: 7,
    imageSeed: 16,
    status: 'published',
    courses: [
      { position: 1, name: 'To start', description: 'Suya skewers, kuli-kuli crumble, fresh kachumbari' },
      {
        position: 2,
        name: 'The table',
        description: 'Party jollof rice, grilled tilapia, dodo (fried plantain), efo riro greens',
      },
      { position: 3, name: 'Sweet', description: 'Coconut puff-puff with hibiscus caramel' },
    ],
    tags: ['Communal table', 'Halal options', 'Vegetarian friendly'],
    photos: ['food-15.jpg'],
  },
  {
    slug: 'tortellini-tuesday',
    chefSlug: 'lucia',
    title: 'Tortellini in Brodo, Five Courses',
    cuisine: 'Emilian Italian',
    shortDescription:
      'Five slow courses of Emilian cooking, finishing with tortellini floated in a 12-hour capon brodo.',
    neighborhood: 'North End, Boston',
    addressLine: '47 Salem St, Boston, MA 02113',
    latitude: 42.3647,
    longitude: -71.056,
    startsAt: '2026-06-09T19:00:00-04:00',
    durationMinutes: 210,
    priceCents: 9500,
    seatsTotal: 8,
    seatsBooked: 3,
    imageSeed: 17,
    status: 'published',
    courses: [
      { position: 1, name: 'Primo', description: 'Culatello, mortadella, gnocco fritto' },
      { position: 2, name: 'Secondo', description: 'Tortellini in capon brodo' },
      { position: 3, name: 'Terzo', description: 'Tagliatelle al ragù, 4-hour bolognese' },
      { position: 4, name: 'Dolce', description: 'Zuppa inglese, espresso' },
    ],
    tags: ['Wine pairing', 'Hand-rolled pasta', '5 courses'],
    photos: ['food-7.jpg'],
  },
  {
    slug: 'kaiseki-eight',
    chefSlug: 'sora',
    title: 'Seasonal Kaiseki — Eight Seats',
    cuisine: 'Modern Kaiseki',
    shortDescription:
      'Seven quiet, intentional courses that follow the market. A single sitting at a counter for eight.',
    neighborhood: 'Mission, San Francisco',
    addressLine: '2901 24th St, San Francisco, CA 94110',
    latitude: 37.7525,
    longitude: -122.4108,
    startsAt: '2026-06-13T18:00:00-07:00',
    durationMinutes: 150,
    priceCents: 14000,
    seatsTotal: 8,
    seatsBooked: 6,
    imageSeed: 19,
    status: 'published',
    courses: [
      { position: 1, name: 'Sakizuke', description: 'Chilled corn tofu, sea grape, dashi gelée' },
      { position: 2, name: 'Mukozuke', description: 'Hokkaido scallop, yuzu kosho, shiso' },
      { position: 3, name: 'Yakimono', description: 'Charcoal-grilled black cod, sansho' },
      { position: 4, name: 'Mizumono', description: 'Hojicha custard, brown-sugar warabi' },
    ],
    tags: ['Counter seating', 'Pescatarian', 'No phones'],
    photos: ['food-2.jpg', 'food-9.jpg'],
  },
  {
    slug: 'mole-night',
    chefSlug: 'diego',
    title: 'Seven Moles & Mezcal',
    cuisine: 'Oaxacan',
    shortDescription:
      'A three-day mole negro, fresh-pressed masa and a guided mezcal flight from small Oaxacan palenques.',
    neighborhood: 'Pilsen, Chicago',
    addressLine: '1801 S Racine Ave, Chicago, IL 60608',
    latitude: 41.8576,
    longitude: -87.6566,
    startsAt: '2026-06-12T19:30:00-05:00',
    durationMinutes: 180,
    priceCents: 8200,
    seatsTotal: 12,
    seatsBooked: 5,
    imageSeed: 18,
    status: 'published',
    courses: [
      { position: 1, name: 'Botana', description: 'Tlayuda, chapulines, queso Oaxaca' },
      { position: 2, name: 'Plato fuerte', description: 'Mole negro with heritage chicken, masa tetelas' },
      { position: 3, name: 'Postre', description: 'Nicuatole, mezcal caramel' },
    ],
    tags: ['Mezcal flight', 'Gluten-free', 'Communal table'],
    photos: ['food-1.jpg', 'food-4.jpg'],
  },
  {
    slug: 'jollof-friday',
    chefSlug: 'amara',
    title: 'Friday Small-Plates & Highlife',
    cuisine: 'West African',
    shortDescription:
      'A looser, later night of West African small plates with a highlife record collection on rotation.',
    neighborhood: 'Bed-Stuy, Brooklyn',
    addressLine: '845 Lexington Ave, Brooklyn, NY 11221',
    latitude: 40.6901,
    longitude: -73.927,
    startsAt: '2026-06-19T20:00:00-04:00',
    durationMinutes: 150,
    priceCents: 5400,
    seatsTotal: 14,
    seatsBooked: 5,
    imageSeed: 24,
    status: 'published',
    courses: [
      { position: 1, name: 'Plates', description: 'Moin-moin, akara, pepper-soup dumplings' },
      { position: 2, name: 'Sweet', description: 'Chin-chin, hibiscus sorbet' },
    ],
    tags: ['Small plates', 'Vinyl & highlife', 'Vegan options'],
    photos: ['food-17.jpg'],
  },
  {
    slug: 'pasta-lab',
    chefSlug: 'lucia',
    title: 'Hands-On Pasta Lab + Dinner',
    cuisine: 'Emilian Italian',
    shortDescription:
      'Roll your own tortellini alongside Lucia, then sit down to eat the spoils with a bottle of Lambrusco.',
    neighborhood: 'North End, Boston',
    addressLine: '12 Fleet St, Boston, MA 02113',
    latitude: 42.366,
    longitude: -71.0535,
    startsAt: '2026-06-21T17:00:00-04:00',
    durationMinutes: 240,
    priceCents: 12000,
    seatsTotal: 6,
    seatsBooked: 2,
    imageSeed: 25,
    status: 'published',
    courses: [
      { position: 1, name: 'Make', description: 'Sfoglia rolling, tortellini folding' },
      { position: 2, name: 'Eat', description: 'Your pasta, two ways, plus dessert' },
    ],
    tags: ['Hands-on', 'Bring an apron', 'Wine included'],
    photos: ['food-14.jpg'],
  },
];

export const SEED_GUESTS = [
  { email: 'mara@homerestaurant.test', fullName: 'Mara L.', avatarSeed: 31 },
  { email: 'devon@homerestaurant.test', fullName: 'Devon W.', avatarSeed: 32 },
  { email: 'priya@homerestaurant.test', fullName: 'Priya R.', avatarSeed: 33 },
  { email: 'sam@homerestaurant.test', fullName: 'Sam K.', avatarSeed: 34 },
];

export const SEED_REVIEWS: SeedReview[] = [
  {
    eventSlug: 'jollof-sunday',
    chefSlug: 'amara',
    authorEmail: 'mara@homerestaurant.test',
    rating: 5,
    body: "The most generous table I've sat at in years. Amara made everyone introduce themselves and by dessert we'd exchanged numbers. The jollof deserves its reputation.",
  },
  {
    eventSlug: 'kaiseki-eight',
    chefSlug: 'sora',
    authorEmail: 'devon@homerestaurant.test',
    rating: 5,
    body: 'Eight strangers, total silence at the counter, and somehow the warmest evening. Sora explained each course in two sentences and then let the food talk.',
  },
  {
    eventSlug: 'mole-night',
    chefSlug: 'diego',
    authorEmail: 'priya@homerestaurant.test',
    rating: 5,
    body: 'You can taste the three days in the mole. The mezcal flight was the right amount of education and the right amount of fun.',
  },
  {
    eventSlug: 'tortellini-tuesday',
    chefSlug: 'lucia',
    authorEmail: 'sam@homerestaurant.test',
    rating: 4,
    body: "Felt like eating at someone's nonna's house, which is the point. Came for pasta, stayed two extra hours talking.",
  },
];

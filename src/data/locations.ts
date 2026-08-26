/**
 * Zwits service-area registry.
 *
 * Only areas Zwits genuinely operates in are marked `live` and published as
 * indexable landing pages. Planned cities are listed for internal roadmap and
 * are never given their own indexable page until they go live.
 *
 * CONTENT RULE: every field below must be genuinely true of the area or of how
 * Zwits works. Never add invented statistics, delivery times, named businesses
 * or coverage claims.
 */

export type Suburb = {
  slug: string;
  name: string;
  /** One honest, locally useful line about the area — no invented claims. */
  blurb: string;
  /** Well-known public places used as pickup reference points. */
  landmarks: string[];
  /** Unique page introduction (2–3 sentences). */
  intro: string;
  /** What makes moving things in/out of this area different. */
  considerations: { title: string; text: string }[];
  /** Who books deliveries here and why. */
  useCases: { title: string; text: string }[];
  /** Practical local context paragraph rendered on the page. */
  localContext: string;
  /** Area-specific FAQs appended to the shared delivery FAQs. */
  faqs: { q: string; a: string }[];
  /** Slugs of adjacent/related suburbs to link first. */
  nearby: string[];
};

export const HARARE_SUBURBS: Suburb[] = [
  {
    slug: "cbd",
    name: "Harare CBD",
    blurb:
      "Document runs, supplier collections and office parcels between First Street, Samora Machel and the Kopje business district.",
    landmarks: ["First Street", "Samora Machel Avenue", "Africa Unity Square", "Kopje", "Rezende Street"],
    intro:
      "The Harare CBD is dense, walkable and full of offices, banks, wholesalers and government departments sitting within a few blocks of each other. That makes it the part of the city where a delivery is usually about paperwork, a supplier collection or a short hop that would otherwise cost someone an hour of parking and queuing. Zwits riders work the grid between First Street, Samora Machel Avenue and the Kopje so that trip does not have to be yours.",
    considerations: [
      {
        title: "Parking and access are the real cost",
        text: "Most CBD trips are short in distance but expensive in time — one-way streets, controlled parking and building security desks. A bike rider absorbs that instead of your staff.",
      },
      {
        title: "Reception desks and floor numbers matter",
        text: "Multi-tenant office blocks need a floor, suite and contact name on the booking, otherwise the rider is stuck at a security desk. Add it to the drop-off notes when you book.",
      },
      {
        title: "Business-hours window",
        text: "Offices, banks and government counters close earlier than shops. CBD document runs should be booked with enough of the working day left for the recipient to still be there.",
      },
      {
        title: "Wholesaler collections need a paid order",
        text: "For supplier pickups around the Kopje and Rezende area, pay the supplier first and give the rider the order or invoice reference. Riders collect, they do not negotiate or pay on your behalf.",
      },
    ],
    useCases: [
      {
        title: "Contracts, tenders and bank paperwork",
        text: "Signed documents moved between offices, law firms, banks and government counters without a staff member leaving the building.",
      },
      {
        title: "Wholesaler and supplier collections",
        text: "Retailers and traders send a rider to collect a paid order from a CBD supplier instead of closing the shop for the morning.",
      },
      {
        title: "Office-to-suburb drops",
        text: "Sending something from a CBD office out to a client, a director or a site in the northern or western suburbs.",
      },
      {
        title: "Same-block errands",
        text: "Short hops of a few streets where the trip is genuinely faster on a bike than in a car.",
      },
    ],
    localContext:
      "Because CBD addresses are close together, distance is rarely what drives the price here — the vehicle type and the waiting involved matter more. Documents and small parcels go by bike; stock, boxes and bulk collections need a van. If a pickup involves a queue at a counter or a security check, say so in the booking notes so the right rider takes it.",
    faqs: [
      {
        q: "Can a Zwits rider collect from a CBD office building?",
        a: "Yes, provided the booking includes the building, floor or suite and a contact name. Security desks in multi-tenant blocks will not release a parcel to a rider with only a street address.",
      },
      {
        q: "Do I need to pay a CBD supplier before the rider arrives?",
        a: "Yes. Riders collect goods that are already paid for and released. They do not handle cash payments to suppliers or negotiate on your behalf.",
      },
      {
        q: "Is a bike or a van better for CBD deliveries?",
        a: "A bike suits documents and small parcels and moves better through CBD traffic and one-way streets. Choose a van when you are moving boxes, stock or anything a rider cannot carry safely.",
      },
    ],
    nearby: ["avondale", "marlborough", "borrowdale"],
  },
  {
    slug: "avondale",
    name: "Avondale",
    blurb:
      "Shopping-centre pickups, home repairs and cleaning bookings around Avondale, Belgravia and the Fife Avenue strip.",
    landmarks: ["Avondale Shops", "Belgravia", "Fife Avenue", "King George Road"],
    intro:
      "Avondale sits between the CBD and the northern suburbs, which is why so much of what Zwits moves here is a mix of household and small-business work. It is a shopping-centre suburb with a strong flatland component — clusters of flats, cottages and small offices alongside standalone houses. Deliveries here are usually short, frequent and time-sensitive rather than bulk.",
    considerations: [
      {
        title: "Flats and complexes need a unit number",
        text: "A large share of Avondale addresses are flats, cottages or gated complexes. Add the block, unit and gate instruction so the rider is not calling from the street.",
      },
      {
        title: "Shopping-centre collection points",
        text: "Pickups at Avondale Shops are easiest when you name the shop and give the rider an order reference or collection slip.",
      },
      {
        title: "Short cross-suburb hops",
        text: "Avondale to the CBD, Belgravia or Mount Pleasant are short runs, so express bike delivery is usually the sensible option over a van.",
      },
      {
        title: "Recipient availability",
        text: "Residential drops in the middle of the working day often need a domestic worker, neighbour or gate guard nominated to receive on your behalf.",
      },
    ],
    useCases: [
      {
        title: "Shop and pharmacy orders",
        text: "Retailers and pharmacies around the shopping centre sending customer orders out to nearby homes and offices.",
      },
      {
        title: "Household deliveries",
        text: "Groceries, forgotten keys, school items and parcels moved between family, flats and the office.",
      },
      {
        title: "Home services alongside delivery",
        text: "Cleaning, plumbing, electrical and handyman bookings for flats and houses — booked through Zwits services rather than the delivery flow.",
      },
      {
        title: "Small-office courier runs",
        text: "The consultancies, studios and practices along the Fife Avenue side sending documents and samples across town.",
      },
    ],
    localContext:
      "Avondale works best as a same-day, short-distance area: most trips are within a few kilometres of the pickup point. Because a lot of drops are residential, the biggest cause of a delayed delivery here is nobody being available to receive — nominate a receiver in the booking notes if you will be out.",
    faqs: [
      {
        q: "Can Zwits deliver to a flat or cottage in Avondale?",
        a: "Yes. Include the block or complex name, unit number and any gate or intercom instruction in the drop-off details so the rider can reach the door.",
      },
      {
        q: "Can someone else receive my delivery in Avondale?",
        a: "Yes. Name the person who will receive it in the booking notes. Proof of delivery is captured at hand-over either way.",
      },
      {
        q: "Do you also book home services in Avondale, not just delivery?",
        a: "Yes. Cleaning, plumbing, electrical, gardening and other home services are booked through the Zwits services section and matched to verified providers working in the area.",
      },
    ],
    nearby: ["cbd", "borrowdale", "marlborough"],
  },
  {
    slug: "borrowdale",
    name: "Borrowdale",
    blurb:
      "Household deliveries, solar and borehole call-outs, and scheduled home services across Borrowdale, Brooke and Gunhill.",
    landmarks: ["Sam Levy's Village", "Borrowdale Brooke", "Gunhill", "Borrowdale Road"],
    intro:
      "Borrowdale is a low-density northern suburb of large stands, gated estates and a strong retail centre, which changes what a delivery looks like. Trips into Borrowdale are longer in distance than CBD work, and the last hundred metres — an estate gate, a guardhouse, a long driveway — matter as much as the route. Zwits handles both the retail-to-home runs and the heavier equipment jobs that come with big properties.",
    considerations: [
      {
        title: "Estate gates and access control",
        text: "Gated estates such as Borrowdale Brooke require the resident to clear the rider at the gate. Add the estate, house number and the phone number the guardhouse should call.",
      },
      {
        title: "Distance drives the price",
        text: "Borrowdale is further from the CBD than the inner suburbs, so trips are priced on real distance. Combining several drops into one booking is usually cheaper than separate trips.",
      },
      {
        title: "Bulky items often need a van",
        text: "Appliances, solar components, water tanks, pumps and furniture will not go on a bike. Choose a van when you book so the right vehicle is dispatched.",
      },
      {
        title: "Long driveways and side entrances",
        text: "Note whether the rider should use a service entrance or a main gate — it saves a call and a wait on arrival.",
      },
    ],
    useCases: [
      {
        title: "Retail-to-home orders",
        text: "Shops and restaurants at and around Sam Levy's Village sending customer orders out into the surrounding suburbs.",
      },
      {
        title: "Solar, borehole and pump call-outs",
        text: "Large stands generate demand for solar installation, borehole and pump work — booked as Zwits services, with parts delivered separately when needed.",
      },
      {
        title: "Scheduled household services",
        text: "Repeat cleaning, gardening, pool and maintenance visits arranged in advance rather than as emergencies.",
      },
      {
        title: "Home-office and consultancy courier",
        text: "The many home offices in the area sending documents and samples into town or out to clients.",
      },
    ],
    localContext:
      "The practical difference in Borrowdale is access, not availability. Bookings that include the estate name, house number, gate contact and whether a van is needed complete far more smoothly than an address alone. For heavier work such as solar or borehole equipment, book the service first and let the provider confirm what needs to be delivered to site.",
    faqs: [
      {
        q: "Can a rider get into a gated estate in Borrowdale?",
        a: "Only if you clear them at the gate. Give the estate name, house number and the contact number the guardhouse should call, and be reachable when the rider arrives.",
      },
      {
        q: "Can Zwits deliver bulky items like appliances or solar parts to Borrowdale?",
        a: "Yes, on a van rather than a bike. Select the van option when booking and describe the item so the right vehicle and driver are dispatched.",
      },
      {
        q: "Are solar and borehole technicians available in Borrowdale?",
        a: "Those categories are available through Zwits services and matched to verified providers who work in the area. Availability depends on which providers are online when you book.",
      },
    ],
    nearby: ["avondale", "marlborough", "cbd"],
  },
  {
    slug: "marlborough",
    name: "Marlborough",
    blurb:
      "Our registered home suburb. Same-suburb parcel runs, handyman jobs and business collections along Tarlington and Harare Drive.",
    landmarks: ["Tarlington Road", "Harare Drive", "Marlborough Shops", "Westgate side"],
    intro:
      "Marlborough is where Zwits is registered and based — our office is on Tarlington Road. It is a mixed residential suburb on the north-western side of the city, close to Harare Drive and the Westgate side, with a steady mix of households, small traders and home-run businesses. A lot of what we move here is short-distance work between homes, shops and the businesses operating out of the suburb.",
    considerations: [
      {
        title: "Same-suburb runs are the cheapest trips we do",
        text: "Distance-based pricing means a Marlborough-to-Marlborough hop costs far less than a cross-city run. Group errands into one booking where you can.",
      },
      {
        title: "Harare Drive is the main artery",
        text: "Most routes in and out of the suburb use Harare Drive, so peak-hour timing affects a cross-city trip more than a local one.",
      },
      {
        title: "Residential addresses need landmarks",
        text: "Plot and street numbering is uneven in parts of the suburb. A nearby corner, tuckshop or road junction in the notes helps the rider find you first time.",
      },
      {
        title: "Home businesses and repeat collections",
        text: "Traders operating from home can set up recurring collections rather than booking each trip individually.",
      },
    ],
    useCases: [
      {
        title: "Local parcel and errand runs",
        text: "Short trips between homes, tuckshops and the Marlborough shops that do not justify getting a car out.",
      },
      {
        title: "Home-business collections",
        text: "Online sellers and home-run traders having orders collected and delivered to customers across Harare.",
      },
      {
        title: "Handyman and repair jobs",
        text: "Plumbing, electrical, carpentry and general repair work booked through Zwits services for houses in the suburb.",
      },
      {
        title: "Cross-city drops to the CBD and north",
        text: "Sending documents or stock from Marlborough into the CBD, Avondale or Borrowdale on a single quoted trip.",
      },
    ],
    localContext:
      "Being based here means Marlborough is the area our team knows best, but it is treated no differently in dispatch: the nearest available verified rider or driver takes the job, and the price is quoted on distance and vehicle before you confirm. If you run a business from the suburb and send parcels regularly, a Zwits Business account replaces trip-by-trip payment with a monthly invoice.",
    faqs: [
      {
        q: "Is Zwits actually based in Marlborough?",
        a: "Yes. Zwits Technologies Private Business Corporation is registered at 16 Tarlington Road, Marlborough, Harare.",
      },
      {
        q: "How much is a delivery within Marlborough?",
        a: "Short same-suburb trips are the cheapest bookings on the platform because pricing is distance-based. The exact figure is quoted before you confirm.",
      },
      {
        q: "Can a home business in Marlborough get regular collections?",
        a: "Yes. Zwits Business supports recurring collections, scheduled routes and monthly invoicing instead of paying for each trip separately.",
      },
    ],
    nearby: ["cbd", "avondale", "borrowdale"],
  },
];

export type City = {
  slug: string;
  name: string;
  live: boolean;
};

export const CITIES: City[] = [
  { slug: "harare", name: "Harare", live: true },
  { slug: "chitungwiza", name: "Chitungwiza", live: false },
  { slug: "bulawayo", name: "Bulawayo", live: false },
  { slug: "mutare", name: "Mutare", live: false },
  { slug: "gweru", name: "Gweru", live: false },
  { slug: "masvingo", name: "Masvingo", live: false },
];

export const LIVE_CITIES = CITIES.filter((c) => c.live);

export function findSuburb(slug: string) {
  return HARARE_SUBURBS.find((s) => s.slug === slug);
}

export function findLiveCity(slug: string) {
  return LIVE_CITIES.find((c) => c.slug === slug);
}

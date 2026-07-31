import {
  Bike,
  Car,
  Wrench,
  Sparkles,
  Sprout,
  Scissors,
  Laptop,
  Siren,
  Headphones,
  Droplets,
  Zap,
  PaintRoller,
  Hammer,
  Flame,
  Cog,
  Sun,
  Waves,
  Refrigerator,
  Wifi,
  MonitorSmartphone,
  GraduationCap,
  ShieldCheck,
  Truck,
  type LucideIcon,
} from "lucide-react";

export type SchedulingRules = {
  /** Earliest slot start, 24h (e.g. 8 = 08:00) */
  hoursStart: number;
  /** Latest slot start, 24h (e.g. 18 = 18:00) */
  hoursEnd: number;
  /** Slot length in minutes */
  slotMinutes: number;
  /** Minimum hours of lead time before earliest bookable slot */
  leadHours: number;
  /** How many days ahead a customer can schedule */
  maxDaysAhead: number;
  /** Days of week available (0 = Sun … 6 = Sat) */
  workingDays: number[];
  /** Whether ASAP/now bookings are allowed (skip the calendar) */
  allowAsap: boolean;
};

export type Service = {
  slug: string;
  name: string;
  tagline: string;
  description: string;
  icon: LucideIcon;
  examples: string[];
  /** Indicative price guide in USD, used before live provider rates exist */
  estimate: { from: number; to: number; unit: "hour" | "job" | "trip" };
  /** Show on the homepage "Popular services" grid */
  popular?: boolean;
  scheduling: SchedulingRules;
};

const defaultRules: SchedulingRules = {
  hoursStart: 8,
  hoursEnd: 18,
  slotMinutes: 60,
  leadHours: 2,
  maxDaysAhead: 14,
  workingDays: [1, 2, 3, 4, 5, 6],
  allowAsap: true,
};

const rules = (overrides: Partial<SchedulingRules> = {}): SchedulingRules => ({
  ...defaultRules,
  ...overrides,
});

export const services: Service[] = [
  {
    slug: "deliveries",
    name: "Delivery",
    tagline: "Same-day parcel & food runs",
    description: "Send anything, anywhere in town. Track your rider in real time.",
    icon: Bike,
    examples: ["Parcels", "Groceries", "Food", "Documents"],
    estimate: { from: 3, to: 12, unit: "trip" },
    popular: true,
    scheduling: rules({ hoursStart: 7, hoursEnd: 21, slotMinutes: 30, leadHours: 1, workingDays: [0, 1, 2, 3, 4, 5, 6] }),
  },
  {
    slug: "plumbing",
    name: "Plumbing",
    tagline: "Leaks fixed, fast",
    description: "Burst pipes, blocked drains, geysers and taps handled by qualified plumbers.",
    icon: Droplets,
    examples: ["Leaking taps", "Blocked drains", "Geysers", "Pipe bursts"],
    estimate: { from: 15, to: 45, unit: "hour" },
    popular: true,
    scheduling: rules({ hoursStart: 7, hoursEnd: 18, leadHours: 1 }),
  },
  {
    slug: "electrical",
    name: "Electrical",
    tagline: "Safe, certified wiring",
    description: "Certified electricians for faults, DB boards, sockets, lighting and inspections.",
    icon: Zap,
    examples: ["Fault finding", "DB boards", "Lighting", "Sockets"],
    estimate: { from: 20, to: 55, unit: "hour" },
    popular: true,
    scheduling: rules({ hoursStart: 7, hoursEnd: 18, leadHours: 1 }),
  },
  {
    slug: "cleaning",
    name: "Cleaning",
    tagline: "A sparkling home, on demand",
    description: "Home, office and post-event cleaning by vetted pros.",
    icon: Sparkles,
    examples: ["Home", "Office", "Deep clean"],
    estimate: { from: 25, to: 90, unit: "job" },
    popular: true,
    scheduling: rules({ hoursStart: 8, hoursEnd: 16, slotMinutes: 120, leadHours: 4, allowAsap: false }),
  },
  {
    slug: "painting",
    name: "Painting",
    tagline: "Fresh walls, clean finish",
    description: "Interior and exterior painting, waterproofing and touch-ups.",
    icon: PaintRoller,
    examples: ["Interior", "Exterior", "Waterproofing"],
    estimate: { from: 60, to: 400, unit: "job" },
    scheduling: rules({ hoursStart: 7, hoursEnd: 16, slotMinutes: 240, leadHours: 24, allowAsap: false }),
  },
  {
    slug: "carpentry",
    name: "Carpentry",
    tagline: "Built to last",
    description: "Custom furniture, doors, ceilings, cupboards and on-site repairs.",
    icon: Hammer,
    examples: ["Doors", "Cupboards", "Ceilings", "Furniture"],
    estimate: { from: 20, to: 60, unit: "hour" },
    scheduling: rules({ hoursStart: 7, hoursEnd: 17, leadHours: 6, allowAsap: false }),
  },
  {
    slug: "welding",
    name: "Welding",
    tagline: "Gates, grills and steelwork",
    description: "Mobile welders for gates, burglar bars, tanks stands and structural repairs.",
    icon: Flame,
    examples: ["Gates", "Burglar bars", "Tank stands"],
    estimate: { from: 25, to: 70, unit: "hour" },
    scheduling: rules({ hoursStart: 7, hoursEnd: 17, leadHours: 6 }),
  },
  {
    slug: "mechanic",
    name: "Mechanic",
    tagline: "Roadside and workshop",
    description: "Diagnostics, servicing, tyres and breakdown recovery wherever you are.",
    icon: Cog,
    examples: ["Servicing", "Diagnostics", "Tyres", "Breakdown"],
    estimate: { from: 20, to: 80, unit: "job" },
    popular: true,
    scheduling: rules({ hoursStart: 7, hoursEnd: 18, leadHours: 1, workingDays: [0, 1, 2, 3, 4, 5, 6] }),
  },
  {
    slug: "solar",
    name: "Solar Installation",
    tagline: "Power through load-shedding",
    description: "Solar panels, inverters, lithium batteries and system servicing.",
    icon: Sun,
    examples: ["Panels", "Inverters", "Batteries", "Servicing"],
    estimate: { from: 150, to: 1500, unit: "job" },
    popular: true,
    scheduling: rules({ hoursStart: 7, hoursEnd: 17, slotMinutes: 240, leadHours: 24, maxDaysAhead: 30, allowAsap: false }),
  },
  {
    slug: "borehole",
    name: "Borehole Repairs",
    tagline: "Water, restored",
    description: "Borehole drilling support, pump repairs, casings, tanks and pressure systems.",
    icon: Waves,
    examples: ["Pump repairs", "Casing", "Tanks", "Pressure systems"],
    estimate: { from: 80, to: 600, unit: "job" },
    scheduling: rules({ hoursStart: 7, hoursEnd: 16, slotMinutes: 240, leadHours: 24, maxDaysAhead: 30, allowAsap: false }),
  },
  {
    slug: "appliance-repairs",
    name: "Appliance Repairs",
    tagline: "Fixed, not replaced",
    description: "Fridges, stoves, washing machines, microwaves and TVs repaired at home.",
    icon: Refrigerator,
    examples: ["Fridges", "Stoves", "Washing machines", "TVs"],
    estimate: { from: 15, to: 70, unit: "job" },
    scheduling: rules({ hoursStart: 8, hoursEnd: 17, leadHours: 3 }),
  },
  {
    slug: "wifi-installation",
    name: "WiFi Installation",
    tagline: "Strong signal, everywhere",
    description: "Router setup, mesh extensions, cabling and dead-spot fixes for home or office.",
    icon: Wifi,
    examples: ["Router setup", "Mesh", "Cabling", "Dead spots"],
    estimate: { from: 20, to: 120, unit: "job" },
    scheduling: rules({ hoursStart: 8, hoursEnd: 18, leadHours: 2 }),
  },
  {
    slug: "it-services",
    name: "IT Services",
    tagline: "Tech support that shows up",
    description: "Laptop repairs, data recovery, software setup and small-business IT support.",
    icon: MonitorSmartphone,
    examples: ["Laptop repairs", "Data recovery", "Software setup"],
    estimate: { from: 20, to: 80, unit: "hour" },
    scheduling: rules({ hoursStart: 8, hoursEnd: 18, leadHours: 2 }),
  },
  {
    slug: "tutors",
    name: "Tutors",
    tagline: "Grades that climb",
    description: "ZIMSEC and Cambridge tutors for primary, secondary and university subjects.",
    icon: GraduationCap,
    examples: ["Maths", "Sciences", "English", "University"],
    estimate: { from: 8, to: 30, unit: "hour" },
    scheduling: rules({ hoursStart: 8, hoursEnd: 20, leadHours: 12, maxDaysAhead: 30, allowAsap: false }),
  },
  {
    slug: "beauty",
    name: "Beauty Services",
    tagline: "Glow up, at home",
    description: "Hair, nails, makeup and skincare professionals on call.",
    icon: Scissors,
    examples: ["Hair", "Nails", "Makeup"],
    estimate: { from: 10, to: 80, unit: "job" },
    popular: true,
    scheduling: rules({ hoursStart: 9, hoursEnd: 19, slotMinutes: 60, leadHours: 2 }),
  },
  {
    slug: "gardening",
    name: "Gardening",
    tagline: "Neat lawns, healthy plants",
    description: "Lawn care, tree cutting, landscaping and garden maintenance.",
    icon: Sprout,
    examples: ["Lawn care", "Tree cutting", "Landscaping"],
    estimate: { from: 15, to: 90, unit: "job" },
    scheduling: rules({ hoursStart: 7, hoursEnd: 16, slotMinutes: 120, leadHours: 6, allowAsap: false }),
  },
  {
    slug: "security",
    name: "Security",
    tagline: "Peace of mind, day and night",
    description: "Guards, alarm systems, CCTV installation and electric fencing.",
    icon: ShieldCheck,
    examples: ["Guards", "CCTV", "Alarms", "Electric fence"],
    estimate: { from: 50, to: 500, unit: "job" },
    scheduling: rules({ hoursStart: 0, hoursEnd: 24, leadHours: 6, workingDays: [0, 1, 2, 3, 4, 5, 6] }),
  },
  {
    slug: "moving",
    name: "Moving Services",
    tagline: "Move without the stress",
    description: "Trucks, movers and packing help for homes and offices.",
    icon: Truck,
    examples: ["House moves", "Office moves", "Packing", "Truck hire"],
    estimate: { from: 40, to: 350, unit: "job" },
    scheduling: rules({ hoursStart: 6, hoursEnd: 17, slotMinutes: 240, leadHours: 12, maxDaysAhead: 30, allowAsap: false }),
  },
  {
    slug: "transport",
    name: "Transport",
    tagline: "Rides you can trust",
    description: "Verified drivers, transparent pricing, cashless payments.",
    icon: Car,
    examples: ["City rides", "Airport", "Inter-town"],
    estimate: { from: 2, to: 40, unit: "trip" },
    scheduling: rules({ hoursStart: 5, hoursEnd: 23, slotMinutes: 15, leadHours: 0, workingDays: [0, 1, 2, 3, 4, 5, 6] }),
  },
  {
    slug: "repairs",
    name: "General Repairs",
    tagline: "Fix it today",
    description: "Handyman work, phone repair and odd jobs by vetted specialists.",
    icon: Wrench,
    examples: ["Handyman", "Phones", "Odd jobs"],
    estimate: { from: 12, to: 45, unit: "hour" },
    scheduling: rules({ hoursStart: 8, hoursEnd: 17, slotMinutes: 60, leadHours: 3 }),
  },
  {
    slug: "farming",
    name: "Farming",
    tagline: "Hands on the land",
    description: "Tractor hire, harvesting, irrigation and farm labour.",
    icon: Sprout,
    examples: ["Tractor hire", "Labour", "Irrigation"],
    estimate: { from: 30, to: 400, unit: "job" },
    scheduling: rules({ hoursStart: 6, hoursEnd: 16, slotMinutes: 240, leadHours: 24, maxDaysAhead: 30, allowAsap: false }),
  },
  {
    slug: "freelance",
    name: "Freelance",
    tagline: "Skilled hands, on demand",
    description: "Designers, developers, tutors and writers ready to work.",
    icon: Laptop,
    examples: ["Design", "Dev", "Writing"],
    estimate: { from: 15, to: 60, unit: "hour" },
    scheduling: rules({ hoursStart: 9, hoursEnd: 18, slotMinutes: 60, leadHours: 12, maxDaysAhead: 30, workingDays: [1, 2, 3, 4, 5], allowAsap: false }),
  },
  {
    slug: "emergency",
    name: "Emergency",
    tagline: "Help when it matters",
    description: "Roadside, locksmith, medical transport and urgent response.",
    icon: Siren,
    examples: ["Roadside", "Locksmith", "Medical"],
    estimate: { from: 20, to: 150, unit: "job" },
    scheduling: rules({ hoursStart: 0, hoursEnd: 24, slotMinutes: 15, leadHours: 0, maxDaysAhead: 1, workingDays: [0, 1, 2, 3, 4, 5, 6] }),
  },
  {
    slug: "customer-service",
    name: "Customer Service",
    tagline: "Real people, real help",
    description: "Book a trained customer service agent for calls, chats, complaints handling and account support.",
    icon: Headphones,
    examples: ["Phone support", "Live chat", "Complaints", "Onboarding calls"],
    estimate: { from: 8, to: 25, unit: "hour" },
    scheduling: rules({ hoursStart: 8, hoursEnd: 20, slotMinutes: 30, leadHours: 1, workingDays: [1, 2, 3, 4, 5, 6] }),
  },
];

export const popularServices = services.filter((s) => s.popular);

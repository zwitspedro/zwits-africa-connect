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
    name: "Deliveries",
    tagline: "Same-day parcel & food runs",
    description: "Send anything, anywhere in town. Track your rider in real time.",
    icon: Bike,
    examples: ["Parcels", "Groceries", "Food", "Documents"],
    scheduling: rules({ hoursStart: 7, hoursEnd: 21, slotMinutes: 30, leadHours: 1, workingDays: [0, 1, 2, 3, 4, 5, 6] }),
  },
  {
    slug: "transport",
    name: "Transport",
    tagline: "Rides you can trust",
    description: "Verified drivers, transparent pricing, cashless payments.",
    icon: Car,
    examples: ["City rides", "Airport", "Inter-town"],
    scheduling: rules({ hoursStart: 5, hoursEnd: 23, slotMinutes: 15, leadHours: 0, workingDays: [0, 1, 2, 3, 4, 5, 6] }),
  },
  {
    slug: "repairs",
    name: "Repairs",
    tagline: "Fix it today",
    description: "Plumbers, electricians, appliance and phone repair specialists.",
    icon: Wrench,
    examples: ["Plumbing", "Electrical", "Phones", "Appliances"],
    scheduling: rules({ hoursStart: 8, hoursEnd: 17, slotMinutes: 60, leadHours: 3 }),
  },
  {
    slug: "cleaning",
    name: "Cleaning",
    tagline: "A sparkling home, on demand",
    description: "Home, office and post-event cleaning by vetted pros.",
    icon: Sparkles,
    examples: ["Home", "Office", "Deep clean"],
    scheduling: rules({ hoursStart: 8, hoursEnd: 16, slotMinutes: 120, leadHours: 4, allowAsap: false }),
  },
  {
    slug: "farming",
    name: "Farming",
    tagline: "Hands on the land",
    description: "Tractor hire, harvesting, irrigation and farm labour.",
    icon: Sprout,
    examples: ["Tractor hire", "Labour", "Irrigation"],
    scheduling: rules({ hoursStart: 6, hoursEnd: 16, slotMinutes: 240, leadHours: 24, maxDaysAhead: 30, allowAsap: false }),
  },
  {
    slug: "beauty",
    name: "Beauty",
    tagline: "Glow up, at home",
    description: "Hair, nails, makeup and skincare professionals on call.",
    icon: Scissors,
    examples: ["Hair", "Nails", "Makeup"],
    scheduling: rules({ hoursStart: 9, hoursEnd: 19, slotMinutes: 60, leadHours: 2 }),
  },
  {
    slug: "freelance",
    name: "Freelance",
    tagline: "Skilled hands, on demand",
    description: "Designers, developers, tutors and writers ready to work.",
    icon: Laptop,
    examples: ["Design", "Dev", "Tutoring", "Writing"],
    scheduling: rules({ hoursStart: 9, hoursEnd: 18, slotMinutes: 60, leadHours: 12, maxDaysAhead: 30, workingDays: [1, 2, 3, 4, 5], allowAsap: false }),
  },
  {
    slug: "emergency",
    name: "Emergency",
    tagline: "Help when it matters",
    description: "Roadside, locksmith, medical transport and urgent response.",
    icon: Siren,
    examples: ["Roadside", "Locksmith", "Medical"],
    scheduling: rules({ hoursStart: 0, hoursEnd: 24, slotMinutes: 15, leadHours: 0, maxDaysAhead: 1, workingDays: [0, 1, 2, 3, 4, 5, 6] }),
  },
  {
    slug: "customer-service",
    name: "Customer Service",
    tagline: "Real people, real help",
    description: "Book a trained customer service agent for calls, chats, complaints handling and account support.",
    icon: Headphones,
    examples: ["Phone support", "Live chat", "Complaints", "Onboarding calls"],
    scheduling: rules({ hoursStart: 8, hoursEnd: 20, slotMinutes: 30, leadHours: 1, workingDays: [1, 2, 3, 4, 5, 6] }),
  },
];


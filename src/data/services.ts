import {
  Bike,
  Car,
  Wrench,
  Sparkles,
  Sprout,
  Scissors,
  Laptop,
  Siren,
  type LucideIcon,
} from "lucide-react";

export type Service = {
  slug: string;
  name: string;
  tagline: string;
  description: string;
  icon: LucideIcon;
  examples: string[];
};

export const services: Service[] = [
  {
    slug: "deliveries",
    name: "Deliveries",
    tagline: "Same-day parcel & food runs",
    description: "Send anything, anywhere in town. Track your rider in real time.",
    icon: Bike,
    examples: ["Parcels", "Groceries", "Food", "Documents"],
  },
  {
    slug: "transport",
    name: "Transport",
    tagline: "Rides you can trust",
    description: "Verified drivers, transparent pricing, cashless payments.",
    icon: Car,
    examples: ["City rides", "Airport", "Inter-town"],
  },
  {
    slug: "repairs",
    name: "Repairs",
    tagline: "Fix it today",
    description: "Plumbers, electricians, appliance and phone repair specialists.",
    icon: Wrench,
    examples: ["Plumbing", "Electrical", "Phones", "Appliances"],
  },
  {
    slug: "cleaning",
    name: "Cleaning",
    tagline: "A sparkling home, on demand",
    description: "Home, office and post-event cleaning by vetted pros.",
    icon: Sparkles,
    examples: ["Home", "Office", "Deep clean"],
  },
  {
    slug: "farming",
    name: "Farming",
    tagline: "Hands on the land",
    description: "Tractor hire, harvesting, irrigation and farm labour.",
    icon: Sprout,
    examples: ["Tractor hire", "Labour", "Irrigation"],
  },
  {
    slug: "beauty",
    name: "Beauty",
    tagline: "Glow up, at home",
    description: "Hair, nails, makeup and skincare professionals on call.",
    icon: Scissors,
    examples: ["Hair", "Nails", "Makeup"],
  },
  {
    slug: "freelance",
    name: "Freelance",
    tagline: "Skilled hands, on demand",
    description: "Designers, developers, tutors and writers ready to work.",
    icon: Laptop,
    examples: ["Design", "Dev", "Tutoring", "Writing"],
  },
  {
    slug: "emergency",
    name: "Emergency",
    tagline: "Help when it matters",
    description: "Roadside, locksmith, medical transport and urgent response.",
    icon: Siren,
    examples: ["Roadside", "Locksmith", "Medical"],
  },
];

import {
  User,
  Hammer,
  Truck,
  Building2,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";

export type AppRole = "customer" | "provider" | "driver" | "business" | "admin";

export type RoleMeta = {
  role: AppRole;
  label: string;
  portal: string;
  description: string;
  icon: LucideIcon;
  /** Landing route for this portal. */
  home: string;
  /** Route that lets a user activate this role. */
  join?: string;
  /** Roles a user may self-activate from the switcher. */
  selfServe: boolean;
};

export const ROLES: Record<AppRole, RoleMeta> = {
  customer: {
    role: "customer",
    label: "Customer",
    portal: "Customer portal",
    description: "Book services and deliveries, track orders and pay.",
    icon: User,
    home: "/dashboard",
    selfServe: true,
  },
  provider: {
    role: "provider",
    label: "Service provider",
    portal: "Provider portal",
    description: "Win jobs, manage your calendar and grow your business.",
    icon: Hammer,
    home: "/provider/dashboard",
    join: "/provider/setup",
    selfServe: false,
  },
  driver: {
    role: "driver",
    label: "Delivery driver",
    portal: "Driver portal",
    description: "Accept deliveries, navigate routes and track earnings.",
    icon: Truck,
    home: "/driver",
    join: "/driver",
    selfServe: true,
  },
  business: {
    role: "business",
    label: "Business",
    portal: "Business portal",
    description: "Bulk bookings, employee accounts and company invoicing.",
    icon: Building2,
    home: "/business-portal",
    join: "/business-portal",
    selfServe: true,
  },
  admin: {
    role: "admin",
    label: "Administrator",
    portal: "Admin control center",
    description: "Full visibility and control across the platform.",
    icon: ShieldCheck,
    home: "/admin",
    selfServe: false,
  },
};

/** Priority order used to pick a default portal after sign-in. */
export const ROLE_PRIORITY: AppRole[] = ["admin", "provider", "driver", "business", "customer"];

export const ACTIVE_ROLE_KEY = "zwits.activeRole";

export function pickDefaultRole(roles: AppRole[]): AppRole {
  for (const r of ROLE_PRIORITY) if (roles.includes(r)) return r;
  return "customer";
}

export function homeForRoles(roles: AppRole[]): string {
  return ROLES[pickDefaultRole(roles)].home;
}

/**
 * Client/server mirror of the booking state machine that Postgres enforces
 * (`public.booking_transition_allowed`). The database is the authority — this
 * module exists so UI and server code can pre-check a move and so the engine
 * test suite can assert both implementations agree.
 *
 * Legacy spellings are kept as synonyms of the canonical stages:
 *   requested === pending, travelling === provider_arriving
 */
export type BookingStage =
  | "pending"
  | "matching"
  | "offered"
  | "accepted"
  | "provider_arriving"
  | "arrived"
  | "in_progress"
  | "completed"
  | "cancelled"
  | "disputed"
  | "refunded";

export function canonicalBookingStatus(status: string): string {
  if (status === "requested") return "pending";
  if (status === "travelling") return "provider_arriving";
  return status;
}

const BOOKING_TRANSITIONS: Record<string, string[]> = {
  pending: ["matching", "offered", "accepted", "cancelled"],
  matching: ["offered", "accepted", "pending", "cancelled"],
  offered: ["accepted", "matching", "pending", "cancelled"],
  accepted: ["provider_arriving", "cancelled"],
  provider_arriving: ["arrived", "cancelled"],
  arrived: ["in_progress", "cancelled"],
  in_progress: ["completed", "cancelled"],
  completed: ["disputed"],
  disputed: ["refunded", "completed"],
  cancelled: [],
  refunded: [],
};

export function bookingTransitionAllowed(oldStatus: string, newStatus: string): boolean {
  const o = canonicalBookingStatus(oldStatus);
  const n = canonicalBookingStatus(newStatus);
  if (o === n) return true;
  return (BOOKING_TRANSITIONS[o] ?? []).includes(n);
}

const DELIVERY_TRANSITIONS: Record<string, string[]> = {
  pending: ["matching", "offered", "accepted", "cancelled"],
  matching: ["offered", "accepted", "pending", "cancelled"],
  offered: ["accepted", "matching", "pending", "cancelled"],
  accepted: ["arriving", "picked_up", "cancelled"],
  arriving: ["picked_up", "cancelled"],
  picked_up: ["delivered", "cancelled"],
  delivered: ["disputed"],
  disputed: ["refunded", "delivered"],
  cancelled: [],
  refunded: [],
};

export function deliveryTransitionAllowed(oldStatus: string, newStatus: string): boolean {
  if (oldStatus === newStatus) return true;
  return (DELIVERY_TRANSITIONS[oldStatus] ?? []).includes(newStatus);
}

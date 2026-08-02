/**
 * Single source of truth for the Zwits job lifecycle.
 * Shared by the provider portal, customer tracking and dispatch code so the
 * stage names, ordering and next-action copy never drift apart.
 */
export type JobStatus =
  | "pending"
  | "accepted"
  | "travelling"
  | "arrived"
  | "in_progress"
  | "completed"
  | "cancelled";

export const LIFECYCLE: JobStatus[] = [
  "pending",
  "accepted",
  "travelling",
  "arrived",
  "in_progress",
  "completed",
];

/** Statuses that mean the provider still has work to do. */
export const OPEN_STATUSES: JobStatus[] = [
  "pending",
  "accepted",
  "travelling",
  "arrived",
  "in_progress",
];

export const STATUS_LABEL: Record<JobStatus, string> = {
  pending: "Requested",
  accepted: "Accepted",
  travelling: "On the way",
  arrived: "Arrived",
  in_progress: "In progress",
  completed: "Completed",
  cancelled: "Cancelled",
};

/** Short line shown to the customer while tracking. */
export const CUSTOMER_STATUS_COPY: Record<JobStatus, string> = {
  pending: "Finding a provider for you",
  accepted: "Provider accepted your job",
  travelling: "Your provider is on the way",
  arrived: "Your provider has arrived",
  in_progress: "Work in progress",
  completed: "Job completed",
  cancelled: "Job cancelled",
};

/** The one big button the provider should tap next, if any. */
export const NEXT_ACTION: Partial<Record<JobStatus, { label: string; next: JobStatus }>> = {
  accepted: { label: "I'm on my way", next: "travelling" },
  travelling: { label: "I've arrived", next: "arrived" },
  arrived: { label: "Start job", next: "in_progress" },
  in_progress: { label: "Complete job", next: "completed" },
};

export const stageIndex = (status: string) => LIFECYCLE.indexOf(status as JobStatus);

export const isOpen = (status: string) => OPEN_STATUSES.includes(status as JobStatus);

export const statusLabel = (status: string) =>
  STATUS_LABEL[status as JobStatus] ?? String(status).replace(/_/g, " ");

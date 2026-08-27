import { createFileRoute, redirect } from "@tanstack/react-router";

/** Canonical disputes URL — reuses the existing operations queue, open filter. */
export const Route = createFileRoute("/_authenticated/admin/disputes")({
  beforeLoad: () => {
    throw redirect({ to: "/admin/operations", search: { tab: "disputes" } });
  },
});

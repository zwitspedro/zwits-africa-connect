import { createFileRoute, redirect } from "@tanstack/react-router";

/** Canonical pending-review URL — reuses the provider verification queue. */
export const Route = createFileRoute("/_authenticated/admin/review")({
  beforeLoad: () => {
    throw redirect({ to: "/admin/providers", search: { status: "pending" } });
  },
});

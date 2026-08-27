import { createFileRoute, redirect } from "@tanstack/react-router";

/** Canonical withdrawals URL — reuses the existing payout queue. */
export const Route = createFileRoute("/_authenticated/admin/withdrawals")({
  beforeLoad: () => {
    throw redirect({ to: "/admin/operations", search: { tab: "withdrawals" } });
  },
});

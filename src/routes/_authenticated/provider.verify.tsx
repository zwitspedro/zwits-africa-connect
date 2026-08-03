import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/provider/verify")({
  beforeLoad: () => {
    throw redirect({ to: "/provider/setup", replace: true });
  },
});

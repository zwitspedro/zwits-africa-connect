import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/provider/apply")({
  beforeLoad: ({ location }) => {
    throw redirect({
      to: "/provider/setup",
      search: (location.search ?? {}) as never,
      hash: location.hash || undefined,
      replace: true,
    });
  },
});

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowRight, Loader2 } from "lucide-react";
import { useRoles } from "@/hooks/use-role";
import { ACTIVE_ROLE_KEY, ROLES, type AppRole } from "@/lib/roles";

export const Route = createFileRoute("/_authenticated/workspace")({
  head: () => ({
    meta: [
      { title: "Choose your workspace — Zwits" },
      { name: "description", content: "Switch between your Zwits customer, provider, driver and business portals." },
      { property: "og:title", content: "Choose your workspace — Zwits" },
      { property: "og:description", content: "Switch between your Zwits portals from one account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: WorkspacePicker,
});

function WorkspacePicker() {
  const navigate = useNavigate();
  const { data: roles, isLoading } = useRoles();

  const enter = (role: AppRole) => {
    localStorage.setItem(ACTIVE_ROLE_KEY, role);
    navigate({ to: ROLES[role].home, replace: true });
  };

  return (
    <div className="relative isolate mx-auto w-full max-w-3xl px-5 py-16 sm:py-24">
      <div className="pointer-events-none absolute inset-0 -z-10 aurora opacity-50" />
      <h1 className="animate-rise font-display text-3xl font-bold tracking-[-0.03em] sm:text-4xl">
        Choose your workspace
      </h1>
      <p className="animate-rise mt-3 text-[15px] text-muted-foreground">
        You can switch between portals at any time from the top bar — one account, every side of Zwits.
      </p>

      {isLoading ? (
        <div className="mt-10 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Loading your portals…
        </div>
      ) : (
        <div className="mt-9 grid gap-3 sm:grid-cols-2">
          {(roles ?? []).map((role, i) => {
            const meta = ROLES[role];
            return (
              <button
                key={role}
                onClick={() => enter(role)}
                style={{ animationDelay: `${i * 70}ms` }}
                className="animate-rise group flex items-start gap-4 rounded-3xl border border-border/70 bg-card/80 p-5 text-left backdrop-blur-xl transition hover:border-primary/60 hover:shadow-[0_20px_50px_-30px_rgba(0,0,0,0.7)]"
              >
                <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-primary/12 text-primary">
                  <meta.icon className="size-5" />
                </span>
                <span className="flex-1">
                  <span className="flex items-center gap-1.5 font-semibold">
                    {meta.portal}
                    <ArrowRight className="size-4 opacity-0 transition group-hover:translate-x-0.5 group-hover:opacity-100" />
                  </span>
                  <span className="mt-1 block text-sm text-muted-foreground">{meta.description}</span>
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

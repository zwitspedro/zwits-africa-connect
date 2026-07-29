import { type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Loader2, Lock } from "lucide-react";
import { toast } from "sonner";
import { useActiveRole, useAddRole } from "@/hooks/use-role";
import { ROLES, type AppRole } from "@/lib/roles";
import { SiteShell } from "@/components/site-shell";

/**
 * Gates a portal to holders of `role`. Self-serve portals offer one-tap
 * activation; reviewed portals link to their application flow.
 */
export function RoleGate({ role, children }: { role: AppRole; children: ReactNode }) {
  const { roles, isLoading, setActiveRole } = useActiveRole();
  const addRole = useAddRole();
  const meta = ROLES[role];

  if (isLoading) {
    return (
      <SiteShell>
        <div className="grid min-h-[60vh] place-items-center text-muted-foreground">
          <Loader2 className="size-5 animate-spin" />
        </div>
      </SiteShell>
    );
  }

  if (roles.includes(role)) return <>{children}</>;

  const join = async () => {
    if (!meta.selfServe) return;
    try {
      await addRole.mutateAsync(role as Exclude<AppRole, "admin">);
      setActiveRole(role);
      toast.success(`${meta.portal} unlocked`);
    } catch {
      toast.error("Could not activate this portal. Please try again.");
    }
  };

  return (
    <SiteShell>
      <section className="mx-auto max-w-xl px-4 py-20 text-center sm:px-6">
        <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-primary/12 text-primary">
          <Lock className="size-6" />
        </span>
        <h1 className="mt-5 font-display text-2xl font-bold">{meta.portal}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{meta.description}</p>

        {meta.selfServe ? (
          <button
            onClick={join}
            disabled={addRole.isPending}
            className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-60"
          >
            {addRole.isPending && <Loader2 className="size-4 animate-spin" />}
            Activate {meta.label.toLowerCase()} account
          </button>
        ) : (
          <Link
            to={meta.join ?? "/"}
            className="mt-6 inline-flex min-h-11 items-center rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
          >
            Apply now
          </Link>
        )}
        <p className="mt-4 text-xs text-muted-foreground">
          You keep one Zwits account — switch between portals any time.
        </p>
      </section>
    </SiteShell>
  );
}

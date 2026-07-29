import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Check, ChevronDown, Plus } from "lucide-react";
import { toast } from "sonner";
import { useActiveRole, useAddRole } from "@/hooks/use-role";
import { ROLES, type AppRole } from "@/lib/roles";

const ORDER: AppRole[] = ["customer", "provider", "driver", "business", "admin"];

export function RoleSwitcher({ compact = false }: { compact?: boolean }) {
  const { activeRole, setActiveRole, roles } = useActiveRole();
  const addRole = useAddRole();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const meta = ROLES[activeRole];
  const mine = ORDER.filter((r) => roles.includes(r));
  const available = ORDER.filter((r) => !roles.includes(r) && ROLES[r].role !== "admin");

  const go = (role: AppRole) => {
    setActiveRole(role);
    setOpen(false);
    navigate({ to: ROLES[role].home });
  };

  const activate = async (role: AppRole) => {
    const target = ROLES[role];
    if (!target.selfServe) {
      setOpen(false);
      navigate({ to: target.join ?? target.home });
      return;
    }
    try {
      await addRole.mutateAsync(role as Exclude<AppRole, "admin">);
      toast.success(`${target.label} portal unlocked`);
      go(role);
    } catch {
      toast.error("Could not activate that portal. Please try again.");
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className={`inline-flex min-h-10 items-center gap-2 rounded-full border border-border/70 bg-card/60 px-3 text-sm transition hover:bg-muted ${
          compact ? "w-full justify-between" : ""
        }`}
      >
        <meta.icon className="size-4 shrink-0 text-primary" />
        <span className="truncate">{meta.label}</span>
        <ChevronDown className={`size-3.5 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <>
          <button className="fixed inset-0 z-40 cursor-default" aria-hidden onClick={() => setOpen(false)} />
          <div
            className={`absolute z-50 mt-2 w-72 overflow-hidden rounded-2xl border border-border bg-card p-1.5 shadow-xl ${
              compact ? "left-0" : "right-0"
            }`}
          >
            <p className="px-3 py-2 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Your portals</p>
            {mine.map((r) => {
              const m = ROLES[r];
              return (
                <button
                  key={r}
                  onClick={() => go(r)}
                  className="grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-muted"
                >
                  <m.icon className="size-4 shrink-0 text-primary" />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">{m.portal}</span>
                    <span className="block truncate text-xs text-muted-foreground">{m.description}</span>
                  </span>
                  {r === activeRole && <Check className="size-4 shrink-0 text-emerald-400" />}
                </button>
              );
            })}

            {available.length > 0 && (
              <>
                <p className="mt-1 border-t border-border/60 px-3 pb-2 pt-3 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                  Add a portal
                </p>
                {available.map((r) => {
                  const m = ROLES[r];
                  return (
                    <button
                      key={r}
                      onClick={() => activate(r)}
                      disabled={addRole.isPending}
                      className="grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-muted disabled:opacity-60"
                    >
                      <m.icon className="size-4 shrink-0 text-muted-foreground" />
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium">Become a {m.label.toLowerCase()}</span>
                        <span className="block truncate text-xs text-muted-foreground">{m.description}</span>
                      </span>
                      <Plus className="size-4 shrink-0 text-muted-foreground" />
                    </button>
                  );
                })}
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}

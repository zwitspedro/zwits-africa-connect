import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
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
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" aria-label="Choose your Zwits portal" className={compact ? "w-full justify-between" : "max-w-48"}>
          <meta.icon aria-hidden="true" className="size-4 shrink-0 text-primary-text" />
          <span className="truncate">{meta.label}</span>
          <ChevronDown aria-hidden="true" className="size-4 shrink-0" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={compact ? "start" : "end"} className="w-72 max-w-[calc(100vw-2rem)]">
        <DropdownMenuLabel>Your portals</DropdownMenuLabel>
        {mine.map((r) => {
          const m = ROLES[r];
          return <DropdownMenuItem key={r} onSelect={() => go(r)} className="min-h-12 gap-3">
            <m.icon aria-hidden="true" className="size-4 shrink-0" />
            <span className="min-w-0 flex-1"><span className="block text-sm font-bold">{m.portal}</span><span className="block text-xs text-muted-foreground">{m.description}</span></span>
            {r === activeRole && <Check aria-label="Current portal" className="size-4 text-success" />}
          </DropdownMenuItem>;
        })}
        {available.length > 0 && <>
          <DropdownMenuSeparator />
          <DropdownMenuLabel>Add a portal</DropdownMenuLabel>
          {available.map((r) => {
            const m = ROLES[r];
            return <DropdownMenuItem key={r} onSelect={() => void activate(r)} disabled={addRole.isPending} className="min-h-12 gap-3">
              <m.icon aria-hidden="true" className="size-4 shrink-0" />
              <span className="min-w-0 flex-1"><span className="block text-sm font-bold">Become a {m.label.toLowerCase()}</span><span className="block text-xs text-muted-foreground">{m.description}</span></span>
              <Plus aria-hidden="true" className="size-4 shrink-0" />
            </DropdownMenuItem>;
          })}
        </>}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

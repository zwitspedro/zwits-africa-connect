import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { useActiveRole } from "@/hooks/use-role";

export const Route = createFileRoute("/m/")({ component: MobileEntry });

/** Sends the signed-in user to the app that matches their strongest role. */
function MobileEntry() {
  const { roles, isLoading } = useActiveRole();
  const navigate = useNavigate();

  useEffect(() => {
    if (isLoading) return;
    if (roles.includes("provider")) navigate({ to: "/m/provider", replace: true });
    else if (roles.includes("driver")) navigate({ to: "/m/driver", replace: true });
    else navigate({ to: "/m/customer", replace: true });
  }, [roles, isLoading, navigate]);

  return (
    <div className="grid min-h-[100dvh] place-items-center text-primary">
      <Loader2 className="size-6 animate-spin" />
    </div>
  );
}

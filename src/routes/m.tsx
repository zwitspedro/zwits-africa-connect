import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo } from "react";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { createMobileQueryClient, MobileStateProvider } from "@/mobile/state";
import { useMobileTheme } from "@/mobile/theme";
import { useAuthDeepLinks } from "@/mobile/auth";
import { useOnlineStatus } from "@/mobile/offline";

export const Route = createFileRoute("/m")({
  head: () => ({
    meta: [
      { title: "Zwits Mobile — Services, jobs and deliveries" },
      { name: "description", content: "The Zwits Android experience: book services, run jobs and deliver parcels." },
      { name: "robots", content: "noindex" },
      { name: "theme-color", content: "#0B0B0C" },
    ],
  }),
  component: MobileRoot,
});

function MobileRoot() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const client = useMemo(() => createMobileQueryClient(), []);

  useMobileTheme();
  useAuthDeepLinks();
  const { online } = useOnlineStatus();

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [loading, user, navigate]);

  if (loading || !user) {
    return (
      <div className="zwits-mobile grid min-h-[100dvh] place-items-center bg-background text-primary">
        <Loader2 className="size-6 animate-spin" />
      </div>
    );
  }

  return (
    <MobileStateProvider client={client}>
      <div className="zwits-mobile min-h-[100dvh] bg-background text-foreground antialiased">
        {!online && (
          <div className="sticky top-0 z-50 bg-amber-500 px-4 py-1.5 text-center text-[11px] font-medium text-black">
            Offline — showing your last sync
          </div>
        )}
        <Outlet />
      </div>
    </MobileStateProvider>
  );
}

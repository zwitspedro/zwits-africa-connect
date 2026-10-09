import { useRouterState } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { SiteHeader } from "./site-header";
import { SiteFooter } from "./site-footer";
import { InstallPrompt } from "./install-prompt";

export function SiteShell({ children }: { children: ReactNode }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const experience = path.startsWith("/admin") ? "admin" : path.startsWith("/provider") || path.startsWith("/become-a-provider") ? "provider" : path.startsWith("/driver") ? "driver" : "customer";
  return (
    <div data-experience={experience} className="flex min-h-dvh flex-col bg-background text-foreground">
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
      <InstallPrompt />
    </div>
  );
}

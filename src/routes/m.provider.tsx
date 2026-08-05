import { createFileRoute, Outlet } from "@tanstack/react-router";
import { Briefcase, CalendarDays, LayoutDashboard, MessageSquare, User } from "lucide-react";
import { RoleGate } from "@/components/portal/role-gate";
import { useAuth } from "@/hooks/use-auth";
import { useUnreadCount } from "@/mobile/notifications";
import { TabBar } from "@/mobile/ui";

export const Route = createFileRoute("/m/provider")({ component: ProviderApp });

function ProviderApp() {
  const { user } = useAuth();
  const unread = useUnreadCount(user?.id);

  return (
    <RoleGate role="provider">
      <Outlet />
      <TabBar
        items={[
          { to: "/m/provider", label: "Dashboard", icon: LayoutDashboard },
          { to: "/m/provider/jobs", label: "Jobs", icon: Briefcase },
          { to: "/m/provider/calendar", label: "Calendar", icon: CalendarDays },
          { to: "/m/provider/messages", label: "Messages", icon: MessageSquare, badge: unread },
          { to: "/m/provider/profile", label: "Profile", icon: User },
        ]}
      />
    </RoleGate>
  );
}

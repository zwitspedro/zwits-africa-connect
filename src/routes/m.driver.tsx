import { createFileRoute, Outlet } from "@tanstack/react-router";
import { LayoutDashboard, Map, MessageSquare, Package, User } from "lucide-react";
import { RoleGate } from "@/components/portal/role-gate";
import { useAuth } from "@/hooks/use-auth";
import { useUnreadCount } from "@/mobile/notifications";
import { TabBar } from "@/mobile/ui";

export const Route = createFileRoute("/m/driver")({ component: DriverApp });

function DriverApp() {
  const { user } = useAuth();
  const unread = useUnreadCount(user?.id);

  return (
    <RoleGate role="driver">
      <Outlet />
      <TabBar
        items={[
          { to: "/m/driver", label: "Dashboard", icon: LayoutDashboard },
          { to: "/m/driver/deliveries", label: "Deliveries", icon: Package },
          { to: "/m/driver/map", label: "Map", icon: Map },
          { to: "/m/driver/messages", label: "Messages", icon: MessageSquare, badge: unread },
          { to: "/m/driver/profile", label: "Profile", icon: User },
        ]}
      />
    </RoleGate>
  );
}

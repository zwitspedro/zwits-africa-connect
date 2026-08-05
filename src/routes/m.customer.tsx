import { createFileRoute, Outlet } from "@tanstack/react-router";
import { CalendarCheck, Grid2x2, Home, MessageSquare, User } from "lucide-react";
import { TabBar } from "@/mobile/ui";
import { useAuth } from "@/hooks/use-auth";
import { useUnreadCount } from "@/mobile/notifications";

export const Route = createFileRoute("/m/customer")({ component: CustomerApp });

function CustomerApp() {
  const { user } = useAuth();
  const unread = useUnreadCount(user?.id);

  return (
    <>
      <Outlet />
      <TabBar
        items={[
          { to: "/m/customer", label: "Home", icon: Home },
          { to: "/m/customer/categories", label: "Categories", icon: Grid2x2 },
          { to: "/m/customer/bookings", label: "Bookings", icon: CalendarCheck },
          { to: "/m/customer/messages", label: "Messages", icon: MessageSquare, badge: unread },
          { to: "/m/customer/profile", label: "Profile", icon: User },
        ]}
      />
    </>
  );
}

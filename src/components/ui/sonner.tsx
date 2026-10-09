import { useRouterState } from "@tanstack/react-router";
import { Toaster as Sonner } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const experience = path.includes("/admin") ? "admin" : path.includes("/provider") ? "provider" : path.includes("/driver") ? "driver" : "customer";
  return (
    <div data-experience={experience}>
    <Sonner
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:rounded-xl group-[.toaster]:bg-popover group-[.toaster]:text-popover-foreground group-[.toaster]:border-border group-[.toaster]:shadow-card",
          description: "group-[.toast]:text-muted-foreground",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
        },
      }}
      {...props}
    />
    </div>
  );
};

export { Toaster };

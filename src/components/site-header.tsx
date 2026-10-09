import { Button } from "@/components/ui/button";
import { ZwitsLogo } from "@/components/zwits-logo";
import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Menu, X, Bell, ShieldCheck, ChevronDown, ArrowRight } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { useNotificationsRealtime } from "@/hooks/use-notifications-realtime";
import { useRoles } from "@/hooks/use-role";
import { RoleSwitcher } from "@/components/portal/role-switcher";
import { services } from "@/data/services";

const links = [
  { to: "/delivery", label: "Delivery" },
  { to: "/business", label: "Business" },
  { to: "/faq", label: "Help" },
] as const;

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const [mega, setMega] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { user, signOut } = useAuth();
  const { data: roles } = useRoles();
  const isAdmin = (roles ?? []).includes("admin");
  useNotificationsRealtime({ showToast: true });

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const { data: unread = 0 } = useQuery({
    queryKey: ["notifications-unread", user?.id],
    enabled: !!user,
    refetchInterval: 30_000,
    queryFn: async () => {
      const { count, error } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .is("read_at", null);
      if (error) throw error;
      return count ?? 0;
    },
  });

  return (
    <header
      className={`sticky top-0 z-50 transition-all duration-300 ${
        scrolled
          ? "border-b border-border/60 bg-background/70 backdrop-blur-xl"
          : "border-b border-transparent bg-transparent"
      }`}
    >
      <div className="mx-auto grid h-20 max-w-7xl grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-5 sm:px-8 lg:flex md:justify-between">
        {/* Marketing chrome points at /home; "/" is the data-light entry screen. */}
        <Link to="/home" className="flex min-w-0 items-center gap-2.5">
          <ZwitsLogo />
        </Link>

        <nav aria-label="Primary navigation" className="hidden items-center gap-1 lg:flex" onMouseLeave={() => setMega(false)}>
          <Button variant="ghost"
            onMouseEnter={() => setMega(true)}
            onClick={() => setMega((m) => !m)}
            aria-expanded={mega}
            aria-controls="services-menu"
            className="inline-flex items-center gap-1.5 rounded-md px-3 py-3 text-sm text-muted-foreground transition hover:text-foreground"
          >
            Services
            <ChevronDown className={`size-3.5 transition-transform ${mega ? "rotate-180" : ""}`} />
          </Button>
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              onMouseEnter={() => setMega(false)}
              className="rounded-md px-3 py-3 text-sm text-muted-foreground transition hover:text-foreground"
              activeProps={{ className: "text-foreground", "aria-current": "page" }}
            >
              {l.label}
            </Link>
          ))}

          {mega && (
            <div id="services-menu" className="absolute inset-x-0 top-20 hidden lg:block">
              <div className="mx-auto max-w-7xl px-5 sm:px-8">
                <div className="overflow-hidden rounded-3xl border border-border bg-popover p-6 shadow-card">
                  <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-4">
                    {services.map((s) => {
                      const Icon = s.icon;
                      return (
                        <Link
                          key={s.slug}
                          to="/book/$category"
                          params={{ category: s.slug }}
                          search={{ provider: undefined }}
                          onClick={() => setMega(false)}
                          className="group flex items-start gap-3 rounded-2xl p-3 transition hover:bg-card"
                        >
                          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/12 text-primary-text transition group-hover:bg-primary group-hover:text-primary-foreground">
                            <Icon className="size-4" />
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-semibold">{s.name}</span>
                            <span className="block truncate text-xs text-muted-foreground">{s.tagline}</span>
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                  <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-4">
                    <p className="text-xs text-muted-foreground">More verticals launching soon — Pay, Food, Market, Health.</p>
                    <Link to="/services" onClick={() => setMega(false)} className="inline-flex items-center gap-1.5 text-sm font-medium text-primary-text">
                      All services <ArrowRight className="size-3.5" />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          )}
        </nav>

        <div className="hidden items-center gap-2 lg:flex">
          {user ? (
            <>
              <Link to="/notifications" aria-label="Notifications" className="relative rounded-md p-2 hover:bg-muted">
                <Bell className="size-5" />
                {unread > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-md bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
                    {unread > 9 ? "9+" : unread}
                  </span>
                )}
              </Link>
              <RoleSwitcher />
              {isAdmin && (
                <Link to="/admin" className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-3 py-2 text-sm text-primary-text hover:bg-primary/15">
                  <ShieldCheck className="size-4" /> Admin
                </Link>
              )}
              <Button variant="ghost" onClick={() => signOut()} className="rounded-md glass px-4 py-2 text-sm hover:bg-card">
                Sign out
              </Button>
            </>
          ) : (
            <>
              <Link to="/provider" className="inline-flex min-h-12 items-center rounded-md px-3 py-2 text-sm text-muted-foreground hover:text-foreground">
                For providers
              </Link>
              <Link
                to="/provider-login"
                className="inline-flex min-h-12 items-center rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-muted"
              >
                Provider login
              </Link>
              <Link to="/login" className="inline-flex min-h-12 items-center rounded-md px-3 py-2 text-sm text-muted-foreground hover:text-foreground">
                Sign in
              </Link>
              <Link
                to="/signup"
                className="inline-flex min-h-12 items-center rounded-md bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
              >
                Get started
              </Link>
            </>
          )}
        </div>

        <Button variant="ghost"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          className="justify-self-end rounded-xl p-2 text-foreground lg:hidden"
          onClick={() => setOpen((o) => !o)}
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </Button>
      </div>

      {/* Always-visible mobile journeys — never hidden behind the hamburger. */}
      {!user && (
        <nav aria-label="Mobile quick actions" className="border-t border-border/60 bg-background px-4 py-2 lg:hidden">
          <div className="grid grid-cols-2 gap-2">
            <Link
              to="/services"
              className="inline-flex min-h-12 items-center justify-center rounded-xl bg-primary px-3 text-[13px] font-bold text-primary-foreground"
            >
              Book a service
            </Link>
            <Link
              to="/provider"
              className="inline-flex min-h-12 items-center justify-center rounded-xl border border-border px-3 text-[13px] font-bold"
            >
              Join as a provider
            </Link>
          </div>
          <div className="mt-1.5 flex justify-center gap-4 text-[12px] text-muted-foreground">
            <Link to="/login" className="inline-flex min-h-12 items-center hover:text-foreground">Sign in</Link>
            <Link to="/provider-login" className="inline-flex min-h-12 items-center font-bold text-primary-text">Provider login</Link>
          </div>
        </nav>
      )}


      {open && (
        <div className="border-t border-border/60 bg-background/95 backdrop-blur-xl lg:hidden">
          <nav aria-label="Expanded navigation" className="mx-auto flex max-w-7xl flex-col px-5 py-4 sm:px-8">
            <p className="px-2 pb-2 text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Services</p>
            <div className="grid grid-cols-2 gap-1">
              {services.map((s) => (
                <Link
                  key={s.slug}
                  to="/book/$category"
                  params={{ category: s.slug }}
                  search={{ provider: undefined }}
                  onClick={() => setOpen(false)}
                  className="rounded-xl px-2 py-2.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  {s.name}
                </Link>
              ))}
            </div>
            <p className="mt-4 px-2 pb-1 text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Company</p>
            {links.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                onClick={() => setOpen(false)}
                className="rounded-xl px-2 py-3 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                {l.label}
              </Link>
            ))}
            {user ? (
              <div className="mt-4">
                <p className="px-2 pb-2 text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Portals</p>
                <RoleSwitcher compact />
                <Button variant="ghost"
                  onClick={() => {
                    setOpen(false);
                    signOut();
                  }}
                  className="mt-3 w-full rounded-md border border-border px-4 py-3 text-sm"
                >
                  Sign out
                </Button>
              </div>
            ) : (
              <div className="mt-3 grid gap-2">
                <Link
                  to="/signup"
                  onClick={() => setOpen(false)}
                  className="rounded-md bg-primary px-4 py-3.5 text-center text-sm font-semibold text-primary-foreground"
                >
                  Book a service
                </Link>
                <Link
                  to="/provider"
                  onClick={() => setOpen(false)}
                  className="rounded-md border border-border px-4 py-3.5 text-center text-sm font-semibold"
                >
                  Join as a provider
                </Link>
                <div className="flex justify-center gap-4 pt-1 text-sm">
                  <Link to="/login" onClick={() => setOpen(false)} className="text-muted-foreground">
                    Sign in
                  </Link>
                  <Link to="/provider-login" onClick={() => setOpen(false)} className="font-medium text-primary-text">
                    Provider login
                  </Link>
                </div>
              </div>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}

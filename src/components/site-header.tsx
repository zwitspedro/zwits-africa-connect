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
  { to: "/pricing", label: "Pricing" },
  { to: "/business", label: "Business" },
  { to: "/become-a-provider", label: "Partners" },
  { to: "/about", label: "About" },
  { to: "/contact", label: "Contact" },
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
      <div className="mx-auto grid h-[70px] max-w-7xl grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-5 sm:px-8 md:flex md:justify-between">
        <Link to="/" className="flex min-w-0 items-center gap-2.5">
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary font-display text-lg font-bold text-primary-foreground">
            Z
          </span>
          <span className="truncate font-display text-lg font-bold tracking-tight">Zwits</span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex" onMouseLeave={() => setMega(false)}>
          <button
            onMouseEnter={() => setMega(true)}
            onClick={() => setMega((m) => !m)}
            aria-expanded={mega}
            className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm text-muted-foreground transition hover:text-foreground"
          >
            Services
            <ChevronDown className={`size-3.5 transition-transform ${mega ? "rotate-180" : ""}`} />
          </button>
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              onMouseEnter={() => setMega(false)}
              className="rounded-full px-4 py-2 text-sm text-muted-foreground transition hover:text-foreground"
              activeProps={{ className: "text-foreground" }}
            >
              {l.label}
            </Link>
          ))}

          {mega && (
            <div className="absolute inset-x-0 top-[70px] hidden md:block">
              <div className="mx-auto max-w-7xl px-5 sm:px-8">
                <div className="animate-rise overflow-hidden rounded-3xl glass-strong p-6 shadow-glow">
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
                          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/12 text-primary transition group-hover:bg-primary group-hover:text-primary-foreground">
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
                    <Link to="/services" onClick={() => setMega(false)} className="inline-flex items-center gap-1.5 text-sm font-medium text-primary">
                      All services <ArrowRight className="size-3.5" />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          )}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          {user ? (
            <>
              <Link to="/notifications" aria-label="Notifications" className="relative rounded-full p-2 hover:bg-muted">
                <Bell className="size-5" />
                {unread > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
                    {unread > 9 ? "9+" : unread}
                  </span>
                )}
              </Link>
              <RoleSwitcher />
              {isAdmin && (
                <Link to="/admin" className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-2 text-sm text-primary hover:bg-primary/15">
                  <ShieldCheck className="size-4" /> Admin
                </Link>
              )}
              <button onClick={() => signOut()} className="rounded-full glass px-4 py-2 text-sm hover:bg-card">
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link to="/provider" className="rounded-full px-3 py-2 text-sm text-muted-foreground hover:text-foreground">
                For providers
              </Link>
              <Link
                to="/provider-login"
                className="rounded-full border border-border px-4 py-2 text-sm font-medium hover:bg-muted"
              >
                Provider login
              </Link>
              <Link to="/login" className="rounded-full px-3 py-2 text-sm text-muted-foreground hover:text-foreground">
                Customer login
              </Link>
              <Link
                to="/signup"
                className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
              >
                Book Now
              </Link>
            </>
          )}
        </div>

        <button
          aria-label="Toggle menu"
          className="justify-self-end rounded-xl p-2 text-foreground md:hidden"
          onClick={() => setOpen((o) => !o)}
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

      {/* Always-visible mobile journeys — never hidden behind the hamburger. */}
      {!user && (
        <div className="border-t border-border/60 bg-background/80 px-4 py-2.5 backdrop-blur-xl md:hidden">
          <div className="grid grid-cols-2 gap-2">
            <Link
              to="/services"
              className="inline-flex min-h-11 items-center justify-center rounded-xl bg-primary px-3 text-[13px] font-bold text-primary-foreground"
            >
              Book a service
            </Link>
            <Link
              to="/provider"
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-border px-3 text-[13px] font-bold"
            >
              Join as a provider
            </Link>
          </div>
          <div className="mt-1.5 flex justify-center gap-4 text-[12px] text-muted-foreground">
            <Link to="/login" className="hover:text-foreground">Customer login</Link>
            <Link to="/provider-login" className="font-medium text-primary">Provider login</Link>
          </div>
        </div>
      )}


      {open && (
        <div className="border-t border-border/60 bg-background/95 backdrop-blur-xl md:hidden">
          <nav className="mx-auto flex max-w-7xl flex-col px-5 py-4 sm:px-8">
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
                <button
                  onClick={() => {
                    setOpen(false);
                    signOut();
                  }}
                  className="mt-3 w-full rounded-full border border-border px-4 py-3 text-sm"
                >
                  Sign out
                </button>
              </div>
            ) : (
              <div className="mt-3 grid gap-2">
                <Link
                  to="/signup"
                  onClick={() => setOpen(false)}
                  className="rounded-full bg-primary px-4 py-3.5 text-center text-sm font-semibold text-primary-foreground"
                >
                  Book a service
                </Link>
                <Link
                  to="/provider"
                  onClick={() => setOpen(false)}
                  className="rounded-full border border-border px-4 py-3.5 text-center text-sm font-semibold"
                >
                  Join as a provider
                </Link>
                <div className="flex justify-center gap-4 pt-1 text-sm">
                  <Link to="/login" onClick={() => setOpen(false)} className="text-muted-foreground">
                    Customer login
                  </Link>
                  <Link to="/provider-login" onClick={() => setOpen(false)} className="font-medium text-primary">
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

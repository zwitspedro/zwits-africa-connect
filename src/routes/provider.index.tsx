import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, BadgeCheck, LifeBuoy, LogIn, Smartphone, Truck, UserPlus, Wallet } from "lucide-react";
import { SiteShell } from "@/components/site-shell";
import { useAuth } from "@/hooks/use-auth";

const title = "Zwits Provider — grow your business, receive jobs, get paid";
const description =
  "The Zwits provider hub: log in to your provider dashboard, join as a service provider or delivery driver, and get help with onboarding.";

export const Route = createFileRoute("/provider/")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://www.zwits.co.zw/provider" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://www.zwits.co.zw/provider" }],
  }),
  component: ProviderHub,
});

/** Google Play listing — set once the provider app is published. */
const PLAY_STORE_URL: string | null = null;

function ProviderHub() {
  const { user } = useAuth();

  return (
    <SiteShell>
      <section className="relative isolate overflow-hidden border-b border-border/60">
        <div className="pointer-events-none absolute inset-0 -z-10 aurora opacity-60" />
        <div className="mx-auto w-full max-w-4xl px-5 py-16 sm:px-8 sm:py-24">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-primary">Zwits Provider</p>
          <h1 className="mt-4 font-display text-[2.3rem] font-bold leading-[1.06] tracking-[-0.035em] sm:text-5xl">
            Grow your business. Receive jobs. Get paid.
          </h1>
          <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-muted-foreground md:text-lg">
            One account for every kind of Zwits professional — tradespeople, cleaners, beauty pros,
            freelancers and delivery drivers.
          </p>

          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            <Link
              to={user ? "/provider/dashboard" : "/provider-login"}
              className="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-primary px-6 text-sm font-bold text-primary-foreground transition hover:opacity-90"
            >
              <LogIn className="size-4" /> {user ? "Open provider dashboard" : "Provider login"}
            </Link>
            <Link
              to="/provider-signup"
              className="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl border border-border bg-background/60 px-6 text-sm font-bold transition hover:bg-muted"
            >
              <UserPlus className="size-4" /> Become a provider
            </Link>
            <Link
              to="/provider-login"
              className="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl border border-border bg-background/60 px-6 text-sm font-semibold transition hover:bg-muted"
            >
              <Truck className="size-4" /> Delivery provider login
            </Link>
            <Link
              to="/contact"
              className="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl border border-border bg-background/60 px-6 text-sm font-semibold transition hover:bg-muted"
            >
              <LifeBuoy className="size-4" /> Provider help
            </Link>
          </div>

          <div className="mt-4 rounded-2xl border border-border/70 bg-card/60 p-4">
            <p className="flex items-center gap-2 text-sm font-semibold">
              <Smartphone className="size-4 text-primary" /> Zwits Provider app for Android
            </p>
            {PLAY_STORE_URL ? (
              <a
                href={PLAY_STORE_URL}
                className="mt-3 inline-flex min-h-12 items-center justify-center rounded-2xl bg-foreground px-5 text-sm font-bold text-background"
              >
                Open provider app
              </a>
            ) : (
              <p className="mt-1 text-sm text-muted-foreground">
                Coming soon to Google Play. In the meantime, use the mobile-optimised{" "}
                <Link to="/m/provider" className="font-medium text-primary hover:underline">
                  provider app on the web
                </Link>
                .
              </p>
            )}
          </div>

          <p className="mt-6 text-sm text-muted-foreground">
            Didn&apos;t get your confirmation email?{" "}
            <Link to="/resend-confirmation" className="font-medium text-primary hover:underline">
              Resend it here
            </Link>
            .
          </p>
        </div>
      </section>

      <section className="mx-auto w-full max-w-4xl px-5 py-14 sm:px-8">
        <h2 className="font-display text-2xl font-bold tracking-tight">How it works</h2>
        <ol className="mt-6 grid gap-3 sm:grid-cols-3">
          {[
            { icon: UserPlus, t: "Create your account", d: "Register and confirm your email address." },
            { icon: BadgeCheck, t: "Complete setup", d: "Profile, services, area, documents and payouts." },
            { icon: Wallet, t: "Go online & earn", d: "Receive dispatched jobs and get paid weekly." },
          ].map((s) => (
            <li key={s.t} className="rounded-3xl border border-border/70 bg-card/60 p-5">
              <s.icon className="size-5 text-primary" />
              <p className="mt-3 font-semibold">{s.t}</p>
              <p className="mt-1 text-sm text-muted-foreground">{s.d}</p>
            </li>
          ))}
        </ol>
        <Link
          to="/become-a-provider"
          className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
        >
          Learn more about partnering with Zwits <ArrowRight className="size-4" />
        </Link>
      </section>
    </SiteShell>
  );
}

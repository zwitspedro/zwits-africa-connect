import { createFileRoute } from "@tanstack/react-router";
import { SiteShell } from "@/components/site-shell";
import { PageHero } from "@/components/page-hero";
import { ShieldCheck, Wallet, Star, Clock } from "lucide-react";

export const Route = createFileRoute("/become-a-provider")({
  head: () => ({
    meta: [
      { title: "Become a Provider — Zwits" },
      { name: "description", content: "Earn flexible income on Zwits. Apply to become a verified service provider." },
    ],
  }),
  component: Provider,
});

const perks = [
  { icon: Wallet, title: "Get paid fast", text: "Direct payouts to EcoCash, InnBucks or your bank." },
  { icon: Clock, title: "You set the hours", text: "Toggle availability whenever you're ready to work." },
  { icon: Star, title: "Build a reputation", text: "Great ratings unlock more jobs and bigger earnings." },
  { icon: ShieldCheck, title: "Protected & verified", text: "ID and background checks keep the platform safe." },
];

function Provider() {
  return (
    <SiteShell>
      <PageHero eyebrow="Earn with Zwits" title="Your skill. Your hours. Real income.">
        Join 1,400+ providers earning on Zwits across Zimbabwe.
      </PageHero>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {perks.map((p) => {
            const Icon = p.icon;
            return (
              <div key={p.title} className="rounded-2xl border border-border bg-card p-6">
                <Icon className="size-6 text-primary" />
                <h3 className="mt-4 font-display text-lg font-semibold">{p.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{p.text}</p>
              </div>
            );
          })}
        </div>

        <form className="mt-14 rounded-3xl border border-gold/30 bg-card p-6 md:p-10" onSubmit={(e) => e.preventDefault()}>
          <h2 className="font-display text-3xl font-bold">Apply to join</h2>
          <p className="mt-2 text-muted-foreground">We'll review your application within 48 hours.</p>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <Input label="Full name" />
            <Input label="Phone number" type="tel" />
            <Input label="City" />
            <Input label="Service category" placeholder="e.g. Plumbing, Delivery, Beauty" />
            <Input className="md:col-span-2" label="Tell us about your experience" textarea />
          </div>
          <button className="mt-6 rounded-full bg-gold px-6 py-3 text-sm font-medium text-gold-foreground transition hover:opacity-90">
            Submit application
          </button>
        </form>
      </section>
    </SiteShell>
  );
}

function Input({ label, type = "text", textarea = false, placeholder, className = "" }: { label: string; type?: string; textarea?: boolean; placeholder?: string; className?: string }) {
  return (
    <label className={`grid gap-1.5 ${className}`}>
      <span className="text-xs text-muted-foreground">{label}</span>
      {textarea ? (
        <textarea rows={4} placeholder={placeholder} className="rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-primary" />
      ) : (
        <input type={type} placeholder={placeholder} className="rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-primary" />
      )}
    </label>
  );
}

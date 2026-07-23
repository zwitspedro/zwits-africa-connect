import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { SiteShell } from "@/components/site-shell";
import { PageHero } from "@/components/page-hero";
import { Mail, Phone, MapPin } from "lucide-react";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact — Zwits" },
      { name: "description", content: "Get in touch with the Zwits team for support, partnerships or press." },
      { property: "og:url", content: "https://zwits-africa-connect.lovable.app/contact" },
    ],
    links: [{ rel: "canonical", href: "https://zwits-africa-connect.lovable.app/contact" }],
  }),
  component: Contact,
});

function Contact() {
  const [sent, setSent] = useState(false);
  return (
    <SiteShell>
      <PageHero eyebrow="Contact" title="We'd love to hear from you.">
        Support, partnerships, press — drop us a line and we'll get back within one business day.
      </PageHero>
      <section className="mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 md:grid-cols-[1fr_1.3fr]">
        <div className="space-y-6">
          <Item icon={Mail} title="Email" value="hello@zwits.app" />
          <Item icon={Phone} title="Phone" value="+263 77 000 0000" />
          <Item icon={MapPin} title="HQ" value="Harare, Zimbabwe" />
        </div>
        <form
          onSubmit={(e) => { e.preventDefault(); setSent(true); }}
          className="rounded-3xl border border-border bg-card p-6 md:p-8"
        >
          {sent ? (
            <div className="grid place-items-center py-16 text-center">
              <p className="font-display text-2xl font-semibold">Thanks — message received.</p>
              <p className="mt-2 text-muted-foreground">We'll be in touch shortly.</p>
            </div>
          ) : (
            <div className="grid gap-4">
              <Field label="Name"><input required className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-primary" /></Field>
              <Field label="Email"><input type="email" required className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-primary" /></Field>
              <Field label="Message"><textarea required rows={5} className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-primary" /></Field>
              <button className="mt-2 rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition hover:opacity-90">Send message</button>
            </div>
          )}
        </form>
      </section>
    </SiteShell>
  );
}

function Item({ icon: Icon, title, value }: { icon: typeof Mail; title: string; value: string }) {
  return (
    <div className="flex items-start gap-4 rounded-2xl border border-border bg-card p-5">
      <div className="grid size-10 place-items-center rounded-lg bg-primary/15 text-primary"><Icon className="size-5" /></div>
      <div>
        <p className="text-sm text-muted-foreground">{title}</p>
        <p className="mt-0.5 font-medium">{value}</p>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-1.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

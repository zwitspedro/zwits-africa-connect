import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { SiteShell } from "@/components/site-shell";
import { PageHero } from "@/components/page-hero";
import { Mail, MapPin } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { sendContactMessage } from "@/lib/contact.functions";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact — Zwits" },
      { name: "description", content: "Get in touch with the Zwits team for support, partnerships or press." },
      { property: "og:url", content: "https://www.zwits.co.zw/contact" },
    ],
    links: [{ rel: "canonical", href: "https://www.zwits.co.zw/contact" }],
  }),
  component: Contact,
});

function Contact() {
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const send = useServerFn(sendContactMessage);
  return (
    <SiteShell>
      <PageHero eyebrow="Contact" title="We'd love to hear from you.">
        Support, partnerships, press — send us a message and our team will reply by email.
      </PageHero>
      <section className="mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 md:grid-cols-[1fr_1.3fr]">
        <div className="space-y-6">
          <Item icon={MapPin} title="HQ" value="Harare, Zimbabwe" />
        </div>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            setBusy(true);
            setErr(null);
            try {
              await send({ data: { name: String(f.get("name")), email: String(f.get("email")), message: String(f.get("message")) } });
              setSent(true);
            } catch (x: any) {
              setErr(x?.message ?? "Could not send your message.");
            } finally {
              setBusy(false);
            }
          }}
          className="rounded-3xl border border-border bg-card p-6 md:p-8"
        >
          {sent ? (
            <div className="grid place-items-center py-16 text-center">
              <p className="font-display text-2xl font-semibold">Thanks — message received.</p>
              <p className="mt-2 text-muted-foreground">We'll reply to the email you gave us.</p>
            </div>
          ) : (
            <div className="grid gap-4">
              <Field label="Name"><input name="name" required maxLength={120} className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-primary" /></Field>
              <Field label="Email"><input name="email" type="email" required maxLength={254} className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-primary" /></Field>
              <Field label="Message"><textarea name="message" required maxLength={4000} rows={5} className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-primary" /></Field>
              {err && <p className="text-sm text-destructive">{err}</p>}
              <button disabled={busy} className="mt-2 rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-50">{busy ? "Sending…" : "Send message"}</button>
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

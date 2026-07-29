import { useState } from "react";
import { toast } from "sonner";
import { LifeBuoy, Mail, MessageCircleQuestion, Phone } from "lucide-react";
import { Panel } from "./dashboard-kit";

const FAQ = [
  { q: "How do I get more job offers?", a: "Stay online, keep your response time under 15 seconds, and maintain a 4.5+ rating. Dispatch sends first-wave offers to the nearest, highest-rated available providers." },
  { q: "When do I get paid?", a: "Your net payout is released to your wallet once the customer confirms the job is complete. Withdrawals to bank or mobile money are coming soon." },
  { q: "How is commission calculated?", a: "Each category has a commission percentage plus a minimum fee. You can see the exact split for every job in Earnings." },
  { q: "What happens if I cancel a job?", a: "Frequent cancellations lower your acceptance and completion rates, which reduces how often you receive first-wave offers." },
  { q: "How do I get verified?", a: "Upload your national ID, a selfie and a business document in Documents. Verification is usually instant once all three are valid." },
];

export function SupportSection() {
  const [open, setOpen] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  return (
    <div className="grid gap-4">
      <Panel title="Contact support" description="We usually reply within a few hours." action={<LifeBuoy className="size-4 text-primary" />}>
        <div className="grid gap-3 sm:grid-cols-2">
          <a href="mailto:support@zwits.co.zw" className="flex items-center gap-3 rounded-2xl border border-border/70 bg-background/40 p-4 transition-colors hover:border-primary/40">
            <Mail className="size-5 text-primary" />
            <div className="min-w-0">
              <div className="text-sm font-medium">Email support</div>
              <div className="truncate text-[11px] text-muted-foreground">support@zwits.co.zw</div>
            </div>
          </a>
          <a href="tel:+263000000000" className="flex items-center gap-3 rounded-2xl border border-border/70 bg-background/40 p-4 transition-colors hover:border-primary/40">
            <Phone className="size-5 text-primary" />
            <div className="min-w-0">
              <div className="text-sm font-medium">Call the provider line</div>
              <div className="truncate text-[11px] text-muted-foreground">Mon–Sat, 8am–6pm</div>
            </div>
          </a>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!message.trim()) return;
            window.location.href = `mailto:support@zwits.co.zw?subject=Provider%20support&body=${encodeURIComponent(message)}`;
            setMessage("");
            toast.success("Opening your email app…");
          }}
          className="mt-4 grid gap-2"
        >
          <label className="grid gap-1 text-xs">
            <span className="text-muted-foreground">Describe your issue</span>
            <textarea
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="rounded-xl border border-input bg-background px-3 py-2 text-sm"
              placeholder="Report a problem with a job, payment or your account…"
            />
          </label>
          <button className="inline-flex min-h-11 items-center justify-center rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground sm:justify-self-start">
            Send message
          </button>
        </form>
      </Panel>

      <Panel title="Help centre" action={<MessageCircleQuestion className="size-4 text-gold" />}>
        <ul className="grid gap-2">
          {FAQ.map((f) => (
            <li key={f.q} className="overflow-hidden rounded-2xl border border-border/70 bg-background/40">
              <button
                onClick={() => setOpen(open === f.q ? null : f.q)}
                className="flex w-full items-center justify-between gap-3 p-3 text-left text-sm font-medium"
              >
                <span className="min-w-0">{f.q}</span>
                <span className="shrink-0 text-muted-foreground">{open === f.q ? "−" : "+"}</span>
              </button>
              {open === f.q && <p className="px-3 pb-3 text-sm text-muted-foreground">{f.a}</p>}
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}

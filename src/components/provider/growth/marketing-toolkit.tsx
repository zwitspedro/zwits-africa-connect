import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { Copy, Download, Share2, MessageCircle, Facebook, Check } from "lucide-react";
import { toast } from "sonner";
import { Panel } from "../dashboard-kit";
import type { ProviderData } from "../use-provider-data";

export function MarketingToolkit({ data }: { data: ProviderData }) {
  const { provider } = data;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [copied, setCopied] = useState(false);

  const link =
    typeof window !== "undefined" && provider
      ? `${window.location.origin}/providers/${provider.id}`
      : "";

  useEffect(() => {
    if (!link || !canvasRef.current) return;
    QRCode.toCanvas(canvasRef.current, link, { width: 220, margin: 1, color: { dark: "#0b0b0f", light: "#ffffff" } }).catch(
      () => undefined,
    );
  }, [link]);

  const pitch = `Need a trusted ${provider?.category ?? "service"} pro in ${provider?.city ?? "Zimbabwe"}? Book ${
    provider?.business_name ?? "us"
  } on Zwits — rated ${Number(provider?.rating_avg ?? 0).toFixed(1)}★ with ${provider?.jobs_completed ?? 0} jobs completed.`;

  const copy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopied(false), 1500);
  };

  const downloadQr = () => {
    const url = canvasRef.current?.toDataURL("image/png");
    if (!url) return;
    const a = document.createElement("a");
    a.href = url;
    a.download = "zwits-booking-qr.png";
    a.click();
  };

  const share = async () => {
    if (navigator.share) {
      await navigator.share({ title: provider?.business_name ?? "Zwits", text: pitch, url: link }).catch(() => undefined);
    } else {
      copy(`${pitch} ${link}`);
    }
  };

  const templates = [
    { title: "WhatsApp status", body: `${pitch}\nBook me here: ${link}` },
    {
      title: "Facebook post",
      body: `I'm now verified on Zwits! ✅\n${pitch}\nTap to book instantly: ${link}`,
    },
    {
      title: "Customer follow-up",
      body: `Hi! Thanks for choosing ${provider?.business_name ?? "us"}. If you were happy with the work, a quick review helps a lot: ${link}`,
    },
    {
      title: "Referral ask",
      body: `Know someone who needs a ${provider?.category ?? "service"} pro? Send them my Zwits booking link: ${link}`,
    },
  ];

  return (
    <div className="grid gap-4">
      <div className="grid gap-4 lg:grid-cols-[auto_minmax(0,1fr)]">
        <Panel title="Your booking QR code" description="Print it on flyers, vehicles or your shopfront.">
          <div className="grid place-items-center gap-3">
            <div className="rounded-2xl bg-white p-3">
              <canvas ref={canvasRef} />
            </div>
            <button
              onClick={downloadQr}
              className="inline-flex min-h-11 items-center gap-2 rounded-full border border-border px-5 text-sm font-medium hover:bg-muted"
            >
              <Download className="size-4" /> Download PNG
            </button>
          </div>
        </Panel>

        <Panel title="Shareable booking link" description="Send this anywhere customers can tap.">
          <div className="grid gap-3">
            <div className="flex items-center gap-2 rounded-xl border border-border bg-background/60 p-3">
              <span className="min-w-0 flex-1 truncate text-sm">{link || "—"}</span>
              <button onClick={() => copy(link)} className="grid size-9 shrink-0 place-items-center rounded-lg hover:bg-muted" aria-label="Copy link">
                {copied ? <Check className="size-4 text-emerald-400" /> : <Copy className="size-4" />}
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={share} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground">
                <Share2 className="size-4" /> Share
              </button>
              <a
                href={`https://wa.me/?text=${encodeURIComponent(`${pitch} ${link}`)}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-11 items-center gap-2 rounded-full border border-border px-5 text-sm font-medium hover:bg-muted"
              >
                <MessageCircle className="size-4" /> WhatsApp
              </a>
              <a
                href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(link)}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-11 items-center gap-2 rounded-full border border-border px-5 text-sm font-medium hover:bg-muted"
              >
                <Facebook className="size-4" /> Facebook
              </a>
            </div>
            <div className="rounded-2xl border border-border/70 bg-gradient-to-br from-primary/10 to-gold/10 p-5">
              <div className="text-xs uppercase tracking-wider text-muted-foreground">Profile card preview</div>
              <div className="mt-2 font-display text-xl font-black">{provider?.business_name}</div>
              <div className="text-sm text-muted-foreground capitalize">
                {provider?.category} · {provider?.city}
              </div>
              <div className="mt-1 text-sm text-gold">
                {Number(provider?.rating_avg ?? 0).toFixed(1)}★ · {provider?.jobs_completed ?? 0} jobs completed
              </div>
            </div>
          </div>
        </Panel>
      </div>

      <Panel title="Ready-made marketing copy" description="Tap to copy, then paste on your socials.">
        <div className="grid gap-2 sm:grid-cols-2">
          {templates.map((t) => (
            <button
              key={t.title}
              onClick={() => copy(t.body)}
              className="rounded-2xl border border-border/70 bg-background/40 p-4 text-left transition-colors hover:border-primary/40"
            >
              <div className="text-sm font-semibold">{t.title}</div>
              <p className="mt-1 whitespace-pre-line text-xs text-muted-foreground">{t.body}</p>
            </button>
          ))}
        </div>
      </Panel>
    </div>
  );
}

const LESSONS = [
  { t: "How to win more jobs on Zwits", d: "Respond within 60 seconds, keep availability on, and quote clearly.", m: "4 min read" },
  { t: "Pricing your services right", d: "Anchor on job value, not hourly cost, and always state what's included.", m: "5 min read" },
  { t: "Customer service excellence", d: "Confirm arrival times, send progress photos, and close with a thank you.", m: "3 min read" },
  { t: "Building a 5-star reputation", d: "Ask every happy customer for a review while you're still on site.", m: "4 min read" },
  { t: "Handling difficult customers", d: "Acknowledge, clarify scope, offer one fair remedy, and document it in chat.", m: "6 min read" },
  { t: "Growing from solo to a team", d: "Standardise your checklist before hiring, then delegate the repeatable work.", m: "7 min read" },
];

export function LearningAcademy() {
  const [done, setDone] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      return JSON.parse(localStorage.getItem("zwits.provider.academy") ?? "[]");
    } catch {
      return [];
    }
  });

  const toggle = (t: string) => {
    const next = done.includes(t) ? done.filter((x) => x !== t) : [...done, t];
    setDone(next);
    localStorage.setItem("zwits.provider.academy", JSON.stringify(next));
  };

  return (
    <Panel title="Learning academy" description={`${done.length} of ${LESSONS.length} lessons completed`}>
      <ul className="grid gap-2 sm:grid-cols-2">
        {LESSONS.map((l) => {
          const isDone = done.includes(l.t);
          return (
            <li key={l.t}>
              <button
                onClick={() => toggle(l.t)}
                className={`w-full rounded-2xl border p-4 text-left transition-colors ${
                  isDone ? "border-emerald-500/30 bg-emerald-500/5" : "border-border/70 bg-background/40 hover:border-primary/40"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="text-sm font-semibold">{l.t}</span>
                  {isDone && <Check className="mt-0.5 size-4 shrink-0 text-emerald-400" />}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{l.d}</p>
                <span className="mt-2 inline-block text-[11px] text-primary">{l.m}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}

import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowLeft, Search } from "lucide-react";
import { services, popularServices } from "@/data/services";

/**
 * Step 1 of the progressive customer flow: "What do you need?"
 *
 * Loads the static service catalogue only — no providers, no maps, no prices
 * from the server, no auth session. Selecting a category is what triggers the
 * next (heavier) route.
 */

const title = "Book a service on Zwits — choose what you need";
const description =
  "Tell Zwits what you need: plumbing, electrical, cleaning, delivery, beauty, IT and more. Pick a category to see providers and prices near you.";

export const Route = createFileRoute("/book/")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://www.zwits.co.zw/book" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://www.zwits.co.zw/book" }],
  }),
  component: BookEntry,
});

function BookEntry() {
  const [q, setQ] = useState("");

  const list = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return services;
    return services.filter(
      (s) =>
        s.name.toLowerCase().includes(term) ||
        s.tagline.toLowerCase().includes(term) ||
        s.examples.some((e) => e.toLowerCase().includes(term)),
    );
  }, [q]);

  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      <header className="mx-auto flex w-full max-w-2xl items-center gap-3 px-5 pt-6">
        <Link
          to="/"
          aria-label="Back"
          className="grid size-9 place-items-center rounded-full border border-border transition hover:bg-muted"
        >
          <ArrowLeft className="size-4" />
        </Link>
        <span className="font-display text-base font-bold tracking-[-0.03em]">Book a service</span>
      </header>

      <main className="mx-auto w-full max-w-2xl flex-1 px-5 pb-12 pt-6">
        <h1 className="font-display text-[1.9rem] font-bold leading-[1.1] tracking-[-0.03em]">
          What do you need?
        </h1>

        <label className="mt-5 flex min-h-12 items-center gap-2 rounded-2xl border border-border bg-card px-4">
          <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search plumbing, cleaning, delivery…"
            aria-label="Search services"
            className="min-w-0 flex-1 bg-transparent text-sm outline-none"
          />
        </label>

        {!q && (
          <section aria-label="Popular" className="mt-6">
            <p className="text-[12px] uppercase tracking-[0.18em] text-muted-foreground">Popular</p>
            <div className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-6">
              {popularServices.slice(0, 8).map((s) => (
                <Link
                  key={s.slug}
                  to="/book/$category"
                  params={{ category: s.slug }}
                  search={{ provider: undefined }}
                  className="grid gap-1.5 rounded-2xl border border-border/70 bg-card p-2 text-center transition active:scale-95 hover:border-primary/50"
                >
                  <span className="mx-auto grid size-9 place-items-center rounded-xl bg-primary/10 text-primary">
                    <s.icon className="size-4" aria-hidden />
                  </span>
                  <span className="truncate text-[10px] font-medium">{s.name}</span>
                </Link>
              ))}
            </div>
          </section>
        )}

        <section aria-label="All categories" className="mt-7">
          <p className="text-[12px] uppercase tracking-[0.18em] text-muted-foreground">
            {q ? `${list.length} match${list.length === 1 ? "" : "es"}` : "All categories"}
          </p>
          <div className="mt-3 grid gap-2">
            {list.map((s) => (
              <Link
                key={s.slug}
                to="/book/$category"
                params={{ category: s.slug }}
                search={{ provider: undefined }}
                className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3 transition active:scale-[0.99] hover:border-primary/50"
              >
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                  <s.icon className="size-5" aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold">{s.name}</span>
                  <span className="block truncate text-[12px] text-muted-foreground">
                    {s.tagline}
                  </span>
                </span>
                <span className="shrink-0 text-[12px] text-muted-foreground">
                  from ${s.estimate.from}
                </span>
              </Link>
            ))}
            {list.length === 0 && (
              <p className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                Nothing matches “{q}”. Try a different word.
              </p>
            )}
          </div>
        </section>

        <p className="mt-8 text-[13px] text-muted-foreground">
          Already booked?{" "}
          <Link to="/login" className="font-medium text-primary hover:underline">
            Sign in to track it
          </Link>
        </p>
      </main>
    </div>
  );
}

import { useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Search, ArrowRight } from "lucide-react";
import { services } from "@/data/services";

/** Big Zimbabwe-first "what do you need today?" search with live suggestions. */
export function ServiceSearch() {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const matches = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return [];
    return services
      .filter((s) => [s.name, s.tagline, s.description, ...s.examples].join(" ").toLowerCase().includes(term))
      .slice(0, 6);
  }, [q]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const target = matches[0];
    if (target) navigate({ to: "/services/$slug", params: { slug: target.slug } });
    else navigate({ to: "/services" });
  };

  return (
    <div className="relative w-full max-w-2xl">
      <form onSubmit={submit}>
        <div className="flex items-center gap-2 rounded-2xl border border-border bg-background p-2 shadow-soft focus-within:border-primary">
          <Search className="ml-2 size-5 shrink-0 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onBlur={() => {
              blurTimer.current = setTimeout(() => setOpen(false), 120);
            }}
            aria-label="What service do you need today?"
            placeholder="What service do you need today?"
            className="min-w-0 flex-1 bg-transparent py-3 text-[15px] outline-none placeholder:text-muted-foreground"
          />
          <button
            type="submit"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
          >
            Search
            <ArrowRight className="hidden size-4 sm:block" />
          </button>
        </div>
      </form>

      {open && matches.length > 0 && (
        <ul className="absolute z-30 mt-2 w-full overflow-hidden rounded-2xl border border-border bg-popover shadow-soft">
          {matches.map((s) => {
            const Icon = s.icon;
            return (
              <li key={s.slug}>
                <Link
                  to="/services/$slug"
                  params={{ slug: s.slug }}
                  onMouseDown={() => blurTimer.current && clearTimeout(blurTimer.current)}
                  className="flex items-center gap-3 px-4 py-3 transition hover:bg-muted"
                >
                  <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                    <Icon className="size-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">{s.name}</span>
                    <span className="block truncate text-xs text-muted-foreground">{s.tagline}</span>
                  </span>
                  <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                    from ${s.estimate.from}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

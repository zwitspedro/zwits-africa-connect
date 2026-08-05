import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { services } from "@/data/services";
import { AppBar, Card, Empty, Screen, Section, money } from "@/mobile/ui";

export const Route = createFileRoute("/m/customer/categories")({ component: CategoriesScreen });

function CategoriesScreen() {
  const [q, setQ] = useState("");
  const navigate = useNavigate();

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
    <>
      <AppBar title="Categories" subtitle={`${services.length} services across Harare`} />
      <Screen>
        <div className="px-4 pt-4">
          <label className="flex min-h-12 items-center gap-2 rounded-2xl border border-border bg-card px-4">
            <Search className="size-4 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search a service"
              className="min-w-0 flex-1 bg-transparent text-sm outline-none"
            />
          </label>
        </div>

        <Section>
          {list.length === 0 ? (
            <Empty title="No match" hint="Try a different word, like plumbing or delivery." />
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {list.map((s) => (
                <Card
                  key={s.slug}
                  onClick={() =>
                    navigate({ to: "/m/customer/book/$category", params: { category: s.slug } })
                  }
                >
                  <span className="grid size-10 place-items-center rounded-xl bg-primary/12 text-primary">
                    <s.icon className="size-5" />
                  </span>
                  <p className="mt-2 text-sm font-semibold">{s.name}</p>
                  <p className="line-clamp-2 text-[11px] text-muted-foreground">{s.tagline}</p>
                  <p className="mt-2 text-[11px] font-medium text-primary">
                    from {money(s.estimate.from)}/{s.estimate.unit}
                  </p>
                </Card>
              ))}
            </div>
          )}
        </Section>
      </Screen>
    </>
  );
}

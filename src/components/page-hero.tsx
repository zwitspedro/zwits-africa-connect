import type { ReactNode } from "react";

export function PageHero({ eyebrow, title, children }: { eyebrow?: string; title: string; children?: ReactNode }) {
  return (
    <section className="relative overflow-hidden border-b border-border/60 bg-grain">
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 md:py-28">
        {eyebrow && <p className="text-sm font-medium text-gold">{eyebrow}</p>}
        <h1 className="mt-3 max-w-3xl font-display text-5xl font-bold tracking-tight md:text-6xl">{title}</h1>
        {children && <div className="mt-5 max-w-2xl text-lg text-muted-foreground">{children}</div>}
      </div>
    </section>
  );
}

export function Prose({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 [&_h2]:mt-10 [&_h2]:font-display [&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:text-foreground [&_p]:mt-4 [&_p]:text-muted-foreground [&_ul]:mt-4 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:text-muted-foreground [&_li]:mt-2">
      {children}
    </div>
  );
}

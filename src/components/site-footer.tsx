import { Link } from "@tanstack/react-router";

export function SiteFooter() {
  return (
    <footer className="border-t border-border/60 bg-background">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground font-display font-bold">Z</span>
            <span className="font-display text-lg font-bold">Zwits</span>
          </div>
          <p className="mt-3 max-w-xs text-sm text-muted-foreground">
            Africa's everyday services marketplace. Book trusted help in minutes.
          </p>
        </div>
        <FooterCol title="Platform" items={[
          ["Services", "/services"],
          ["Become a Provider", "/become-a-provider"],
          ["About", "/about"],
          ["Contact", "/contact"],
        ]} />
        <FooterCol title="Support" items={[
          ["FAQ", "/faq"],
          ["Privacy Policy", "/privacy"],
          ["Terms", "/terms"],
        ]} />
        <div>
          <h4 className="font-display text-sm font-semibold text-foreground">Get the app</h4>
          <p className="mt-3 text-sm text-muted-foreground">Available soon on Google Play and the App Store.</p>
          <div className="mt-4 flex gap-2">
            <span className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground">EcoCash</span>
            <span className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground">InnBucks</span>
            <span className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground">Visa</span>
          </div>
        </div>
      </div>
      <div className="border-t border-border/60">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-2 px-4 py-5 text-xs text-muted-foreground sm:flex-row sm:px-6">
          <p>© {new Date().getFullYear()} Zwits. All rights reserved.</p>
          <p>Made in Zimbabwe · Built for Africa</p>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, items }: { title: string; items: [string, string][] }) {
  return (
    <div>
      <h4 className="font-display text-sm font-semibold text-foreground">{title}</h4>
      <ul className="mt-3 space-y-2 text-sm">
        {items.map(([label, href]) => (
          <li key={href}>
            <Link to={href} className="text-muted-foreground transition hover:text-foreground">{label}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

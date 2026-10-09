import { ZwitsLogo } from "@/components/zwits-logo";
import { Link } from "@tanstack/react-router";

export function SiteFooter() {
  return (
    <footer className="border-t border-border/60 bg-background">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-4">
        <div>
          <ZwitsLogo />
          <p className="mt-3 max-w-xs text-sm text-muted-foreground">
            TRUST. DELIVERED.
          </p>
        </div>
        <FooterCol title="Platform" items={[
          ["Services", "/services"],
          ["Delivery", "/delivery"],
          ["Delivery in Harare", "/delivery/harare"],
          ["Pricing", "/pricing"],
          ["Business", "/business"],
          ["About", "/about"],
        ]} />
        <FooterCol title="Join Zwits" items={[
          ["Become a Provider", "/providers"],
          ["Become a Driver", "/drivers"],
          ["Careers", "/careers"],
          ["Contact", "/contact"],
        ]} />
        <FooterCol title="Support" items={[
          ["FAQ", "/faq"],
          ["Privacy Policy", "/privacy"],
          ["Terms", "/terms"],
        ]} />
        <div>
          <h2 className="font-sans text-sm font-semibold text-foreground">Get the app</h2>
          <p className="mt-3 text-sm text-muted-foreground">Available soon on Google Play and the App Store.</p>
          <div className="mt-4 flex gap-2">
            <span className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground">Cash on completion</span>
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
      <h2 className="font-sans text-sm font-semibold text-foreground">{title}</h2>
      <ul className="mt-3 space-y-2 text-sm">
        {items.map(([label, href]) => (
          <li key={href}>
            <Link to={href} className="inline-flex min-h-12 items-center text-muted-foreground transition hover:text-foreground">{label}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

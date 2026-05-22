import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

const links = [
  { to: "/", label: "Home" },
  { to: "/services", label: "Services" },
  { to: "/about", label: "About" },
  { to: "/become-a-provider", label: "Become a Provider" },
  { to: "/faq", label: "FAQ" },
  { to: "/contact", label: "Contact" },
] as const;

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const { user, signOut } = useAuth();
  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground font-display font-bold">Z</span>
          <span className="font-display text-lg font-bold tracking-tight">Zwits</span>
        </Link>
        <nav className="hidden items-center gap-7 md:flex">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className="text-sm text-muted-foreground transition hover:text-foreground"
              activeProps={{ className: "text-foreground" }}
              activeOptions={{ exact: l.to === "/" }}
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="hidden items-center gap-2 md:flex">
          {user ? (
            <>
              <span className="text-sm text-muted-foreground">{user.email ?? user.phone}</span>
              <button onClick={() => signOut()} className="rounded-full border border-border px-4 py-2 text-sm hover:bg-muted">Sign out</button>
            </>
          ) : (
            <>
              <Link to="/login" className="rounded-full px-4 py-2 text-sm text-foreground/80 hover:text-foreground">Sign in</Link>
              <Link to="/signup" className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90">
                Get started
              </Link>
            </>
          )}
        </div>
        <button
          aria-label="Toggle menu"
          className="md:hidden rounded-md p-2 text-foreground"
          onClick={() => setOpen((o) => !o)}
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>
      {open && (
        <div className="border-t border-border/60 md:hidden">
          <nav className="mx-auto flex max-w-7xl flex-col px-4 py-3 sm:px-6">
            {links.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                onClick={() => setOpen(false)}
                className="rounded-md px-2 py-3 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                {l.label}
              </Link>
            ))}
            <Link to="/signup" onClick={() => setOpen(false)} className="mt-2 rounded-full bg-primary px-4 py-3 text-center text-sm font-medium text-primary-foreground">
              Get the app
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}

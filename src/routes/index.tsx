import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, HardHat, Package, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ZwitsLogo } from "@/components/zwits-logo";
import { seo, organizationJsonLd, websiteJsonLd } from "@/lib/seo";

/** Data-light entry: no auth, data requests, photographs, maps or animation libraries. */
export const Route = createFileRoute("/")({
  head: () => seo({
    title: "Zwits — Trust. Delivered. | Services & Delivery in Harare",
    description: "Find a service, send a parcel or provide your skills with Zwits in Harare. Trust. Delivered. We move with each other.",
    path: "/",
    jsonLd: [organizationJsonLd(), websiteJsonLd()],
  }),
  component: Entry,
});

function Entry() {
  return (
    <div data-experience="customer" className="flex min-h-dvh flex-col bg-background text-foreground">
      <header className="mx-auto grid w-full max-w-3xl grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-6 py-6 sm:px-8">
        <ZwitsLogo wordmark={false} />
        <Link to="/home" className="inline-flex min-h-12 items-center text-sm font-bold text-muted-foreground hover:text-foreground">About Zwits <ArrowRight aria-hidden="true" className="ml-2 size-4" /></Link>
      </header>
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 pb-8 pt-8 sm:px-8 sm:pt-12">
        <p className="entry-wordmark">ZWITS<span className="text-primary-text">.</span></p>
        <p className="mt-4 text-xs font-bold text-muted-foreground">HARARE, ZIMBABWE</p>
        <h1 className="entry-title mt-8">WHAT DO YOU NEED?</h1>
        <nav aria-label="Get started" className="mt-6 grid gap-3">
          <Button asChild size="lg" className="w-full justify-between px-6">
            <Link to="/book"><span className="flex min-w-0 items-center gap-3"><Search aria-hidden="true" />GET A SERVICE</span><ArrowRight aria-hidden="true" /></Link>
          </Button>
          <Button asChild size="lg" variant="secondary" className="w-full justify-between px-6">
            <Link to="/delivery"><span className="flex min-w-0 items-center gap-3"><Package aria-hidden="true" />SEND SOMETHING</span><ArrowRight aria-hidden="true" /></Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="w-full justify-between px-6">
            <Link to="/provider"><span className="flex min-w-0 items-center gap-3"><HardHat aria-hidden="true" />PROVIDE A SERVICE</span><ArrowRight aria-hidden="true" /></Link>
          </Button>
        </nav>
        <div className="mt-8 border-t border-border pt-6">
          <p className="font-display text-xl">TRUST. DELIVERED.</p>
          <p className="mt-2 text-xs font-bold text-muted-foreground">WE MOVE WITH EACH OTHER.</p>
        </div>
        <section aria-label="Sign in" className="mt-6">
          <p className="text-xs text-muted-foreground">Already with Zwits?</p>
          <div className="mt-1 grid grid-cols-2 gap-2 sm:flex sm:gap-6">
            <Link to="/login" className="inline-flex min-h-12 items-center text-sm font-bold hover:text-primary-text">Customer sign in <ArrowRight aria-hidden="true" className="ml-2 size-4" /></Link>
            <Link to="/provider-login" className="inline-flex min-h-12 items-center text-sm font-bold hover:text-primary-text">Provider sign in <ArrowRight aria-hidden="true" className="ml-2 size-4" /></Link>
          </div>
          <Link to="/become-a-driver" className="inline-flex min-h-12 items-center text-sm text-muted-foreground hover:text-foreground">Deliver with Zwits <ArrowRight aria-hidden="true" className="ml-2 size-4" /></Link>
        </section>
      </main>
      <footer className="mx-auto w-full max-w-3xl px-6 pb-6 sm:px-8">
        <nav aria-label="Support and legal" className="flex flex-wrap gap-x-6 text-xs text-muted-foreground">
          <Link to="/faq" className="inline-flex min-h-12 items-center hover:text-foreground">Help</Link>
          <Link to="/contact" className="inline-flex min-h-12 items-center hover:text-foreground">Contact</Link>
          <Link to="/terms" className="inline-flex min-h-12 items-center hover:text-foreground">Terms</Link>
          <Link to="/privacy" className="inline-flex min-h-12 items-center hover:text-foreground">Privacy</Link>
        </nav>
      </footer>
    </div>
  );
}

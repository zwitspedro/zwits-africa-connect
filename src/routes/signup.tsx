import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteShell } from "@/components/site-shell";

export const Route = createFileRoute("/signup")({
  head: () => ({ meta: [{ title: "Sign up — Zwits" }, { name: "description", content: "Create your Zwits account." }] }),
  component: Signup,
});

function Signup() {
  return (
    <SiteShell>
      <section className="mx-auto grid min-h-[70vh] max-w-md place-items-center px-4 py-16 sm:px-6">
        <div className="w-full rounded-3xl border border-border bg-card p-8">
          <h1 className="font-display text-3xl font-bold">Create your account</h1>
          <p className="mt-2 text-sm text-muted-foreground">Book your first service in seconds.</p>
          <form className="mt-6 grid gap-4" onSubmit={(e) => e.preventDefault()}>
            <Input label="Full name" />
            <Input label="Phone" type="tel" />
            <Input label="Password" type="password" />
            <button className="mt-2 rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground">Create account</button>
          </form>
          <p className="mt-5 text-center text-sm text-muted-foreground">
            Already have an account? <Link to="/login" className="text-primary hover:underline">Sign in</Link>
          </p>
        </div>
      </section>
    </SiteShell>
  );
}

function Input({ label, type = "text" }: { label: string; type?: string }) {
  return (
    <label className="grid gap-1.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <input type={type} className="rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-primary" />
    </label>
  );
}

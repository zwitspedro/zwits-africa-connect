import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ZwitsLogo } from "@/components/zwits-logo";
export const Route = createFileRoute("/unsubscribe")({
  validateSearch: (s: Record<string, unknown>): { token?: string } => ({ token: typeof s.token === "string" ? s.token : undefined }),
  head: () => ({ meta: [{ title: "Email preferences — Zwits" }, { name: "description", content: "Manage your Zwits app email preferences." }, { property: "og:title", content: "Email preferences — Zwits" }, { property: "og:description", content: "Manage your Zwits app email preferences." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }, { name: "robots", content: "noindex" }] }),
  component: Preferences,
});
function Preferences() {
  const { token } = Route.useSearch();
  const check = useQuery({ queryKey: ["unsubscribe", token], enabled: !!token, queryFn: async () => { const r = await fetch(`/email/unsubscribe?token=${encodeURIComponent(token ?? "")}`); if (!r.ok) throw new Error("This link is invalid or expired."); return r.json() as Promise<{valid?: boolean; reason?: string}>; }, retry: false });
  const confirm = useMutation({ mutationFn: async () => { const r = await fetch("/email/unsubscribe",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({token})}); if (!r.ok) throw new Error("Unable to update preferences. Please retry."); return r.json() as Promise<{success?: boolean; reason?: string}>; } });
  return <main className="mx-auto max-w-xl px-6 py-12"><ZwitsLogo/><h1 className="mt-8 font-display text-2xl">Email preferences</h1>{confirm.isSuccess || check.data?.reason === "already_unsubscribed" ? <p className="mt-4">You are unsubscribed from Zwits app emails. Sign-in and password-reset emails remain available.</p> : !token || check.error ? <p role="alert" className="mt-4">This link is invalid or expired.</p> : check.isPending ? <p role="status" className="mt-4">Checking your link…</p> : <div className="mt-4"><p>Stop Zwits app emails to this address?</p><Button className="mt-4" disabled={confirm.isPending || !check.data?.valid} onClick={() => confirm.mutate()}>{confirm.isPending ? "Saving…" : "Confirm unsubscribe"}</Button>{confirm.error && <p role="alert" className="mt-3 text-destructive">{confirm.error.message}</p>}</div>}</main>;
}
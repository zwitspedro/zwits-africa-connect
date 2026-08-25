import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { AuthShell } from "@/components/auth/auth-shell";
import { OAUTH_INTENT_KEY } from "@/components/auth/auth-ui";
import { supabase } from "@/integrations/supabase/client";
import { claimRole } from "@/lib/auth-onboarding.functions";
import { ROLES, ACTIVE_ROLE_KEY, pickDefaultRole, type AppRole } from "@/lib/roles";

const title = "Signing you in — Zwits";
const description = "Completing your Zwits sign-in and taking you to the right workspace.";

export const Route = createFileRoute("/auth/callback")({
  ssr: false,
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthCallback,
});

type Intent = "customer" | "provider" | "driver" | "business";

function readIntent(): Intent | null {
  const fromUrl = new URLSearchParams(window.location.search).get("intent");
  const stored = (() => {
    try {
      return sessionStorage.getItem(OAUTH_INTENT_KEY);
    } catch {
      return null;
    }
  })();
  const value = fromUrl ?? stored;
  return value === "customer" || value === "provider" || value === "driver" || value === "business"
    ? value
    : null;
}

/**
 * Public landing point for every OAuth / magic-link return.
 * Waits for the session, asks the server to bootstrap the account, then routes
 * by the authoritative role list.
 */
function AuthCallback() {
  const navigate = useNavigate();
  const [needsRole, setNeedsRole] = useState(false);
  const [working, setWorking] = useState(true);

  const finish = useCallback(
    async (role: Intent) => {
      setWorking(true);
      try {
        const { roles } = await claimRole({ data: { role } });
        const list = roles as AppRole[];
        const active = list.includes(role) ? role : pickDefaultRole(list);
        localStorage.setItem(ACTIVE_ROLE_KEY, active);
        try {
          sessionStorage.removeItem(OAUTH_INTENT_KEY);
        } catch {
          /* ignore */
        }
        navigate({ to: list.length > 1 && !role ? "/workspace" : ROLES[active].home, replace: true });
      } catch {
        toast.error("We signed you in but couldn't finish setting up your account. Please retry.");
        setWorking(false);
      }
    },
    [navigate],
  );

  useEffect(() => {
    let done = false;

    const resolve = async () => {
      const { data } = await supabase.auth.getSession();
      if (done) return;
      if (!data.session) return;
      done = true;
      const intent = readIntent();
      if (intent) void finish(intent);
      else {
        setWorking(false);
        setNeedsRole(true);
      }
    };

    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session) void resolve();
    });
    void resolve();

    // No session within a few seconds means the OAuth exchange failed.
    const timeout = setTimeout(() => {
      if (done) return;
      done = true;
      toast.error("Sign-in didn't complete. Please try again.");
      navigate({ to: "/login", replace: true });
    }, 8000);

    return () => {
      sub.subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, [finish, navigate]);

  if (needsRole && !working) {
    return (
      <AuthShell
        variant="customer"
        title="What are you using Zwits for?"
        subtitle="Choose how you'd like to start. You can add the other workspace later."
      >
        <div className="grid gap-3">
          {(["customer", "provider"] as const).map((r) => {
            const meta = ROLES[r];
            return (
              <button
                key={r}
                type="button"
                onClick={() => void finish(r)}
                className="rounded-2xl border border-input bg-background/60 p-4 text-left transition hover:border-primary hover:bg-muted"
              >
                <span className="block text-sm font-semibold">{meta.label}</span>
                <span className="mt-1 block text-xs text-muted-foreground">{meta.description}</span>
              </button>
            );
          })}
        </div>
      </AuthShell>
    );
  }

  return (
    <div className="grid min-h-[70vh] place-items-center gap-3 text-primary">
      <Loader2 className="size-6 animate-spin" />
      <p className="text-sm text-muted-foreground">Finishing sign-in…</p>
    </div>
  );
}

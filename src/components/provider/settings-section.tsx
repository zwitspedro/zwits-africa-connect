import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import { Bell, LogOut, Moon, Sun, Globe } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Panel, SoonBadge } from "./dashboard-kit";
import type { ProviderData } from "./use-provider-data";

const PREF_KEY = "zwits.provider.prefs";

export function SettingsSection({ data }: { data: ProviderData }) {
  const { provider } = data;
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [prefs, setPrefs] = useState({ jobAlerts: true, payoutAlerts: true, marketing: false, language: "en" });
  const [dark, setDark] = useState(true);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(PREF_KEY);
      if (raw) setPrefs((p) => ({ ...p, ...JSON.parse(raw) }));
    } catch {
      /* ignore */
    }
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  const update = (patch: Partial<typeof prefs>) => {
    const next = { ...prefs, ...patch };
    setPrefs(next);
    localStorage.setItem(PREF_KEY, JSON.stringify(next));
  };

  const toggleTheme = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
  };

  const toggleAvailability = useMutation({
    mutationFn: async (available: boolean) => {
      const { error } = await supabase.from("providers").update({ available }).eq("id", provider!.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["my-provider"] }),
    onError: (e: any) => toast.error(e.message ?? "Could not update"),
  });

  return (
    <div className="grid gap-4">
      <Panel title="Availability">
        <Row
          label="Accept new jobs"
          description="Turn off to stop receiving job offers."
          checked={!!provider?.available}
          onChange={(v) => toggleAvailability.mutate(v)}
        />
      </Panel>

      <Panel title="Notifications" action={<Bell className="size-4 text-primary" />}>
        <div className="grid gap-1">
          <Row label="New job alerts" checked={prefs.jobAlerts} onChange={(v) => update({ jobAlerts: v })} />
          <Row label="Payment & payout alerts" checked={prefs.payoutAlerts} onChange={(v) => update({ payoutAlerts: v })} />
          <Row label="Product news and tips" checked={prefs.marketing} onChange={(v) => update({ marketing: v })} />
        </div>
      </Panel>

      <Panel title="Appearance & language">
        <div className="grid gap-3">
          <Row
            label={dark ? "Dark mode" : "Light mode"}
            description="Applies to this device."
            checked={dark}
            onChange={toggleTheme}
            icon={dark ? Moon : Sun}
          />
          <div className="flex items-center justify-between gap-3 rounded-2xl border border-border/70 bg-background/40 p-3">
            <span className="flex min-w-0 items-center gap-2 text-sm">
              <Globe className="size-4 shrink-0 text-muted-foreground" /> Language
            </span>
            <div className="flex items-center gap-2">
              <SoonBadge>Shona / Ndebele soon</SoonBadge>
              <select
                value={prefs.language}
                onChange={(e) => update({ language: e.target.value })}
                className="rounded-lg border border-input bg-background px-2 py-1 text-xs"
              >
                <option value="en">English</option>
              </select>
            </div>
          </div>
        </div>
      </Panel>

      <Panel title="Account">
        <button
          onClick={async () => {
            await supabase.auth.signOut();
            navigate({ to: "/" });
          }}
          className="inline-flex min-h-11 items-center gap-2 rounded-full border border-destructive/40 px-6 text-sm font-semibold text-destructive transition-colors hover:bg-destructive/10"
        >
          <LogOut className="size-4" /> Sign out
        </button>
      </Panel>
    </div>
  );
}

function Row({
  label,
  description,
  checked,
  onChange,
  icon: Icon,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  icon?: any;
}) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border border-border/70 bg-background/40 p-3">
      <div className="min-w-0">
        <div className="flex items-center gap-2 text-sm">
          {Icon && <Icon className="size-4 shrink-0 text-muted-foreground" />}
          <span className="truncate">{label}</span>
        </div>
        {description && <p className="mt-0.5 text-[11px] text-muted-foreground">{description}</p>}
      </div>
      <button
        onClick={() => onChange(!checked)}
        aria-label={label}
        className={`h-6 w-11 shrink-0 rounded-full transition-colors ${checked ? "bg-primary" : "bg-muted"}`}
      >
        <span className={`block size-5 rounded-full bg-background transition-transform ${checked ? "translate-x-5" : "translate-x-0.5"}`} />
      </button>
    </div>
  );
}

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { LogOut, Moon, Sun, SmartphoneNfc } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { useActiveRole } from "@/hooks/use-role";
import { ROLES } from "@/lib/roles";
import { useMobileSettings } from "@/mobile/settings";
import { registerPush, syncPushToken, unregisterPush } from "@/mobile/notifications";
import { clearOfflineCache } from "@/mobile/offline";
import { AppBar, Card, PrimaryButton, Screen, Section } from "@/mobile/ui";

export const Route = createFileRoute("/m/settings")({ component: SettingsScreen });

function Toggle({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className="flex min-h-14 w-full items-center justify-between gap-4 py-2 text-left"
    >
      <span className="min-w-0">
        <span className="block text-sm font-medium">{label}</span>
        {hint && <span className="block text-xs text-muted-foreground">{hint}</span>}
      </span>
      <span
        className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${checked ? "bg-primary" : "bg-muted"}`}
      >
        <span
          className={`absolute top-1 size-5 rounded-full bg-background transition-all ${checked ? "left-6" : "left-1"}`}
        />
      </span>
    </button>
  );
}

function SettingsScreen() {
  const { settings, update } = useMobileSettings();
  const { user, signOut } = useAuth();
  const { roles, activeRole, setActiveRole } = useActiveRole();
  const navigate = useNavigate();

  const togglePush = async (v: boolean) => {
    await update({ pushEnabled: v });
    if (!v) {
      await unregisterPush();
      return;
    }
    const res = await registerPush();
    if (res.permission === "granted" && user) {
      await syncPushToken(user.id);
      toast.success("Push notifications enabled");
    } else if (res.permission === "unsupported") {
      toast("Push works on the installed Android app.");
    } else {
      toast.error("Notification permission denied");
    }
  };

  const out = async () => {
    clearOfflineCache();
    await signOut();
    navigate({ to: "/login", replace: true });
  };

  return (
    <>
      <AppBar title="Settings" back />
      <Screen>
        <Section title="Appearance">
          <Card>
            <div className="grid grid-cols-3 gap-2">
              {(["system", "light", "dark"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => void update({ theme: t })}
                  className={`inline-flex min-h-11 items-center justify-center gap-1.5 rounded-2xl text-xs font-medium capitalize transition ${
                    settings.theme === t
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {t === "light" ? (
                    <Sun className="size-4" />
                  ) : t === "dark" ? (
                    <Moon className="size-4" />
                  ) : null}
                  {t}
                </button>
              ))}
            </div>
          </Card>
        </Section>

        <Section title="Notifications & data">
          <Card className="divide-y divide-border/60">
            <Toggle
              label="Push notifications"
              hint="Job offers, delivery updates and messages"
              checked={settings.pushEnabled}
              onChange={(v) => void togglePush(v)}
            />
            <Toggle
              label="Sounds"
              checked={settings.soundEnabled}
              onChange={(v) => void update({ soundEnabled: v })}
            />
            <Toggle
              label="Haptics"
              checked={settings.hapticsEnabled}
              onChange={(v) => void update({ hapticsEnabled: v })}
            />
            <Toggle
              label="Share location"
              hint="Needed for live tracking and nearby jobs"
              checked={settings.locationSharing}
              onChange={(v) => void update({ locationSharing: v })}
            />
            <Toggle
              label="Data saver"
              hint="Refresh less often on mobile data"
              checked={settings.dataSaver}
              onChange={(v) => void update({ dataSaver: v })}
            />
          </Card>
        </Section>

        {roles.length > 1 && (
          <Section title="Switch app">
            <Card className="grid gap-2">
              {roles
                .filter((r) => r !== "admin" && r !== "business")
                .map((r) => (
                  <button
                    key={r}
                    onClick={() => {
                      setActiveRole(r);
                      navigate({
                        to:
                          r === "provider"
                            ? "/m/provider"
                            : r === "driver"
                              ? "/m/driver"
                              : "/m/customer",
                      });
                    }}
                    className={`flex min-h-12 items-center gap-3 rounded-2xl px-3 text-sm font-medium ${
                      activeRole === r ? "bg-primary/12 text-primary" : "bg-muted/60"
                    }`}
                  >
                    <SmartphoneNfc className="size-4" /> {ROLES[r].label} app
                  </button>
                ))}
            </Card>
          </Section>
        )}

        <Section title="Account">
          <Card>
            <p className="text-xs text-muted-foreground">Signed in as</p>
            <p className="truncate text-sm font-medium">{user?.email}</p>
            <div className="mt-4">
              <PrimaryButton
                onClick={() => void out()}
                className="bg-destructive text-destructive-foreground"
              >
                <LogOut className="size-4" /> Sign out
              </PrimaryButton>
            </div>
          </Card>
        </Section>
      </Screen>
    </>
  );
}

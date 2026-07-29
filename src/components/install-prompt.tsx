import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";

type InstallEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function InstallPrompt() {
  const [deferred, setDeferred] = useState<InstallEvent | null>(null);
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    setDismissed(window.localStorage.getItem("zwits-install-dismissed") === "1");
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as InstallEvent);
    };
    const onInstalled = () => setDeferred(null);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (!deferred || dismissed) return null;

  const close = () => {
    window.localStorage.setItem("zwits-install-dismissed", "1");
    setDismissed(true);
  };

  return (
    <div className="fixed inset-x-3 bottom-3 z-[60] md:left-auto md:right-6 md:w-96">
      <div className="flex items-center gap-3 rounded-2xl border border-border/70 bg-card/95 p-3 shadow-glow backdrop-blur-xl">
        <img src="/icon-192.png" alt="" width={44} height={44} className="size-11 shrink-0 rounded-xl" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">Install the Zwits app</p>
          <p className="truncate text-xs text-muted-foreground">Book services faster, right from your home screen.</p>
        </div>
        <button
          onClick={async () => {
            await deferred.prompt();
            await deferred.userChoice;
            setDeferred(null);
          }}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground"
        >
          <Download className="size-4" /> Install
        </button>
        <button onClick={close} aria-label="Dismiss install prompt" className="shrink-0 rounded-full p-2 text-muted-foreground hover:bg-muted">
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}

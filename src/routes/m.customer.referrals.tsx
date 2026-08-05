import { createFileRoute } from "@tanstack/react-router";
import { Copy, Gift, Share2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { AppBar, Card, PrimaryButton, Screen, Section } from "@/mobile/ui";

export const Route = createFileRoute("/m/customer/referrals")({ component: Referrals });

function Referrals() {
  const { user } = useAuth();
  const code = (user?.id ?? "zwits").replace(/-/g, "").slice(0, 6).toUpperCase();
  const link = `https://zwits.co.zw/signup?ref=${code}`;

  const share = async () => {
    const payload = {
      title: "Zwits",
      text: `Get any job done in Harare. Use my code ${code}`,
      url: link,
    };
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share(payload);
        return;
      } catch {
        /* user dismissed the sheet */
      }
    }
    await navigator.clipboard.writeText(link);
    toast.success("Invite link copied");
  };

  return (
    <>
      <AppBar title="Invite & earn" back />
      <Screen>
        <Section>
          <Card className="text-center">
            <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-accent/15 text-accent">
              <Gift className="size-7" />
            </span>
            <h2 className="mt-3 font-display text-lg font-semibold">Give $5, get $5</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Your friend gets $5 off their first Zwits job. You get $5 credit once it's completed.
            </p>

            <div className="mt-5 rounded-2xl border border-dashed border-border p-4">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                Your code
              </p>
              <p className="font-display text-2xl font-bold tracking-[0.3em]">{code}</p>
            </div>

            <div className="mt-4 grid gap-2">
              <PrimaryButton onClick={() => void share()}>
                <Share2 className="size-4" /> Share invite
              </PrimaryButton>
              <button
                onClick={async () => {
                  await navigator.clipboard.writeText(link);
                  toast.success("Link copied");
                }}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-border text-sm font-medium"
              >
                <Copy className="size-4" /> Copy link
              </button>
            </div>
          </Card>
        </Section>

        <Section title="How it works">
          <Card className="grid gap-3 text-sm text-muted-foreground">
            <p>1. Share your code with friends and neighbours in Harare.</p>
            <p>2. They sign up and book their first service.</p>
            <p>3. Credit lands in your wallet when the job is completed.</p>
          </Card>
        </Section>
      </Screen>
    </>
  );
}

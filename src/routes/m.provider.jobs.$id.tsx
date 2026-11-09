import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MapPin, MessageSquare, Navigation, Phone } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useProviderTracking } from '@/hooks/use-provider-tracking';
import { TRACKING_STATUSES } from '@/lib/provider-location';
import {
  LIFECYCLE,
  NEXT_ACTION,
  STATUS_LABEL,
  stageIndex,
  statusLabel,
  canonicalProviderStatus,
  type JobStatus,
} from "@/lib/job-lifecycle";
import { openNavigation } from "@/mobile/maps";
import { CashReceivedButton } from "@/components/provider/cash-received-button";
import { JobChangeLink } from "@/components/job-change-link";
import { DisputePanel } from "@/components/dispute-panel";
import { requireOnline } from "@/mobile/offline";
import {
  AppBar,
  Card,
  GhostButton,
  Pill,
  PrimaryButton,
  Screen,
  Section,
  SkeletonList,
  money,
  when,
} from "@/mobile/ui";

export const Route = createFileRoute("/m/provider/jobs/$id")({
  head: () => ({ meta: [{"title": "Provider job details — Zwits"}, {"name": "description", "content": "Complete your assigned Zwits job, record cash received and track issues."}, {"property": "og:title", "content": "Provider job details — Zwits"}, {"property": "og:description", "content": "Complete your assigned Zwits job, record cash received and track issues."}, {"property": "og:type", "content": "website"}, {"name": "twitter:card", "content": "summary"}, {"name": "robots", "content": "noindex"}] }), component: ProviderJobDetail });

const STEPS = LIFECYCLE.filter((s) => s !== "pending");

function ProviderJobDetail() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();

  const job = useQuery({
    queryKey: ["m", "provider-job", id, user?.id],
    enabled: !!user,
    queryFn: async () => {
      if (!user) return null;
      const { data: provider } = await supabase.from("providers").select("id").eq("user_id", user.id).maybeSingle();
      if (!provider) return null;
      const { data, error } = await supabase
        .from("bookings")
        .select("*")
        .eq("id", id)
        .eq("provider_id", provider.id)
        .maybeSingle();
      if (error) throw error;
      const { data: accounts, error: accountsError } = await supabase.rpc("provider_job_accounts");
      if (accountsError) throw accountsError;
      return data ? { ...data, account: accounts?.find(a => a.booking_id === id) } : null;
    },
  });

  useProviderTracking({ bookingId: job.data?.id ?? null, enabled: TRACKING_STATUSES.some(s => s === job.data?.status) });

  const advance = useMutation({
    mutationFn: async (status: JobStatus) => {
      await requireOnline("Updating a job");
      const patch: Record<string, unknown> = { status };
      if (status === "completed") patch.completed_at = new Date().toISOString();
      const { error } = await supabase
        .from("bookings")
        .update(patch as any)
        .eq("id", id).select("id").single();
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Job updated");
      void qc.invalidateQueries();
    },
    onError: (e: any) => toast.error(e.message ?? "Could not update the job"),
  });

  if (!user || job.isPending) {
    return (
      <>
        <AppBar title="Job" back />
        <Screen>
          <Section>
            <SkeletonList rows={4} />
          </Section>
        </Screen>
      </>
    );
  }

  const j: any = job.data;
  if (!j) {
    return (
      <>
        <AppBar title="Job" back />
        <Screen>
          <Section>
            <Card>This job is no longer available.</Card>
          </Section>
        </Screen>
      </>
    );
  }

  const action = NEXT_ACTION[canonicalProviderStatus(j.status) as JobStatus];
  const step = stageIndex(j.status) - 1;

  return (
    <>
      <AppBar title={j.category} subtitle={statusLabel(j.status)} back />
      <Screen>
        <Section>
          <Card>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{j.address}</p>
                <p className="mt-1 text-xs text-muted-foreground">{when(j.scheduled_for)}</p>
              </div>
              <div className="shrink-0 text-right">
                <Pill tone="primary">{statusLabel(j.status)}</Pill>
                <p className="mt-1 text-sm font-semibold">{money(j.price ?? j.budget)}</p>
              </div>
            </div>
            {j.description && <p className="mt-3 text-sm text-muted-foreground">{j.description}</p>}

            <div className="mt-4 grid grid-cols-3 gap-2">
              <GhostButton
                onClick={() =>
                  j.lat && j.lng
                    ? openNavigation({ lat: j.lat, lng: j.lng })
                    : toast.error("No location pinned")
                }
              >
                <Navigation className="size-4" /> Navigate
              </GhostButton>
              <GhostButton
                onClick={() => navigate({ to: "/m/chat/$bookingId", params: { bookingId: id } })}
              >
                <MessageSquare className="size-4" /> Chat
              </GhostButton>
              <GhostButton
                onClick={() =>
                  j.contact_phone
                    ? window.open(`tel:${j.contact_phone}`)
                    : toast.error("No phone on file")
                }
              >
                <Phone className="size-4" /> Call
              </GhostButton>
            </div>
          </Card>
        </Section>

        <Section title="Progress">
          <Card>
            <ol className="grid gap-3">
              {STEPS.map((s, i) => (
                <li key={s} className="flex items-center gap-3">
                  <span
                    className={`grid size-7 shrink-0 place-items-center rounded-full text-[11px] font-semibold ${
                      i <= step
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {i + 1}
                  </span>
                  <span
                    className={`text-sm ${i <= step ? "font-medium" : "text-muted-foreground"}`}
                  >
                    {STATUS_LABEL[s]}
                  </span>
                </li>
              ))}
            </ol>
          </Card>
        </Section>

        {!!(j.photos ?? []).length && (
          <Section title="Customer photos">
            <div className="flex gap-2 overflow-x-auto pb-1">
              {(j.photos as string[]).map((p) => (
                <span
                  key={p}
                  className="grid size-24 shrink-0 place-items-center rounded-2xl bg-muted text-[10px] text-muted-foreground"
                >
                  <MapPin className="size-4" />
                  photo
                </span>
              ))}
            </div>
          </Section>
        )}

        {j.status === "completed" && ["cash", "direct_ecocash", "direct_bank"].includes(j.payment_method) && (j.payment_status !== "paid" || !j.account) && (
          <Section title="Payment">
            <Card>
              <p className="text-sm text-muted-foreground">Received {money(j.price ?? j.budget)} {j.payment_method === "cash" ? "in cash" : "in your personal account"}? Confirm only after checking receipt.</p>
              <CashReceivedButton bookingId={id} method={j.payment_method} className="mt-3 w-full" />
            </Card>
          </Section>
        )}

        {j.status === "completed" && j.payment_status === "paid" && <Section title="Payment"><p className="text-sm">{j.payment_method === "cash" ? (j.account ? "Cash received · commission recorded" : "Marked paid · settlement not recorded") : "Payment recorded"}</p></Section>}
        <Section><JobChangeLink/><DisputePanel bookingId={id} status={j.status}/></Section>

        {action && (
          <div className="sticky bottom-24 px-4">
            <PrimaryButton loading={advance.isPending} onClick={() => { if (action.next !== "completed" || window.confirm("Mark this job completed? Record cash received next.")) advance.mutate(action.next); }}>
              {action.label}
            </PrimaryButton>
          </div>
        )}

        <Section>
          <Link to="/m/provider/jobs" className="block text-center text-xs text-muted-foreground">
            Back to all jobs
          </Link>
        </Section>
      </Screen>
    </>
  );
}

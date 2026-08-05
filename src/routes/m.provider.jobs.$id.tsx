import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Camera, MapPin, MessageSquare, Navigation, Phone } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import {
  LIFECYCLE,
  NEXT_ACTION,
  STATUS_LABEL,
  stageIndex,
  statusLabel,
  type JobStatus,
} from "@/lib/job-lifecycle";
import { openNavigation } from "@/mobile/maps";
import { captureAndUpload } from "@/mobile/media";
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

export const Route = createFileRoute("/m/provider/jobs/$id")({ component: ProviderJobDetail });

const STEPS = LIFECYCLE.filter((s) => s !== "pending");

function ProviderJobDetail() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();

  const job = useQuery({
    queryKey: ["m", "provider-job", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const advance = useMutation({
    mutationFn: async (status: JobStatus) => {
      await requireOnline("Updating a job");
      const patch: Record<string, unknown> = { status };
      if (status === "completed") patch.completed_at = new Date().toISOString();
      const { error } = await supabase
        .from("bookings")
        .update(patch as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Job updated");
      void qc.invalidateQueries();
    },
    onError: (e: any) => toast.error(e.message ?? "Could not update the job"),
  });

  const addPhoto = async () => {
    if (!user) return;
    try {
      const res = await captureAndUpload({ bucket: "job-photos", userId: user.id, scope: id });
      if (!res?.path) return;
      const next = [...(((job.data as any)?.completion_photos ?? []) as string[]), res.path];
      const { error } = await supabase
        .from("bookings")
        .update({ completion_photos: next } as any)
        .eq("id", id);
      if (error) throw error;
      toast.success("Photo attached");
      void job.refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    }
  };

  if (job.isLoading) {
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

  const action = NEXT_ACTION[j.status as JobStatus];
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

        <Section title="Completion evidence">
          <GhostButton onClick={() => void addPhoto()}>
            <Camera className="size-4" /> Add photo (
            {((j.completion_photos ?? []) as string[]).length})
          </GhostButton>
        </Section>

        {action && (
          <div className="sticky bottom-24 px-4">
            <PrimaryButton loading={advance.isPending} onClick={() => advance.mutate(action.next)}>
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

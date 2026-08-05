import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { MessageSquare } from "lucide-react";
import { useProviderData } from "@/components/provider/use-provider-data";
import { useConversations } from "./m.customer.messages";
import { statusLabel } from "@/lib/job-lifecycle";
import { AppBar, Card, Empty, PullToRefresh, Screen, Section, SkeletonList } from "@/mobile/ui";

export const Route = createFileRoute("/m/provider/messages")({ component: ProviderMessages });

function ProviderMessages() {
  const navigate = useNavigate();
  const data = useProviderData();
  const providerId = (data.provider as any)?.id as string | undefined;
  const threads = useConversations(providerId ? "provider_id" : null, providerId);

  return (
    <>
      <AppBar title="Messages" subtitle="Chat with your customers" />
      <Screen>
        <PullToRefresh onRefresh={() => threads.refetch()}>
          <Section>
            {threads.isLoading ? (
              <SkeletonList rows={4} />
            ) : (threads.data ?? []).length === 0 ? (
              <Empty
                icon={MessageSquare}
                title="No conversations yet"
                hint="Accept a job to start chatting with the customer."
              />
            ) : (
              <div className="grid gap-3">
                {(threads.data ?? []).map((t: any) => (
                  <Card
                    key={t.id}
                    onClick={() =>
                      navigate({ to: "/m/chat/$bookingId", params: { bookingId: t.id } })
                    }
                  >
                    <div className="flex items-start gap-3">
                      <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-primary/12 text-primary">
                        <MessageSquare className="size-5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold capitalize">{t.category}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {t.last?.content ?? t.address}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-[10px] text-muted-foreground">
                          {t.last ? new Date(t.last.created_at).toLocaleDateString() : ""}
                        </p>
                        <p className="text-[10px] text-muted-foreground">{statusLabel(t.status)}</p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </Section>
        </PullToRefresh>
      </Screen>
    </>
  );
}

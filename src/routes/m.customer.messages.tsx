import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { MessageSquare } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { AppBar, Card, Empty, PullToRefresh, Screen, Section, SkeletonList } from "@/mobile/ui";
import { statusLabel } from "@/lib/job-lifecycle";

export const Route = createFileRoute("/m/customer/messages")({ component: CustomerMessages });

/** Conversation list: one thread per booking the customer is part of. */
export function useConversations(
  column: "customer_id" | "provider_id" | null,
  id: string | undefined,
) {
  return useQuery({
    queryKey: ["m", "conversations", column, id],
    enabled: !!id && !!column,
    refetchInterval: 30_000,
    queryFn: async () => {
      const { data: bookings, error } = await supabase
        .from("bookings")
        .select("id, category, address, status, created_at")
        .eq(column!, id!)
        .order("created_at", { ascending: false })
        .limit(40);
      if (error) throw error;
      const ids = (bookings ?? []).map((b) => b.id);
      if (ids.length === 0) return [];
      const { data: msgs } = await supabase
        .from("messages")
        .select("booking_id, content, created_at")
        .in("booking_id", ids)
        .order("created_at", { ascending: false })
        .limit(200);
      const last = new Map<string, { content: string | null; created_at: string }>();
      for (const m of msgs ?? []) if (!last.has(m.booking_id)) last.set(m.booking_id, m as any);
      return (bookings ?? []).map((b) => ({ ...b, last: last.get(b.id) ?? null }));
    },
  });
}

function CustomerMessages() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const threads = useConversations("customer_id", user?.id);

  return (
    <>
      <AppBar title="Messages" subtitle="Chat with your providers" />
      <Screen>
        <PullToRefresh onRefresh={() => threads.refetch()}>
          <Section>
            {threads.isLoading ? (
              <SkeletonList rows={4} />
            ) : (threads.data ?? []).length === 0 ? (
              <Empty
                icon={MessageSquare}
                title="No conversations yet"
                hint="Chats open once a provider accepts your job."
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
                          {t.last?.content ?? `${statusLabel(t.status)} · ${t.address}`}
                        </p>
                      </div>
                      {t.last && (
                        <span className="shrink-0 text-[10px] text-muted-foreground">
                          {new Date(t.last.created_at).toLocaleDateString()}
                        </span>
                      )}
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

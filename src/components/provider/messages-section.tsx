import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { MessageCircle, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Panel, EmptyState } from "./dashboard-kit";

export function MessagesSection() {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["provider-chats", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("messages")
        .select("id, booking_id, content, created_at, sender_id, receiver_id")
        .or(`sender_id.eq.${user!.id},receiver_id.eq.${user!.id}`)
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      const seen = new Map<string, any>();
      for (const m of data ?? []) if (!seen.has(m.booking_id)) seen.set(m.booking_id, m);
      return [...seen.values()];
    },
  });

  return (
    <Panel title="Customer chats" description="Tap a conversation to reply">
      {isLoading ? (
        <div className="h-24 animate-pulse rounded-2xl bg-muted/50" />
      ) : !data?.length ? (
        <EmptyState title="No messages yet." hint="Chats appear here once you accept a job." />
      ) : (
        <ul className="grid gap-2">
          {data.map((m: any) => (
            <li key={m.id}>
              <Link
                to="/messages/$bookingId"
                params={{ bookingId: m.booking_id }}
                className="grid min-h-16 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border border-border/70 bg-background/40 p-3 transition-colors hover:border-primary/40"
              >
                <span className="grid size-10 place-items-center rounded-full bg-primary/12 text-primary">
                  <MessageCircle className="size-5" />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">{m.content ?? "Attachment"}</span>
                  <span className="block text-[11px] text-muted-foreground">
                    {new Date(m.created_at).toLocaleString()}
                  </span>
                </span>
                <ChevronRight className="size-4 text-muted-foreground" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

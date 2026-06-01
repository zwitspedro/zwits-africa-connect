import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Send, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { SiteShell } from "@/components/site-shell";

export const Route = createFileRoute("/_authenticated/messages/$bookingId")({
  head: () => ({ meta: [{ title: "Messages — Zwits" }] }),
  component: MessagesPage,
});

function MessagesPage() {
  const { bookingId } = Route.useParams();
  const { user } = useAuth();
  const qc = useQueryClient();
  const bottomRef = useRef<HTMLDivElement>(null);
  const [text, setText] = useState("");

  const { data: booking } = useQuery({
    queryKey: ["booking-for-messages", bookingId],
    enabled: !!bookingId && !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select("*")
        .eq("id", bookingId)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const { data: customerProfile } = useQuery({
    queryKey: ["profile", booking?.customer_id],
    enabled: !!booking?.customer_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("display_name, avatar_url")
        .eq("user_id", booking!.customer_id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: provider } = useQuery({
    queryKey: ["provider", booking?.provider_id],
    enabled: !!booking?.provider_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("providers")
        .select("user_id, business_name")
        .eq("id", booking!.provider_id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const otherUserId = booking
    ? booking.customer_id === user?.id
      ? provider?.user_id ?? null
      : booking.customer_id
    : null;

  const otherName = booking
    ? booking.customer_id === user?.id
      ? provider?.business_name ?? "Provider"
      : customerProfile?.display_name ?? "Customer"
    : "...";

  const { data: messages } = useQuery({
    queryKey: ["messages", bookingId],
    enabled: !!bookingId && !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("booking_id", bookingId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  useEffect(() => {
    if (!bookingId) return;
    const channel = supabase
      .channel(`messages-${bookingId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `booking_id=eq.${bookingId}`,
        },
        (payload) => {
          qc.setQueryData(["messages", bookingId], (old: any[] | undefined) => {
            if (!old) return [payload.new];
            if (old.some((m) => m.id === payload.new.id)) return old;
            return [...old, payload.new];
          });
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [bookingId, qc]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = useMutation({
    mutationFn: async (content: string) => {
      if (!user || !otherUserId) throw new Error("Not ready");
      const { error } = await supabase.from("messages").insert({
        booking_id: bookingId,
        sender_id: user.id,
        receiver_id: otherUserId,
        content: content.trim(),
      });
      if (error) throw error;
    },
    onSuccess: () => setText(""),
  });

  return (
    <SiteShell>
      <div className="mx-auto flex h-[calc(100dvh-64px)] max-w-2xl flex-col px-4 sm:px-6">
        <header className="flex items-center gap-3 border-b border-border py-3">
          <Link
            to="/provider"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
          </Link>
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
            <User className="size-4 text-muted-foreground" />
          </div>
          <div>
            <div className="text-sm font-medium">{otherName}</div>
            <div className="text-[10px] text-muted-foreground">
              Booking #{bookingId.slice(0, 8)}
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto py-4">
          {messages?.length === 0 && (
            <p className="py-10 text-center text-xs text-muted-foreground">
              No messages yet. Say hello!
            </p>
          )}
          <div className="grid gap-3">
            {messages?.map((m) => {
              const isMine = m.sender_id === user?.id;
              return (
                <div
                  key={m.id}
                  className={`flex ${isMine ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                      isMine
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-foreground"
                    }`}
                  >
                    {m.content}
                    <div
                      className={`mt-1 text-[10px] ${
                        isMine ? "text-primary-foreground/60" : "text-muted-foreground"
                      }`}
                    >
                      {new Date(m.created_at).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <div ref={bottomRef} />
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (text.trim()) sendMessage.mutate(text);
          }}
          className="flex items-center gap-2 border-t border-border py-3"
        >
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 rounded-full bg-muted px-4 py-2 text-sm outline-none ring-primary focus:ring-2"
          />
          <button
            type="submit"
            disabled={!text.trim() || sendMessage.isPending}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground disabled:opacity-50"
          >
            <Send className="size-4" />
          </button>
        </form>
      </div>
    </SiteShell>
  );
}

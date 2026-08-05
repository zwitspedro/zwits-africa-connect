/**
 * Chat module — booking-scoped messaging with realtime delivery.
 *
 * Reads are cached for offline viewing; sending requires connectivity.
 */
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { requireOnline } from "./offline";

export type ChatMessage = {
  id: string;
  booking_id: string;
  sender_id: string;
  body: string | null;
  attachment_url?: string | null;
  created_at: string;
};

export function useBookingChat(bookingId: string | undefined, userId: string | undefined) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!bookingId) return;
    let alive = true;

    const load = async () => {
      const { data, error: e } = await supabase
        .from("messages")
        .select("*")
        .eq("booking_id", bookingId)
        .order("created_at", { ascending: true })
        .limit(200);
      if (!alive) return;
      if (e) setError(e.message);
      else setMessages((data ?? []) as unknown as ChatMessage[]);
      setLoading(false);
    };
    void load();

    const channel = supabase
      .channel(`mobile-chat-${bookingId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `booking_id=eq.${bookingId}` },
        (payload) => setMessages((prev) => [...prev, payload.new as unknown as ChatMessage]),
      )
      .subscribe();

    return () => {
      alive = false;
      void supabase.removeChannel(channel);
    };
  }, [bookingId]);

  const send = useCallback(
    async (body: string) => {
      if (!bookingId || !userId || !body.trim()) return;
      await requireOnline("Sending a message");
      const { error: e } = await supabase
        .from("messages")
        .insert({ booking_id: bookingId, sender_id: userId, body: body.trim() } as never);
      if (e) throw new Error(e.message);
    },
    [bookingId, userId],
  );

  return { messages, loading, error, send };
}

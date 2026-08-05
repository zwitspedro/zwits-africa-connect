/**
 * Chat module — booking-scoped messaging with realtime delivery.
 *
 * Reads are cached for offline viewing; sending requires connectivity.
 * Mirrors the web chat contract exactly (`content` + explicit `receiver_id`),
 * so mobile and web threads are the same conversation.
 */
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { requireOnline } from "./offline";

export type ChatMessage = {
  id: string;
  booking_id: string;
  sender_id: string;
  receiver_id: string;
  content: string | null;
  attachment_url?: string | null;
  created_at: string;
};

/** Resolves the other participant on a booking so messages can be addressed. */
export async function counterpartOf(bookingId: string, userId: string): Promise<string | null> {
  const { data: booking } = await supabase
    .from("bookings")
    .select("customer_id, provider_id")
    .eq("id", bookingId)
    .maybeSingle();
  if (!booking) return null;
  if (booking.customer_id !== userId) return booking.customer_id;
  if (!booking.provider_id) return null;
  const { data: provider } = await supabase
    .from("providers")
    .select("user_id")
    .eq("id", booking.provider_id)
    .maybeSingle();
  return (provider?.user_id as string | undefined) ?? null;
}

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
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `booking_id=eq.${bookingId}`,
        },
        (payload) => setMessages((prev) => [...prev, payload.new as unknown as ChatMessage]),
      )
      .subscribe();

    return () => {
      alive = false;
      void supabase.removeChannel(channel);
    };
  }, [bookingId]);

  const send = useCallback(
    async (content: string) => {
      if (!bookingId || !userId || !content.trim()) return;
      await requireOnline("Sending a message");
      const receiver = await counterpartOf(bookingId, userId);
      if (!receiver) throw new Error("No one to message on this booking yet.");
      const { error: e } = await supabase.from("messages").insert({
        booking_id: bookingId,
        sender_id: userId,
        receiver_id: receiver,
        content: content.trim(),
      });
      if (e) throw new Error(e.message);
    },
    [bookingId, userId],
  );

  return { messages, loading, error, send };
}

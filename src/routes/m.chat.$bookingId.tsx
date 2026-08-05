import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Send } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { useBookingChat } from "@/mobile/chat";
import { AppBar, Screen } from "@/mobile/ui";

export const Route = createFileRoute("/m/chat/$bookingId")({ component: ChatScreen });

/** Shared conversation screen — used by the customer, provider and driver apps. */
function ChatScreen() {
  const { bookingId } = Route.useParams();
  const { user } = useAuth();
  const { messages, loading, send } = useBookingChat(bookingId, user?.id);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const submit = async () => {
    const body = text.trim();
    if (!body) return;
    setSending(true);
    try {
      await send(body);
      setText("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Message not sent");
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <AppBar title="Conversation" subtitle="Booking chat" back />
      <Screen className="pb-[calc(5rem+env(safe-area-inset-bottom))]">
        <div className="grid gap-2 px-4 py-4">
          {loading && (
            <p className="text-center text-xs text-muted-foreground">Loading messages…</p>
          )}
          {!loading && messages.length === 0 && (
            <p className="py-10 text-center text-xs text-muted-foreground">
              No messages yet — say hello to get started.
            </p>
          )}
          {messages.map((m) => {
            const mine = m.sender_id === user?.id;
            return (
              <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[80%] rounded-3xl px-4 py-2.5 text-sm ${
                    mine ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
                  }`}
                >
                  <p className="whitespace-pre-wrap break-words">{m.content}</p>
                  <p
                    className={`mt-1 text-[10px] ${mine ? "text-primary-foreground/70" : "text-muted-foreground"}`}
                  >
                    {new Date(m.created_at).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
            );
          })}
          <div ref={endRef} />
        </div>
      </Screen>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border/60 bg-background/95 px-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl">
        <div className="flex items-end gap-2">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={1}
            placeholder="Type a message"
            className="max-h-28 min-h-12 flex-1 resize-none rounded-2xl border border-border bg-card px-4 py-3 text-sm outline-none focus:border-primary"
          />
          <button
            onClick={submit}
            disabled={sending || !text.trim()}
            aria-label="Send message"
            className="grid size-12 shrink-0 place-items-center rounded-2xl bg-primary text-primary-foreground transition active:scale-95 disabled:opacity-50"
          >
            <Send className="size-5" />
          </button>
        </div>
      </div>
    </>
  );
}

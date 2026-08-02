import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Paperclip, Send, User, X, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { SiteShell } from "@/components/site-shell";
import { isOpen, statusLabel } from "@/lib/job-lifecycle";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/messages/$bookingId")({
  head: () => ({ meta: [{ title: "Messages — Zwits" }] }),
  component: MessagesPage,
});

const MAX_BYTES = 10 * 1024 * 1024; // 10MB

function MessagesPage() {
  const { bookingId } = Route.useParams();
  const { user } = useAuth();
  const qc = useQueryClient();
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [text, setText] = useState("");
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingPreview, setPendingPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const { data: booking } = useQuery({
    queryKey: ["booking-for-messages", bookingId],
    enabled: !!bookingId && !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings").select("*").eq("id", bookingId).single();
      if (error) throw error;
      return data;
    },
  });

  const customerId = booking?.customer_id;
  const { data: customerProfile } = useQuery({
    queryKey: ["profile", customerId],
    enabled: !!customerId,
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc("get_booking_counterpart_profile", { _user_id: customerId! });
      if (error) throw error;
      return (data && data[0]) ?? null;
    },
  });

  const providerId = booking?.provider_id;
  const { data: provider } = useQuery({
    queryKey: ["provider", providerId],
    enabled: !!providerId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("providers").select("user_id, business_name")
        .eq("id", providerId!).maybeSingle();
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
        .from("messages").select("*").eq("booking_id", bookingId)
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
        { event: "INSERT", schema: "public", table: "messages", filter: `booking_id=eq.${bookingId}` },
        (payload) => {
          qc.setQueryData(["messages", bookingId], (old: any[] | undefined) => {
            if (!old) return [payload.new];
            if (old.some((m) => m.id === payload.new.id)) return old;
            return [...old, payload.new];
          });
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [bookingId, qc]);

  // Keep the job status in the chat header live for both parties.
  useEffect(() => {
    if (!bookingId) return;
    const channel = supabase
      .channel(`booking-status-${bookingId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "bookings", filter: `id=eq.${bookingId}` },
        (payload) => {
          qc.setQueryData(["booking-for-messages", bookingId], payload.new);
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [bookingId, qc]);

  const isCustomer = !!booking && booking.customer_id === user?.id;
  const jobActive = !!booking && isOpen(booking.status);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function handlePickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    if (f.size > MAX_BYTES) {
      toast.error("File too large (max 10MB)");
      return;
    }
    setPendingFile(f);
    if (f.type.startsWith("image/")) {
      const url = URL.createObjectURL(f);
      setPendingPreview(url);
    } else {
      setPendingPreview(null);
    }
  }

  function clearPending() {
    if (pendingPreview) URL.revokeObjectURL(pendingPreview);
    setPendingFile(null);
    setPendingPreview(null);
  }

  const sendMessage = useMutation({
    mutationFn: async () => {
      if (!user || !otherUserId) throw new Error("Not ready");
      const content = text.trim();
      if (!content && !pendingFile) return;

      let attachment_url: string | null = null;
      let attachment_type: string | null = null;
      let attachment_name: string | null = null;

      if (pendingFile) {
        setUploading(true);
        const ext = pendingFile.name.split(".").pop() ?? "bin";
        const path = `${user.id}/${bookingId}/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("chat-attachments")
          .upload(path, pendingFile, { contentType: pendingFile.type, upsert: false });
        setUploading(false);
        if (upErr) throw upErr;
        attachment_url = path;
        attachment_type = pendingFile.type;
        attachment_name = pendingFile.name;
      }

      const { error } = await supabase.from("messages").insert({
        booking_id: bookingId,
        sender_id: user.id,
        receiver_id: otherUserId,
        content: content || null,
        attachment_url,
        attachment_type,
        attachment_name,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      setText("");
      clearPending();
    },
    onError: (err: any) => toast.error(err.message ?? "Failed to send"),
  });

  return (
    <SiteShell>
      <div className="mx-auto flex h-[calc(100dvh-64px)] max-w-2xl flex-col px-4 sm:px-6">
        <header className="grid grid-cols-[auto_auto_minmax(0,1fr)_auto] items-center gap-3 border-b border-border py-3">
          {isCustomer ? (
            <Link
              to="/bookings/$id"
              params={{ id: bookingId }}
              className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
              aria-label="Back to booking"
            >
              <ArrowLeft className="size-4" />
            </Link>
          ) : (
            <Link to="/provider" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground" aria-label="Back to dashboard">
              <ArrowLeft className="size-4" />
            </Link>
          )}
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
            <User className="size-4 text-muted-foreground" />
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-medium">{otherName}</div>
            <div className="truncate text-[10px] text-muted-foreground">
              {booking ? <span className="capitalize">{booking.category}</span> : null} · #{bookingId.slice(0, 8)}
            </div>
          </div>
          {booking && (
            <span
              className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-medium ${
                jobActive ? "bg-emerald-500/12 text-emerald-600" : "bg-muted text-muted-foreground"
              }`}
            >
              {statusLabel(booking.status)}
            </span>
          )}
        </header>


        <div className="flex-1 overflow-y-auto py-4">
          {messages?.length === 0 && (
            <p className="py-10 text-center text-xs text-muted-foreground">No messages yet. Say hello!</p>
          )}
          <div className="grid gap-3">
            {messages?.map((m: any) => {
              const isMine = m.sender_id === user?.id;
              return (
                <div key={m.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${isMine ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"}`}>
                    {m.attachment_url && (
                      <Attachment
                        path={m.attachment_url}
                        type={m.attachment_type}
                        name={m.attachment_name}
                        mine={isMine}
                      />
                    )}
                    {m.content && <div className={m.attachment_url ? "mt-2" : ""}>{m.content}</div>}
                    <div className={`mt-1 text-[10px] ${isMine ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                      {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <div ref={bottomRef} />
        </div>

        {pendingFile && (
          <div className="flex items-center gap-3 rounded-md border border-border bg-muted/40 p-2">
            {pendingPreview ? (
              <img src={pendingPreview} alt="" className="h-12 w-12 rounded object-cover" />
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded bg-muted">
                <FileText className="size-5 text-muted-foreground" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="truncate text-xs">{pendingFile.name}</div>
              <div className="text-[10px] text-muted-foreground">
                {(pendingFile.size / 1024).toFixed(0)} KB
              </div>
            </div>
            <button
              type="button"
              onClick={clearPending}
              className="inline-flex h-7 w-7 items-center justify-center rounded-full hover:bg-muted"
              aria-label="Remove attachment"
            >
              <X className="size-4" />
            </button>
          </div>
        )}

        {booking && !jobActive ? (
          <p className="border-t border-border py-4 text-center text-xs text-muted-foreground">
            This job is {statusLabel(booking.status).toLowerCase()} — the chat is now read-only.
          </p>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (text.trim() || pendingFile) sendMessage.mutate();
            }}
            className="flex items-center gap-2 border-t border-border py-3"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,application/pdf,.doc,.docx,.txt"
              className="hidden"
              onChange={handlePickFile}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex size-11 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="Attach file"
            >
              <Paperclip className="size-4" />
            </button>
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Type a message..."
              className="min-h-11 flex-1 rounded-full bg-muted px-4 text-sm outline-none ring-primary focus:ring-2"
            />
            <button
              type="submit"
              disabled={(!text.trim() && !pendingFile) || sendMessage.isPending || uploading}
              className="inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground disabled:opacity-50"
            >
              <Send className="size-4" />
            </button>
          </form>
        )}

      </div>
    </SiteShell>
  );
}

function Attachment({
  path,
  type,
  name,
  mine,
}: {
  path: string;
  type: string | null;
  name: string | null;
  mine: boolean;
}) {
  const { data: signed } = useQuery({
    queryKey: ["chat-attachment", path],
    queryFn: async () => {
      const { data, error } = await supabase.storage
        .from("chat-attachments")
        .createSignedUrl(path, 60 * 60);
      if (error) throw error;
      return data.signedUrl;
    },
    staleTime: 50 * 60 * 1000,
  });

  const isImage = type?.startsWith("image/");

  if (!signed) {
    return <div className="h-32 w-48 animate-pulse rounded-lg bg-black/10" />;
  }

  if (isImage) {
    return (
      <a href={signed} target="_blank" rel="noreferrer">
        <img
          src={signed}
          alt={name ?? "attachment"}
          className="max-h-64 rounded-lg object-cover"
        />
      </a>
    );
  }

  return (
    <a
      href={signed}
      target="_blank"
      rel="noreferrer"
      className={`inline-flex items-center gap-2 rounded-md px-2 py-1.5 text-xs underline ${
        mine ? "bg-primary-foreground/10" : "bg-background"
      }`}
    >
      <FileText className="size-4" />
      <span className="max-w-[180px] truncate">{name ?? "Attachment"}</span>
    </a>
  );
}

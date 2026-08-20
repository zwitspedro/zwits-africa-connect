import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Admin-only backend diagnostics. Reports whether each subsystem answers, never
 * what it is configured with: no URLs, keys or credentials cross this boundary.
 */
export const getBackendHealth = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { availableMethods } = await import("./payment-providers.server");
    const db = supabaseAdmin as any;

    const timed = async (fn: () => Promise<void>) => {
      const started = Date.now();
      try {
        await fn();
        return { ok: true as const, ms: Date.now() - started, detail: null as string | null };
      } catch (e) {
        return {
          ok: false as const,
          ms: Date.now() - started,
          detail: e instanceof Error ? e.message : "Unknown error",
        };
      }
    };

    const database = await timed(async () => {
      const { error } = await db.from("services").select("id", { count: "exact", head: true });
      if (error) throw new Error(error.message);
    });

    const auth = await timed(async () => {
      const { error } = await db.auth.admin.listUsers({ page: 1, perPage: 1 });
      if (error) throw new Error(error.message);
    });

    const storage = await timed(async () => {
      const { data, error } = await db.storage.listBuckets();
      if (error) throw new Error(error.message);
      if (!data?.length) throw new Error("No storage buckets found");
    });

    const { data: buckets } = await db.storage.listBuckets();
    const bucketList = (buckets ?? []).map((b: any) => ({
      id: b.id as string,
      public: Boolean(b.public),
    }));

    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const countSince = async (table: string, column: string, build: (q: any) => any = (q) => q) => {
      const { count } = await build(
        db.from(table).select("id", { count: "exact", head: true }).gte(column, since),
      );
      return count ?? 0;
    };
    const latest = async (table: string, column = "created_at") => {
      const { data } = await db.from(table).select(column).order(column, { ascending: false }).limit(1);
      return (data?.[0]?.[column] as string | undefined) ?? null;
    };

    const [emailsSent, emailsFailed, paymentsPaid, paymentsFailed, walletMoves, bookingsCreated] =
      await Promise.all([
        countSince("email_send_log", "created_at", (q) => q.eq("status", "sent")),
        countSince("email_send_log", "created_at", (q) => q.neq("status", "sent")),
        countSince("payments", "created_at", (q) => q.eq("status", "paid")),
        countSince("payments", "created_at", (q) => q.eq("status", "failed")),
        countSince("wallet_transactions", "created_at"),
        countSince("bookings", "created_at"),
      ]);

    const [lastBooking, lastPayment, lastWallet, lastNotification, lastEmail, lastAudit] =
      await Promise.all([
        latest("bookings"),
        latest("payments"),
        latest("wallet_transactions"),
        latest("notifications"),
        latest("email_send_log"),
        latest("admin_audit_log"),
      ]);

    const { data: sendState } = await db
      .from("email_send_state")
      .select("retry_after_until, batch_size")
      .eq("id", 1)
      .maybeSingle();

    const payments = availableMethods();

    return {
      checkedAt: new Date().toISOString(),
      services: { database, auth, storage },
      storageBuckets: bucketList,
      payments,
      email: {
        throttledUntil: (sendState?.retry_after_until as string | null) ?? null,
        sentLast24h: emailsSent,
        failedLast24h: emailsFailed,
      },
      realtime: {
        tables: [
          "bookings",
          "deliveries",
          "job_offers",
          "job_quotes",
          "delivery_offers",
          "messages",
          "notifications",
          "provider_locations",
        ],
      },
      activity: {
        bookingsLast24h: bookingsCreated,
        paymentsPaidLast24h: paymentsPaid,
        paymentsFailedLast24h: paymentsFailed,
        ledgerEntriesLast24h: walletMoves,
        lastBooking,
        lastPayment,
        lastWalletTransaction: lastWallet,
        lastNotification,
        lastEmail,
        lastAdminAction: lastAudit,
      },
    };
  });

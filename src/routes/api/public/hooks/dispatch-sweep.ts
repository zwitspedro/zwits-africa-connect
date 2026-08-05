import { createFileRoute } from "@tanstack/react-router";

/**
 * Server-authoritative dispatch expiry.
 *
 * Invoked every minute by a pg_cron job so offers keep expiring and jobs keep
 * moving to the next wave even when nobody has the app open. The work itself
 * is idempotent: assigned/cancelled/settled bookings and deliveries are no-ops.
 *
 * Public prefix bypasses site auth, so the caller is verified here with the
 * project apikey.
 */
async function runSweep(request: Request) {
  const key =
    request.headers.get("apikey") ??
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
    "";
  const expected =
    process.env["SUPABASE_ANON_KEY"] ??
    process.env["SUPABASE_PUBLISHABLE_KEY"] ??
    "";

  if (!key || !expected || key !== expected) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { admin, sweepExpiredDispatch } = await import("@/lib/dispatch.server");
  const { sweepExpiredDeliveries } = await import("@/lib/delivery.server");
  const db = await admin();

  const jobs = await sweepExpiredDispatch(db);
  const deliveries = await sweepExpiredDeliveries(db);

  return new Response(JSON.stringify({ ok: true, jobs, deliveries }), {
    headers: { "Content-Type": "application/json" },
  });
}

export const Route = createFileRoute("/api/public/hooks/dispatch-sweep")({
  server: {
    handlers: {
      POST: ({ request }) => runSweep(request),
      GET: ({ request }) => runSweep(request),
    },
  },
});

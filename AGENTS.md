# Architecture decisions

- Use the shared MapLibre/OpenStreetMap map configuration for web and mobile views so custom domains do not depend on a Google browser key.
- Keep customer and provider sign-in email-first; phone OTP endpoints stay unavailable until SMS delivery is enabled so hidden UI cannot be bypassed.
- Keep support contact identity in the shared business metadata so visible details and structured data agree.
- Keep visual tokens in src/design-system and expose them through src/styles.css; one semantic layer prevents page-level visual drift.
- Upgrade existing shadcn and mobile controls rather than add duplicate wrappers; this preserves component contracts and interaction behavior.
- Scope experience themes to presentation shells using the matched route, never auth grants; colors must not change permissions or request behavior.
- Self-host the two brand fonts with swap and no external font requests; preserve the data-light entry route without auth or data imports.
- The entry route may load the existing compact Z mark only; no photographic media, maps, auth or provider data belong on the initial screen.
- Keep the shared Z mark request-agnostic; opt into its pulse from existing matching/delivery state or a separate query-activity observer so the entry stays data-light.
- Cash bookings settle to the provider wallet as commission owed (earning offset by cash held); only platform-collected money becomes withdrawable.
- Snapshot direct-payment destinations on accepted bookings and authorize receipt only to the assigned provider; personal transfers settle like cash to avoid duplicate withdrawals.
- Share active payment validation across creation and payment initiation; credential presence alone never enables an unimplemented rail.

- Use authorized PostgreSQL RPC transactions for withdrawal requests, withdrawal decisions, dispute decisions and provider reviews so record, ledger, notification and actor audit changes commit together.
- Aggregate admin financial totals in PostgreSQL with Harare date boundaries; separate period flows from current snapshots to prevent truncated totals and misleading revenue.
- Reuse shared admin navigation and paginated directory/detail views inside the existing application; non-nested investigation routes prevent parent lists from swallowing detail pages.
- Reuse provider profile and payment editors on the dashboard and protected profile page; owner-scoped writes preserve verification and financial records.
- Keep the executive admin shell shared by existing admin pages; extend authoritative aggregates and use bounded, server-authorized search and feeds without duplicating workflows.

- Serialize participant disputes on their job and confirm cash through an authenticated atomic RPC; reuse booking-scoped issue panels and ledger-backed historical amounts to prevent missing issues and misleading balances.
- Capture provider decisions as protected review events; derive individual email recipients and content from those events through the shared app-email send route, and validate administrator uploads before registering private provider-owned paths.
- Accept directly assigned pending bookings through an owner-authorized, row-locked RPC with readiness and availability checks; ordinary status updates must not bypass the booking guard.
- Keep admin dispatch controls in authenticated, job-locked RPCs with optimistic versions and atomic audit/notices; store approvals and holds separately from the existing lifecycle to preserve participant acceptance and financial integrity.
- Reuse booking-scoped current-location upserts and admin-authorized bounded tracking reads, with Realtime invalidation and polling fallback; timestamps describe device reports, not refresh time.
- Snapshot driver verification applications and lock submitted evidence/vehicles; owner submissions and admin decisions use authorized atomic RPCs so approval, audit and notices agree.

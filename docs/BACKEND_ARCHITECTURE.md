# Zwits — Backend Architecture

Audited: 20 Aug 2026. No business logic was changed during this audit.

## 1. Platform

| Layer | What runs it |
| --- | --- |
| App + server runtime | TanStack Start v1 (React 19, Vite 7) deployed to a Cloudflare Worker |
| Backend | Lovable Cloud (managed Postgres + Auth + Storage + Realtime) |
| Server logic | `createServerFn` handlers in `src/lib/*.functions.ts` (no Supabase Edge Functions) |
| Public HTTP endpoints | TanStack server routes under `src/routes/api/public/*` and `src/routes/lovable/email/*` |
| Scheduled work | `pg_cron` job `zwits-dispatch-sweep` (every minute) → `/api/public/hooks/dispatch-sweep` |
| Email | Lovable-managed transactional email, queued in `pgmq` and drained by `/lovable/email/queue/process` |
| Maps | Google Maps browser key (public, `VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY`) + MapLibre/OSM |
| AI | Lovable AI Gateway (Gemini) for the Growth Center coach |

Administration: the backend is administered from **Lovable → Cloud** (database, auth, storage,
secrets, logs). There is no second backend and no separate dashboard to log into.

### Environment variables

Client-visible (safe): `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`,
`VITE_SUPABASE_PROJECT_ID`, `VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_*`.

Server-only (never in client code): `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`,
`SUPABASE_SERVICE_ROLE_KEY`, payment rail keys (`ECOCASH_API_KEY`, `INNBUCKS_API_KEY`,
`ZIPIT_API_KEY`, `MUKURU_API_KEY`, `BANK_TRANSFER_API_KEY` — none currently set).

## 2. Database inventory

Every table below is in `public`, has **RLS enabled** and at least one policy.
"Server-only" means writes are only reachable through service-role server functions or
`SECURITY DEFINER` RPCs (client policies deny the operation).

| Table | Purpose | PK | Key FKs | Read | Write |
| --- | --- | --- | --- | --- | --- |
| `profiles` | User display name, phone, city, avatar | `id` | `user_id → auth.users` | Owner; counterpart fields via `get_booking_counterpart_profile` | Owner (no delete) |
| `user_roles` | Role grants (`customer/provider/admin/driver/business`) | `id` | `user_id → auth.users` | Owner + admin | Self-serve roles only; admin for the rest |
| `providers` | Provider business profile, verification, rating | `id` | `user_id → auth.users` | Public reads limited to approved-provider columns; owner/admin full | Owner via `provider_verification_guard`; status fields admin/trusted only |
| `services` | Service catalogue | `id` | – | Public (`active`) | Admin |
| `provider_services` | Services a provider offers | `id` | `provider_id`, `service_id` | Public for approved providers | Owner |
| `service_areas` | Coverage radius per provider | `id` | `provider_id` | Owner/admin | Owner |
| `provider_documents` / `provider_document_audits` | Verification documents + upload audit | `id` | `provider_user_id` | Owner + admin | Owner (status fields locked by `provider_document_guard`) |
| `provider_onboarding` | 7-step onboarding state | `id` | `user_id` | Owner | Owner |
| `provider_availability` / `provider_time_off` | Working hours and days off | `id` | `user_id` | Owner | Owner |
| `driver_profiles` | Driver identity, licence, availability | `id` | `user_id` | Owner + admin | Owner (`driver_profile_guard` locks status/counters) |
| `vehicles` | Driver vehicles | `id` | `user_id` | Owner + admin | Owner |
| `bookings` | Service jobs and their lifecycle | `id` | `customer_id`, `provider_id` | Participants + admin | Participants, constrained by `booking_mutation_guard`; no delete |
| `booking_status_history` | Append-only lifecycle audit | `id` | `booking_id` | Participants + admin | Server-only (triggers/RPC) |
| `job_offers` | Dispatch offers to providers | `id` | `booking_id`, `provider_id` | Offered provider + admin | Server-only |
| `job_quotes` | Provider quotes on a booking | `id` | `booking_id`, `provider_id` | Booking customer + quoting provider | Provider inserts own quote |
| `deliveries` / `delivery_offers` / `delivery_events` | Parcel jobs, dispatch, audit | `id` | `delivery_id` | Participants + admin | Guarded by `delivery_mutation_guard`; events server-only |
| `payments` | One payment record per booking/delivery | `id` | `booking_id`, `delivery_id` | Participants + admin | **Server-only** |
| `provider_wallets` | Current balance per provider | `provider_user_id` | – | Owner + admin | **Server-only** |
| `wallet_transactions` | Immutable money ledger | `id` | booking/delivery/withdrawal | Owner + admin | **Server-only**, update/delete blocked by trigger |
| `provider_withdrawals` | Payout requests | `id` | `provider_user_id` | Owner + admin | Owner creates; admin/server transitions |
| `commission_rates` / `commission_rate_history` | Commission config + audit | `id` | – | Admin (rates readable for pricing) | Admin only; history append-only |
| `disputes` | Booking/delivery disputes | `id` | `booking_id`, `delivery_id` | Participants + admin | Participants open; admin resolves |
| `ratings` / `customer_ratings` | Two-way reviews (immutable) | `id` | `booking_id`, `provider_id` | Public/participants | Insert only |
| `notifications` | In-app notifications | `id` | `user_id` | Owner | Server writes; owner marks read |
| `messages` | Booking chat | `id` | `booking_id`, sender/receiver | Participants | Insert only |
| `device_tokens` | Push tokens | `id` | `user_id` | Owner | Owner |
| `favorites` | Saved providers | `id` | `provider_id` | Owner | Owner |
| `admin_audit_log` | Admin action trail | `id` | – | Admin | Server-only (`log_admin_action`) |
| `email_send_log`, `email_send_state`, `email_unsubscribe_tokens`, `suppressed_emails` | Email observability and suppression | `id` | – | Admin | Server-only |

There is no `withdrawals` table — payouts live in `provider_withdrawals`.

Realtime publication covers: `bookings`, `deliveries`, `job_offers`, `job_quotes`,
`delivery_offers`, `messages`, `notifications`, `provider_locations`.

## 3. Authentication and roles

- Email/password plus Google and Apple OAuth through the Lovable broker; `redirect_uri`
  is always `window.location.origin` (a public route), never a protected path.
- Roles live in `public.user_roles` and are read through the `SECURITY DEFINER`
  `has_role(uuid, app_role)` function. Roles are never stored on `profiles`.
- Frontend `RoleGate` is convenience only; every privileged server function re-checks
  `has_role` server-side, and RLS re-checks it again in the database.

Enforcement verified in this audit:

| Claim | Enforced by |
| --- | --- |
| Provider cannot read another provider's wallet | `provider_wallets`/`wallet_transactions` policies scoped to `provider_user_id = auth.uid()` |
| Provider cannot modify another provider's job | `booking_mutation_guard` + participant-scoped policies |
| Nobody can modify payments from the client | `payments` has a read-only policy set; all writes go through service-role functions |
| Nobody can modify commission | `commission_rates` is admin-only, changes mirrored into `commission_rate_history` |
| Customer cannot see another customer's bookings | `bookings` SELECT scoped to `customer_id = auth.uid()` or assigned provider |
| Ledger cannot be rewritten | `wallet_transactions_immutable()` trigger raises on UPDATE/DELETE |

## 4. Booking lifecycle and matching

`pending → matching → offered → accepted → provider_arriving → arrived → in_progress →
completed → (disputed → refunded)`; `cancelled` is terminal from any pre-completion state.
Legal transitions live in `booking_transition_allowed()` (mirrored in TypeScript by
`src/lib/booking-state.ts`) and are enforced by `booking_mutation_guard`.

Matching: `src/lib/dispatch.server.ts` picks a wave of eligible providers
(category, radius, approved, online, availability via `providers_available_at`, max 3 open
jobs) and writes `job_offers`. Acceptance is atomic in `accept_job_offer` — booking row
locked first, then the offer — so exactly one provider wins a race; losers get
"Another provider accepted first." A `pg_cron` sweep expires stale offers each minute.
Deliveries use the same engine with `delivery_*` tables and `delivery_transition_allowed`.

## 5. Money flow (traced, unchanged)

1. Customer picks a rail → `startBookingPayment` (`src/lib/payments.functions.ts`)
   → `openBookingPayment` (`payments.server.ts`) → row in `payments` via the gateway registry
   in `payment-providers.server.ts`.
2. Job completes → status guarded to `completed`, `completed_at` stamped by the trigger.
3. `confirmBookingPayment` verifies: cash may only be confirmed by the assigned provider or
   an admin (`markPaid`); every other rail is re-verified through `verifyPayment` against the
   gateway. The client's word is never accepted.
4. `settle_booking(booking_id)` (SQL, `SECURITY DEFINER`, trusted-writer only) recomputes the
   commission with `calc_commission(category, amount)` from `commission_rates`.
5. Two ledger entries are posted through `post_wallet_transaction`: `job_earning` (+gross) and
   `commission` (−fee), each with a stable reference (`booking:<id>:earning`) making the
   settlement idempotent.
6. `provider_wallets.available_balance` is updated in the same locked transaction.
7. Provider requests a payout → `provider_withdrawals` row → admin processes it in
   `/admin/operations`, which posts the matching negative ledger entry.

Deliveries follow the identical path through `settle_delivery`.

## 6. Server functions and RPCs

| Name | Caller | Validates | Elevated | Idempotent | Money | Audit |
| --- | --- | --- | --- | --- | --- | --- |
| `accept_job_offer` (SQL) | trusted writer via `claimJob` | offer state, expiry, approval, capacity, readiness | yes | yes | no | yes |
| `provider_readiness` (SQL) | self or trusted | profile, services, area, docs, payouts, verification | yes | read-only | no | no |
| `post_wallet_transaction` (SQL) | trusted writer | balance, duplicate reference | yes | yes (by reference) | yes | ledger |
| `settle_booking` / `settle_delivery` (SQL) | trusted writer | completed + paid | yes | yes | yes | ledger |
| `calc_commission` (SQL) | internal | rate lookup with floors/caps | yes | read-only | derives | no |
| `cancel_booking_as` (SQL) | trusted writer via `cancelBookingRequest` | participant, legal transition | yes | yes | no | yes |
| `startBookingPayment` / `startDeliveryPayment` | authenticated owner | ownership, amount server-derived | service role inside | reuses open record | yes | no |
| `confirmBookingPayment` / `confirmDeliveryPayment` | participant or admin | role, completion, gateway verification | service role inside | yes | yes | ledger |
| `requestWithdrawal` (`wallet.functions.ts`) | provider | balance, method, destination | no | no | yes | ledger |
| dispute open/resolve (`disputes.functions.ts`) | participant / admin | participation, admin role | admin path | no | refunds only | yes |
| `setProviderOnline` (`provider-status.functions.ts`) | provider | `provider_readiness` gate | no | yes | no | no |
| `getAdminMetrics`, `listAuditLog`, `getBackendHealth` | admin | `has_role` server-side | service role | read-only | no | no |

## 7. Storage

| Bucket | Visibility | Access |
| --- | --- | --- |
| `provider-verification` | private | Owner folder (`<uid>/…`) or admin; signed URLs only |
| `job-photos` | private | Customer owner, assigned provider, admin |
| `chat-attachments` | private | Message participants only |

Uploads go through `src/lib/secure-upload.ts` (magic-byte sniffing, size/type limits).
Signed URL minting for job photos is authorised server-side in `dispatch.functions.ts`.
No public bucket exists; profile images are currently stored as URLs on `profiles`.

## 8. Environments

- **Production**: `https://zwits.co.zw` (and `www`). Capacitor apps load
  `https://zwits.co.zw/m/<portal>`.
- **Preview**: the Lovable preview domain; used for review only.
- **Development**: `localhost:8080`.

OAuth redirects use `window.location.origin`, so each environment returns to itself; no
code hardcodes a preview or localhost URL. The only `lovable.app` references are the
Lovable-managed email queue callback and the email template preview sample — both internal.

## 9. Deployment

Migrations are applied through Lovable's migration flow and stored in `supabase/migrations/`.
The app deploys with the project publish action. SQL regression tests live in
`supabase/tests/` (`bash supabase/tests/run.sh`) and cover transitions, engine behaviour and
the two-provider acceptance race.

## Goal

Turn Zwits from "pick a provider and book" into a real marketplace: customers post a job, the system offers it to the best-matched providers in waves, the first to accept wins (or the customer picks from quotes for higher-value services), then both sides track, complete, and rate.

## How it will work

**1. Customer posts a request**
Existing booking wizard gains: optional photos, a budget field, and a "how do you want this filled?" mode that is chosen automatically per service:
- Fast dispatch (deliveries, transport, emergency, customer service) — first provider to accept wins.
- Quotes (repairs, cleaning, farming, beauty, freelance) — up to 5 providers submit price + ETA + message, customer chooses.

**2. Smart matching in waves**
On submit, the job is offered to the 10 closest qualified providers (right category, approved, online, sorted by distance, then rating, then response time). Each wave has a countdown (20s for deliveries/transport, 30s for others). If nobody accepts, the radius expands and the next wave is offered. Repeats up to 4 waves, then the job is marked "no providers found" and the customer is told.

**3. Providers get the job**
Providers see an "Available jobs" feed with live incoming offers (category, area, budget, time, customer first name), a countdown ring, and Accept / Decline. Realtime in-app notification + toast for each offer. Once someone accepts, everyone else's card flips to "Job no longer available."

**4. Quotes flow**
For quote services, providers submit price, arrival time, and a short message instead of accepting. Customer sees the offers side by side on the booking page and picks one; the rest are auto-declined.

**5. Live job tracking**
The booking detail page becomes a shared job view for both parties: status timeline, ETA, live map (already built), chat, call button, and payment status.

**6. Completion**
Provider taps "Mark complete" → customer sees "Confirm completion" → on confirm, payment is marked released and both parties are prompted to rate each other. Provider ratings already exist; a customer rating is added.

**7. Provider dashboard rebuild**
Tabs: Available jobs · My jobs · Today's schedule · Earnings & wallet · Ratings & reviews · Performance · Profile & verification, plus the Online/Offline toggle in the header.

## Technical details

Database (one migration, with GRANTs + RLS):
- `bookings`: add `budget`, `photos text[]`, `fulfilment_mode` ('dispatch' | 'quotes'), `dispatch_state`, `customer_confirmed_at`, `completed_at`.
- `job_offers`: booking_id, provider_id, wave, status (offered/accepted/declined/expired/lost), offered_at, expires_at, responded_at. Drives the provider feed, the countdown and response-time stats.
- `job_quotes`: booking_id, provider_id, price, eta_minutes, message, status.
- `customer_ratings`: provider rates the customer (mirrors `ratings`).
- `provider_stats` view/columns for avg response time and acceptance rate.
- Realtime enabled on `job_offers`, `job_quotes`, `bookings`.

Server functions (`src/lib/dispatch.functions.ts`):
- `createJob` — inserts booking, computes distance-ranked provider shortlist, writes wave-1 offers.
- `respondToOffer` — accept/decline with a race-safe conditional update so only one provider can win.
- `submitQuote` / `acceptQuote`.
- `advanceDispatch` — expires the current wave, widens the radius, writes the next wave; called from the client countdown and on any offer read (self-healing, no cron needed).

Frontend:
- `src/components/provider/job-offer-card.tsx` (countdown ring, accept/decline)
- `src/components/provider/available-jobs.tsx` (realtime feed)
- `src/components/quotes-panel.tsx` (customer-side comparison)
- Rebuild `src/routes/_authenticated/provider.index.tsx` into the tabbed dashboard.
- Extend `book.$category.tsx` (photos, budget, mode) and `bookings.$id.tsx` (timeline, quotes, completion + mutual rating).

Photos reuse the existing `chat-attachments` bucket pattern via a new private `job-photos` bucket.

Out of scope for this pass: real push notifications to a phone (needs a native shell / FCM). Providers get realtime in-app notifications and toasts; the existing PWA install path can add push later.

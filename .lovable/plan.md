## Zwits Platform Master Architecture — phased build

This is a multi-release program, not a single change. Below is the architecture and the order I'd build it in, starting from what already exists (public site, customer booking flow, provider dashboard + Growth Center, partial admin).

### What exists today
- Public: Home, About, Services, Business, Become a Provider, Contact, FAQ, Privacy, Terms, Login, Register
- Customer: dashboard, book a service, bookings, booking detail, messages, notifications
- Provider: full dashboard (jobs, schedule, earnings, wallet, reviews, performance, profile, documents, support, settings) + Growth Center
- Admin: overview, providers, commissions, reconciliation
- Backend: single auth, `user_roles` table with `customer | provider | admin`, bookings, dispatch, quotes, ratings, messages, notifications, wallet-adjacent earnings

### Missing pillars
Driver portal, business portal, role switching, wallets/transactions as real tables, delivery as a first-class object, verification/support/audit modules, and the remaining public pages.

---

### Phase 1 — Platform foundation (role system + shell)
- Extend the role enum with `driver` and `business`; keep roles in `user_roles` so one account can hold several.
- Add an active-role concept: a role switcher in the header, persisted per session, driving which portal shell renders.
- Post-login routing: single role → straight to that dashboard; multiple roles → last-used, with one-tap switching.
- Route groups: `/app` (customer), `/provider`, `/driver`, `/business`, `/admin`, each behind a role guard under the authenticated layout.
- One shared portal shell: sidebar + mobile bottom nav + global search + notification bell, reused by all five portals (the provider dashboard kit becomes the shared design system).

### Phase 2 — Public website completion
Add Delivery, Pricing, Become a Driver, Careers pages; align every page on one design language with per-page SEO metadata.

### Phase 3 — Delivery + Driver portal
- Database: `deliveries`, `driver_profiles`, `vehicles`, `delivery_offers`, `driver_locations`.
- Driver portal: dashboard, available/accepted deliveries, navigation and live tracking on the existing map stack, route ordering, earnings, wallet, performance, ratings, vehicle info, availability toggle, support, settings.
- Customer side: Book a Delivery, Track Orders, Live Map.

### Phase 4 — Money layer
- Database: `wallets`, `wallet_transactions`, `payouts`, `invoices`, `promotions`, `referrals`, `rewards`.
- Real wallet balances, ledger history, invoices and payout requests for customers, providers and drivers; commission engine reuses the existing `commission_rates`.
- Payment gateway integration is a separate decision point (see questions below).

### Phase 5 — Customer portal completion
Saved addresses, favourite providers, invoices, reviews hub, rewards, referral program, richer settings and support.

### Phase 6 — Business portal
`businesses`, `business_members`, `recurring_bookings`; corporate dashboard, bulk bookings, recurring deliveries, employee accounts, invoices, reports, analytics, business wallet, API keys.

### Phase 7 — Admin control center
Live activity map, customers/providers/drivers/businesses management, bookings, deliveries, payments, wallets, disputes, reviews, verification queue, marketing, notifications, support tickets, analytics, reports, CMS, system settings, security, audit logs.

### Phase 8 — Universal features and hardening
Global search, unified messaging, real-time updates everywhere, email/SMS/push notification fan-out, 2FA, activity logging, fraud signals, accessibility pass, offline caching for driver/provider job lists.

---

### Technical notes
- Everything stays one TanStack Start app, one Cloud database, one auth system. Portals are route groups, not separate apps.
- Access control: roles in `user_roles` + a `has_role` security-definer function, with RLS on every table; portal guards are UI convenience only, never the security boundary.
- Future modules (Pay, Food, Market, Health, Travel, Jobs, Property, Academy, Logistics, AI) plug in as new route groups plus their own tables, reusing the shared shell, wallet, messaging, notifications and verification services — a `service_verticals` concept keeps bookings/deliveries polymorphic so nothing is rebuilt.
- Scale: indexed foreign keys, pagination everywhere, no unbounded selects, geospatial filtering for dispatch.

### Open questions before Phase 1
1. Which phase should I start with now? (I'd recommend Phase 1, since role switching unblocks every other portal.)
2. Payments: which gateway do you want — EcoCash/ZimSwitch via a local aggregator, Paynow, Stripe, or wallet-only for now?
3. Should driver and provider be genuinely separate portals, or one "earner" portal with two modes?

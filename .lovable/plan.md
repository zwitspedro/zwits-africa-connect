# Zwits Admin Dispatch and Job Control Centre v2

Enhance the existing application with auditable operational control, preserving customer/provider/driver journeys, payment safeguards and the Zwits design system.

## Audit and implementation map

| Area | Existing functionality to reuse | Missing work |
| --- | --- | --- |
| Admin navigation | Shared admin shell, search and mobile navigation | Dedicated `/admin/dispatch` centre |
| Job browsing | Booking/delivery lists with status, dates, pagination and detail links | Unified oversight; customer, assignee, category and dispatch filters |
| Record details | Read-only fields, timelines, payments, disputes and reconciliation | Structured customer/location/financial information and protected controls |
| Dispatch | Offer waves, expiry, automatic matching, conditional first-winner claims | Atomic administrative assignment/reassignment and acceptance coordination |
| Request corrections | Existing customer requests | Validated edits, before/after audit, approval and acknowledgement |
| Exceptions | Cancellation, disputes and state guards | Operational holds and narrowly controlled reopen actions |
| Driver operations | Directory, profiles, vehicles and delivery offers | Detail, workload, assignment history and eligible-assignee selection |
| Notifications | In-app notifications and delivery events | Transactional notices for assignment and operational changes |
| Money | Append-only ledger and settlement functions | Preserve receipt authority, idempotency and reconciliation restrictions |
| Monitoring | Delivery/offer subscriptions and booking tracking | Authorised updates with last-update times and honest unavailable states |
| Business dispatch | Business-role directory only | Assess grouping architecture; bulk dispatch is not currently implemented |

**Key finding:** admin job pages are inspection-only. Delivery assignment, audit and notifications currently span separate operations; these cannot safely become administrative reassignment controls unchanged. Customer approval, driver acknowledgement and hold workflows are missing.

## 1. Dispatch oversight
- Add `/admin/dispatch` inside the existing admin shell, combining bookings and deliveries without merging their underlying models.
- Provide all, unassigned, awaiting acceptance, assigned, accepted, awaiting collection, in transit, completed, failed, cancelled and intervention views mapped to actual stored states.
- Add search, dates, customer, driver/provider and category filters, with pagination and persistent filter links.
- Link every job to its existing detailed record. Upgrade those records with readable customer contacts/references, service details, schedule, locations/coordinates, assignment history, completion evidence and relevant timestamps.
- Show actual quoted/approved amounts, ledger-backed commission/earnings and payment status. Never invent unavailable values.

## 2. Assignment and lifecycle control
- Add transactional manual assignment/reassignment with reasons, confirmation and durable history.
- Select eligible providers for service bookings and eligible drivers for deliveries, considering verification, services, availability, schedule, vehicle capability and active workload.
- Send an offer rather than assume acceptance. Preserve rejection, timeout, reassignment and cancellation history.
- Coordinate ordinary acceptance and administrative assignment under consistent locks, rejecting stale offers and competing winners.
- Reuse automatic matching while respecting operational holds and unresolved approvals.
- Keep existing booking and delivery state machines authoritative; operational labels must not become a competing status system.
- Allow reopen only for explicitly eligible unpaid, unsettled exceptions. Completed or reconciled jobs cannot be reset through ordinary admin controls.

## 3. Controlled customer-request changes
- Support descriptions, addresses, recipient/contact details, special instructions and schedules through validated, reasoned edits.
- Store job contact corrections without silently changing the customer's account profile.
- Record administrator, timestamp and complete before/after values for each edit; provide private internal notes.
- Stage material changes to scope, destination, timing or price for customer approval before applying them.
- Reuse delivery pricing for destination changes. Service prices requiring agreement remain proposals rather than invented recalculations.
- Require assigned driver/provider acknowledgement for operationally significant changes. Pending changes or holds must prevent affected progress until resolved.
- Notify relevant participants without exposing unnecessary personal information.

## 4. Driver operations, monitoring and financial safeguards
- Extend driver investigation with profiles, workload, assigned/completed jobs, ratings, permitted document access and assignment history.
- Reuse permitted subscriptions rather than rapid polling. Show last location update and stale/unavailable states; booking-provider tracking is not proof of live delivery-driver tracking.
- Persist audit records and in-app notices atomically with consequential actions.
- Validate completion evidence against authorised stored objects where evidence is required; arbitrary client URLs are not proof.
- Preserve cash/manual direct-provider receipt confirmation, the existing commission source, ledger immutability and duplicate-settlement protection.
- Administrative status controls must never imply payment receipt or bypass financial reconciliation.

## Technical implementation
- Reuse TanStack protected routes, the shared admin shell, semantic Zwits tokens and existing controls; add unique metadata for new content routes.
- Validate admin roles in authenticated server functions and database RPCs; client role flags are never authoritative. Keep RLS enabled with explicit grants for new public tables.
- Add only missing durable job-control records: notes/holds, proposed changes and participant decisions, and assignment history where existing events are insufficient.
- Use row locks, expected-state/version checks and idempotency keys. Establish consistent lock order across automatic matching, acceptance and administrative decisions.
- Reuse existing pricing, availability, verification, lifecycle and settlement logic instead of duplicating business rules.
- Deliver oversight first, then transactional controls and participant responses, then complete regression and browser verification.

## Tests and acceptance report
- Test assignment, driver acceptance/rejection, expiry, reassignment and concurrent attempts.
- Test request editing, price proposals, customer approval, driver acknowledgement, hold/reopen eligibility, valid transitions, evidence and transactional notices/audit.
- Test unauthorised actors, stale actions, unpaid settlement restrictions and duplicate settlement prevention.
- Exercise populated browser journeys using clearly labelled isolated dummy accounts, never real work or transfers.
- Check filters/pagination, all destinations, loading/error states, desktop/mobile layouts and existing booking/delivery regressions.
- Report every brief requirement as **PASS / PARTIALLY COMPLETE / BLOCKED / NOT IMPLEMENTED**, distinguishing existing features, new work, database/server changes and outstanding issues.

## Known limits
- Bulk business dispatch has no grouping/order workflow today; assessment is included, availability is not assumed.
- Driver locations may be unavailable until authorised tracking exists.
- External email/SMS delivery and automated payouts retain their existing configuration blockers; in-app notices do not prove external delivery.
- No real customer records, completed work, cash receipts or money transfers will be simulated.

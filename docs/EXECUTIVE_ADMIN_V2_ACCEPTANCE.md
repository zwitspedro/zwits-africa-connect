# ZWITS Executive Admin Dashboard v2 acceptance

Reviewed and tested: 9 November 2026. Enhancement of the existing application, not a rebuild. Not published in this task.

## Requirement assessment

| Brief section | Status | Evidence / limitation |
|---|---|---|
| 1 Brand identity | PASS | Existing brand tokens, Archivo Black / Manrope, restrained dark surfaces, original compact mark. Desktop and phone screenshots reviewed. |
| 2 Dashboard structure | PARTIALLY COMPLETE | Shared desktop sidebar, collapsible groups, mobile navigation, account menu, refresh, global search and notification links. All 23 sidebar destinations loaded. Notifications reuse the existing account notification centre, not a new ecosystem-wide notification queue. |
| 3 Executive overview | PARTIALLY COMPLETE | Real customer/provider/driver/booking/delivery/payment/commission/withdrawal/dispute counts. Required gross revenue is deliberately labelled confirmed payments / transaction value: cash held by providers is not Zwits revenue. Active drivers means approved drivers, distinct from online drivers. |
| 4 Performance analytics | PARTIALLY COMPLETE | SQL daily payments and commission series, booking and delivery aggregates, current network counts, new provider registrations; today/7/30/90/custom dates. On-demand chart tested. Weekly/monthly grouping, historical approval conversion and reliable completion-time analysis are not implemented. |
| 5 Live operations | PARTIALLY COMPLETE | Bounded recent operational records and existing previews. Existing provider Realtime retained; other feeds use explicit refresh, not new polling. Separate complete active-delivery/verification/failed-transaction panels remain available in linked directories. |
| 6 Action centre | PARTIALLY COMPLETE | Approval, driver verification, withdrawal, dispute, failed-payment and failed-upload links with actual counts. Generic unresolved-issue counts unavailable; no authoritative issue registry exists. |
| 7 Quick actions | PASS | Provider review, customers, delivery monitoring, reports, withdrawal/dispute queues and health link to existing workflows. |
| 8 Geography | BLOCKED | Explicit unavailable state. Area-level authoritative aggregates and verified coverage are absent. Existing OpenStreetMap integration untouched; no Google costs added. |
| 9 Recent activity | PARTIALLY COMPLETE | Chronological bounded records for bookings, deliveries, providers, withdrawals, disputes, payments and administrator audit events, with names where available and record references. Not a complete lifecycle event stream; customer signup and provider-approval events are not independently merged. |
| 10 Financial snapshot | PASS | Existing ledger calculations retained and SQL aggregate extended. Cash distinction explicit; provider earnings, commissions, withdrawal amounts, debt and balances shown. No ledger writes or settlement changes. Financial panels loaded; current period money values are zero, so populated monetary visualizations remain unverified. |
| 11 Search | PARTIALLY COMPLETE | Authorized bounded multi-entity search; customer name/phone/email, provider business name, driver name/phone, complete booking/delivery/payment UUID and transaction external reference. Peter provider search tested. Provider/driver email search, truncated references, entity-specific direct focus and complete cross-entity pagination boundary behavior remain incomplete. |
| 12 Responsive design | PASS | 1280px desktop and 390px phone checked, no document overflow; mobile navigation opens. Exhaustive tablet/device matrix not tested. |
| 13 Security | PARTIALLY COMPLETE | Server auth middleware and role check before privileged client imports. RPC checks roles; grants remain restricted. Anonymous SQL denial regression passes. Existing role gates retained. Non-admin signed-in denial and direct search/feed bypass tests not exercised with a separate account. |
| 14 Performance | PASS | Existing aggregate extended, set-based daily aggregation, 5-row entity preview budgets, customer page capped at 25, narrow fields, lazy chart, no extra polling/subscriptions. Existing provider live fallback retained. Legacy directory query optimization outside the enhanced dashboard remains separate. |
| 15 Interaction states | PARTIALLY COMPLETE | Initial/empty/error/retry states; all sidebar routes tested. Failed RPC produced 22 unavailable KPI tiles rather than false zero; retry restored them. Historical legacy screens have not all been retested under errors or populated destructive workflows. |
| 16 Testing | PARTIALLY COMPLETE | Signed-in dashboard/search/date/chart/nav/mobile checks, SQL aggregate reconciliation and authorization regression, date tests. Realtime event delivery and consequential mutations not exercised against real business records. |
| 17 Report | PASS | This report records reuse, additions, queries, destinations, verification and blockers. |

## Reused and improved

- `SiteShell`, `AdminNav`, RoleGate, existing auth/bearer middleware, Buttons, Input, Status and account dropdown controls.
- Existing admin directories, record details, reconciliation, disputes/payout decisions, customer search and notifications.
- `getAdminMetrics` / `admin_period_metrics`, extended in migration `0007_executive_admin_aggregate_extension.sql`; financial equations unchanged.
- `adminRange` now includes 90 days. Reports support custom range and exports omit the nested daily series.
- Active booking/delivery links now use the same status sets as the metric. Completed delivery filters use `delivered_at`, not creation time.

## New presentation and reads

- Shared AdminShell, executive panels and lazy daily performance chart.
- `/admin/search`, using `searchAdminRecords`; authenticated server-side reads against existing tables, no new tables.
- `getAdminActivity`: seven 5-row queries and one bounded display-name lookup, 20 merged rows maximum. No private document fields, payout destinations or audit metadata returned.
- Existing customer-directory RPC reused for name/phone/email; provider/driver/job/payment matching performed in bounded server queries.

## Connected destinations

Overview, operations, customers, providers, review, drivers, catalogue, search quality, bookings, deliveries, payments, wallets, withdrawals, commissions, reconciliation, disputes, business accounts, email, reports, health, audit, configuration and notifications. Existing booking/delivery detail routes reused.

## Verification

- Signed-in administrator: dashboard loaded without browser errors.
- SQL independent totals matched UI: 31 total customers, 2 approved providers, 6 active bookings, 3 bookings in selected 30-day range, USD 0 confirmed payments and commission.
- 23 sidebar destinations loaded without missing-page errors; active booking link selected `active`.
- Global search for Peter returned an approved provider.
- 90-day selection and daily chart rendered; custom report 1–9 November loaded; invalid range displayed error.
- Date-boundary Vitest: 7 passed.
- Anonymous metrics/payout SQL denial: passed; accepts role rejection or execute-permission denial as valid protection.
- Read-only executive aggregate SQL test added for customer/active counts, 30 Harare buckets, daily financial reconciliation and reversed-date rejection. Execution BLOCKED: the sandbox SQL connection cannot execute the protected function or assume the authenticated role; grants were not widened. Independently queried totals matched the signed-in UI.
- Simulated RPC failure: 22 unavailable tiles; retry returned to zero unavailable tiles.
- Latest automated build: clean after repairs.

## Outstanding dependencies and unverified workflows

No payouts, refunds, debt collection or electronic rails activated. Those require verified integrations and an agreed commission-repayment policy. No financial records, notifications or dispatch data were created for testing. Populated payment decisions/concurrency, complete lifecycle activity, non-admin authenticated bypass, Realtime delivery, geographic reporting and weekly/monthly/approval-rate analytics remain outstanding. Existing legal pages still require qualified Zimbabwean legal review before launch.
# Zwits admin control centre — acceptance report

Date: 16 October 2026. Status: **PARTIAL — core administration connected; not complete production certification.**

## A. Audit and priorities

Existing capabilities reused: admin overview, provider review, document history and signed URLs, customers, payments, commissions/history, reconciliation (including provider and booking drilldowns), disputes/withdrawals, email monitoring, health, immutable wallet ledger, booking and delivery history, shared role gates and design system.

- **P0 fixed:** Withdrawal requests and decisions previously used separate calls for record and ledger writes, ignored decision errors, and allowed “Mark paid” without actual settlement evidence. New locked RPC transactions commit reservation/reversal, status, notification and audit together. Payout settlement remains blocked.
- **P0 fixed:** Dispute review accepted arbitrary provider debits under the guise of refunds. That action is unavailable; nonfinancial dispute decisions are atomic and audited.
- **P1 fixed:** Dashboard count failures silently became zeros; bounded row sums truncated totals and revenue-minus-earnings misrepresented commission. PostgreSQL aggregates now separate confirmed payments, cash, electronic payments, completed value, commission, positive wallet liabilities and negative commission debt.
- **P1 fixed:** Provider review had partial audit/notification failures, could encounter the revoked-provider guard without the actor context, and automatically put approved providers online. Atomic authenticated RPC retains reviewer identity, requires review reason and ID/selfie presence, and leaves availability off for the provider to choose.
- **P1 fixed:** Admin auth-loading race briefly showed an access-denied screen to the signed-in administrator. Loading now waits for identity resolution without weakening permissions.
- **P1 completed:** Missing navigation destinations, booking/delivery investigations, drivers, wallets, business directory, catalogue inspection, search diagnostics and aggregate reports.
- **P2 remaining:** Expanded analytical exports, complete private-document review ergonomics, driver verification mutations, searchable business histories, catalogue synchronization/editor, incident alerting and external settlement reconciliation.

## B. Implemented and connected

| Feature / route | Authoritative data / operation | Enforcement | Evidence |
|---|---|---|---|
| `/admin` dated overview | `admin_period_metrics`; SQL counts and sums | authenticated RPC + database admin check | signed-in overview; preset/custom period interactions |
| `/admin/customers` name/email/phone search | `admin_customer_directory`; profiles + roles + restricted auth email | database admin check | signed-in email search; no auth secrets returned |
| `/admin/providers` | filtered 25-row provider pages; `admin_review_provider` | existing RLS for reads; RPC admin check for decisions | existing review workflow reused; mutations not run on real providers |
| `/admin/bookings` and `/admin/bookings/$id` | bookings, status history, payments, disputes | server identity + role verification | existing booking opened from list; timeline/payment readback |
| `/admin/deliveries` and `/admin/deliveries/$id` | delivery engine records/events | server identity + role verification | list checked; populated detail blocked by no delivery records |
| `/admin/drivers` | driver profiles; approval/availability filter | server admin check | signed-in directory |
| `/admin/wallets` | authoritative USD wallets and existing reconciliation links | server admin check | signed-in directory |
| `/admin/business` | actual business role rows + profiles | server admin check | signed-in directory; no invoicing/team claims |
| `/admin/catalogue` | existing services registry, read-only | server admin check | signed-in directory |
| `/admin/search-quality` | actual public catalogue and same relevance engine | existing admin RoleGate | Plumbing ranked first; existing search tests |
| `/admin/reports` | same authoritative aggregates; CSV without personal data | RPC admin check | downloaded and parsed 31-row CSV including header |
| `/admin/configuration` | links to existing authoritative settings + current limitations | existing admin RoleGate | real destinations only |
| `/admin/operations` | atomic `admin_resolve_dispute`, `admin_decide_withdrawal` | RPC admin check; row locks; audit with real actor | unsupported paid outcome rejected directly |
| Provider withdrawal request | atomic `request_wallet_withdrawal`; existing wallet transaction function | provider/driver role check; row-locked wallet; pending-request check | populated financial mutation NOT RUN |
| `/admin/health` | existing probes/activity queries | server admin check | actual signed-in checks; query failures no longer become false zero |

Period totals use Harare midnight with exclusive end dates. Online counts, queues, balances and active jobs are explicitly point-in-time snapshots. Financial totals report USD; commission comes from immutable commission entries, not a recalculation or assumption that cash reached the platform. Pending payments are not counted as successful payments.

## C. Tests

**PASS (actually executed)**
- 27 Vitest tests across phone, service relevance and six new Harare date-boundary rules.
- Authenticated admin overview, directories, search diagnostics, reports, withdrawal queue and health pages rendered.
- Existing booking list → investigation → authoritative timeline and actual payment record read back.
- Period preset and custom date controls fetched without false-zero failure state.
- Aggregate CSV downloaded, parsed, and header/row count checked.
- Dashboard no horizontal overflow at 320, 360, 375, 390, 414, 768, 1024 and 1280px.
- Direct anonymous aggregate request denied.
- Direct administrator “paid” withdrawal decision rejected before target mutation.
- Latest automatic compilation signal: build OK.

**NOT RUN / PARTIAL**
- Successful provider request, concurrent requests, failed/cancelled reversal, actual provider review, and dispute decision with audit readback: no destructive or disruptive actions performed on real records.
- Customer/provider unauthorized RPC matrix, full concurrency stress, and existing SQL engine/state tests were not rerun. `supabase/tests/04_admin_safety.sql` is retained as a read-only controlled-environment test, not claimed executed.
- All directories at all widths: dashboard checked at all eight widths; not exhaustive coverage of every admin page.
- Expanded commission editing, older reconciliation actions, private-document expiry, email retry safety, scheduled dispatch/realtime operational health and non-admin journeys were not certified.

## D. Security and integrity

No RLS disabled or weakened. No new admin grants. No credentials returned. New RPCs revoke PUBLIC/anon execution and require database identity + role checks. Service-client record reads occur only after server admin authorization. Existing ledger and settlement logic remain authoritative and immutable. Withdrawal direct writes are guarded; funds cannot be reversed separately from the final request decision. Historical wallet transactions are never modified. Provider review, dispute decision and withdrawal decision audits are committed inside the transaction with the authenticated actor.

Remaining audit risk: other existing payment confirmation paths are outside this change and still need an atomic confirm-and-settle/audit review. Existing broad admin direct-table policies elsewhere were not universally migrated to RPC-only writes. Full security scan was not run.

## E. Performance

Metrics use database-side aggregates rather than loading tables into browser or summing a capped result set. Customer directory uses a role EXISTS query with server pagination and exact history counts, replacing capped customer-ID and booking scans. New operational lists return at most 25 rows; detail previews cap events at 200 and payments/disputes at 25. Provider main list is now server-filtered and paginated; historical audit exports retain existing limits. Query-plan/index review remains not run.

## F. Blockers and incomplete capabilities

- **Payout settlement / electronic refunds:** requires connected verified rails and settlement evidence. No manual “paid” override is offered.
- **Provider commission debt collection:** requires the business repayment decision and actual collection integration. Debt remains visible; no invented collection.
- **SMS:** delivery not enabled; phone sign-in stays coming soon.
- **Catalogue editing:** existing public curated catalogue and database registry are distinct sources; safe synchronization is required before editing public discovery from admin.
- **Business invoicing, teams, bulk dispatch and APIs:** infrastructure does not exist; not implemented or advertised as live.
- **Account suspension/reactivation, admin notes, full customer history drilldown, driver review mutations:** not implemented in this batch; need dedicated authorized audited workflows and privacy review. Customer history counts are real; directory links do not imply a complete account-history workspace.
- **Delivery detail readback:** no populated delivery available in the test account.
- **Complete financial mutation certification:** requires controlled test records/environment; not safe against live customer/provider records.
- **Professional Terms/Privacy legal review:** qualified Zimbabwean counsel required.

## G. Changed files

- `AGENTS.md`, `roadmap.md`: architecture and task tracking.
- `src/hooks/use-role.ts`: identity-loading safety and removal of an unsafe non-null assertion.
- `src/components/site-shell.tsx`: shared admin navigation only on admin pages.
- `src/components/admin/admin-nav.tsx`: real admin destinations and active states.
- `src/components/admin/records-page.tsx`: paginated operational directories.
- `src/components/admin/record-detail.tsx`: authoritative timeline/payment/dispute investigations.
- `src/components/provider/wallet-section.tsx`: disabled unconnected bank method; honest request/reservation wording.
- `src/lib/admin-period.ts`, `src/lib/__tests__/admin-period.test.ts`: Harare report boundaries and tests.
- `src/lib/admin-records.functions.ts`: authorized list/detail reads.
- `src/lib/admin-metrics.functions.ts`: SQL aggregates/customer directory and payment date filters.
- `src/lib/admin.functions.ts`: atomic provider review wrapper.
- `src/lib/wallet.functions.ts`: atomic withdrawal request/decision wrappers.
- `src/lib/disputes.functions.ts`: server-filtered disputes and nonfinancial atomic decisions.
- `src/lib/health.functions.ts`: honest failures, no silent activity zeros.
- `src/routes/_authenticated/admin.index.tsx`: dated, correctly defined overview.
- `src/routes/_authenticated/admin.operations.tsx`: filtered dispute queue, decision confirmation and blocked settlement.
- `src/routes/_authenticated/admin.providers.tsx`: pagination/search and confirmed reasoned review.
- `src/routes/_authenticated/admin.customers.tsx`: email search and real restricted contact details.
- `src/routes/_authenticated/admin.payments.tsx`: period filtering and delivery detail links.
- `src/routes/_authenticated/admin.bookings.tsx`, `admin.bookings_.$id.tsx`, `admin.deliveries.tsx`, `admin.deliveries_.$id.tsx`, `admin.drivers.tsx`, `admin.wallets.tsx`, `admin.business.tsx`, `admin.catalogue.tsx`, `admin.search-quality.tsx`, `admin.reports.tsx`, `admin.configuration.tsx`: new connected admin destinations with unique metadata.
- `drizzle/migrations/0002_admin_control_integrity.sql` through `0006_admin_customer_directory.sql` (including `0003_withdrawal_guard_rpc_context.sql`, `0004_admin_period_aggregates.sql`, `0005_admin_verification_atomic_audit.sql`): additive guarded RPCs; generated migration journal maintained by tool.
- `src/integrations/supabase/types.ts`: automatically regenerated by migration tools, not hand edited.
- `supabase/tests/04_admin_safety.sql`: controlled read-only authorization assertions, NOT RUN.
- `docs/ADMIN_CONTROL_CENTRE_ACCEPTANCE.md`: this report.

## H. Regression status

Booking and delivery state machines and dispatch engines were not changed. Cash settlement commission accounting remains unchanged. No historical records were altered during browser verification. Provider withdrawals/reviews now use atomic authoritative RPCs and unsupported payout/adjustment operations are deliberately blocked. Phone/search unit regressions pass; existing full customer/provider/driver lifecycle regression certification remains NOT RUN. Not published in this task.

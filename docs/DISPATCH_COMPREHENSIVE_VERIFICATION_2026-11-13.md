# ZWITS Dispatch — comprehensive audit-first verification

**13 November 2026 — Overall: PARTIAL; not cleared for unrestricted operational use.**

This was a verification exercise. No application behavior, schema, permissions, financial entries or genuine records changed. Findings were reported, not silently corrected. PASS applies to the stated test, not an entire workflow.

## Main findings

1. **FAIL — participant authorization:** deployed `update_delivery_progress_atomic` rejects callers using `IF auth.uid() IS NULL OR NOT (d.driver_id=auth.uid() OR (d.customer_id=auth.uid() AND _status='cancelled'))`. With an unassigned delivery and unrelated authenticated caller requesting cancellation, `NULL OR FALSE` is NULL; `NOT NULL` remains NULL; PostgreSQL IF does not raise. The function can proceed to its trusted cancellation path. Participant RLS does not secure this security-definer path. No exploit or cancellation was executed.
2. **FAIL — cash settlement:** `settle_delivery` credits gross earnings and subtracts commission without offsetting cash already held by the driver. It can create apparently withdrawable funds without platform-held money. There are no completed deliveries demonstrating an actual erroneous posting. The function differs from booking cash accounting.
3. **FAIL — delivery evidence:** completion checks photo existence under the driver's folder, not the particular delivery's folder. Another photo owned by that driver can satisfy the check. No false completion was attempted.
4. **PARTIAL — cash confirmation atomicity:** `confirmDeliveryPayment` updates payment, delivery, settlement and notification in separate requests. A subsequent failure can leave paid markers without settlement. It lacks an atomic actor/reason audit equivalent to booking cash confirmation.
5. **FAIL — historical reconciliation:** three completed $10 bookings marked paid have neither payment rows nor ledger entries: $30 unreconciled. No backfill performed.
6. **NOT VERIFIED:** current successful driver assignment, collection, handover, overlapping schedules, populated driver earnings and payouts. Missing eligible accounts/records are evidence gaps, not automatic feature failures.

## Available records and audit boundaries

Current snapshot: 20 bookings, 1 pending unassigned delivery, 1 expired delivery offer, 6 job offers, 1 online but unverified driver, 0 reassignment rows, 2 wallets, 6 ledger entries, 8 payments, 0 withdrawal requests, 13 administrative job actions, 17 administrator audit rows and 5 delivery events. The delivery has no duration, schedule or proof.

17 operational/financial/notification/audit tables were read before and after the comprehensive checks and remained identical as sorted JSON. Financial checks independently verified unchanged wallet, withdrawal and ledger rows. No dummy records, payments, dispatch offers, account changes or notifications were created. No money moved.

## Phase 1 — actual implementation inventory

| Feature | Existing implementation | Classification |
|---|---|---|
| Overview/totals | Admin-only operational projection and `admin_dispatch_directory`; authoritative metrics, 25-row pages | Implemented and working on current records |
| Search/filters/views | Shared dispatch board; list/table/Kanban/map/agenda/calendar/custody/performance | Implemented; populated specialist views not verifiable |
| Priorities | Versioned, reasoned, idempotent `admin_dispatch_priority`, action/audit history | Implemented; write not rerun |
| Manual assignment | Admin-authorized checked offers and driver acceptance | Partially verified; offer is not acceptance |
| Reassignment | Locked requests; old/new driver, actor/reason/time; participant decisions | Implemented; current populated flow not verifiable |
| Bulk assignment | 1–25 jobs; per-job transactions/results; preview and stable retry keys | Implemented; rejection preview working |
| Scheduling/calendar | Optional windows, driver week display, commitment guard | Partial; genuine assigned calendar empty |
| Conflicts | Assignee locks, capacity, active/manual offers/replacement reservations and interval checks | Implemented; live overlap/concurrency not rerun |
| Custody/handover | Current custodian projection; two acknowledgments before collected-parcel driver change | Implemented; populated flow not verifiable |
| Performance | Actual created-period deliveries; delivered-only on-time/late counts, separate cancellations | Implemented; current zero counts agree |
| Duration alternatives | Source/actor/time, derived end; checked 30-minute candidate starts within seven days | Partial; missing-duration limitation working |
| Financial history | Paginated ledger/jobs/payments/requests and separate current wallets | Partial; wallets verified, driver history absent |

## Phase 2 — functional results

| Feature/test | Expected result | Actual result | Status | Correction or evidence needed |
|---|---|---|---|---|
| Overview source comparison | Total equals source records | 21 = 20 bookings + 1 delivery | PASS | None found |
| 17 status views | Page count and aggregate totals agree | First pages and corresponding overview metrics agree | PASS | Not a large-dataset stress test |
| Kind/priority filtering | Only matching records | Kind totals and all returned priority values agree | PASS | None found |
| Exact ID and no-match search | Identified record or honest empty state | One delivery found via RPC/browser; unique no-match zero | PASS | None found |
| Pagination | Preserve total; no fabricated page | Second page empty, authoritative total 21 | PASS | Populated multi-page history unavailable |
| Eligible manual assignment/save/notice | Checked offer, persisted acceptance and notification | Only driver unverified; no offer sent | NOT VERIFIED | Approved isolated accounts and controlled job |
| Ineligible driver preview | Explicit rejection | Approval/documents/area/vehicle reasons; failed bulk-preview result | PASS | Not successful assignment evidence |
| Duplicate/concurrent acceptance | One winner | Locks/guards inspected, races not rerun | NOT VERIFIED | Controlled multi-driver concurrency |
| Reassignment/rejection | Retain old driver until accepted; history/notice | Functions and retained identity inspected; no requests exist | NOT VERIFIED | Persisted participant workflow |
| Post-collection handover | Both acknowledgments before transfer | Deployed function and custody guard preserve old driver until both acknowledge | PARTIAL | Actual handover not performed |
| Successful multiple-job batch | Correct individual offers, partial failures isolated | Only safe single-job failed preview executed | NOT VERIFIED | Isolated mixed-result and successful batch |
| Bulk failure result | No corrupted or hidden write | One failed outcome; 17 tables unchanged | PASS | Mixed success/failure not retested |
| No-existing-jobs eligibility | Approved online driver eligible | Existing driver has no commitments but is unverified | NOT VERIFIED | Missing eligible account, not scheduling defect |
| Overlap and estimated end | Block genuine overlap, conservatively reject unknown ends | Deployed checks inspected; no timed genuine driver jobs | PARTIAL | Adjacent/overlap/concurrent window tests |
| Calendar conflict highlights | Show actual commitments and warnings | Genuine calendar empty; six-size presentation verified | NOT VERIFIED | Populated driver calendar |
| Duration-based alternatives | Require supported duration | No slots; explicit supported-duration prerequisite | PASS | Successful alternatives need reliable duration |
| Alternative drivers | Checked eligible alternatives | Selectable candidates/workload/checks exist; automated eligible-driver recommendation not established | PARTIAL | Reuse existing eligibility checks for suggestions |
| Audited conflict override | No accidental bypass | Guard raises conflicts; no override attempted or established | PARTIAL | Preserve prohibition; no silent override |
| Collection/custody history | Holder and timing verifiable | Empty custody agrees with no collected deliveries; investigation retains history fields | NOT VERIFIED | No fabricated collection |
| Proof and completion | Valid state and delivery-specific proof | Driver-owned proof required, wrong-job proof not excluded | FAIL | Scope proof to actual delivery |
| Performance counts | Cancelled/disputed not counted completed | Deployed SQL uses delivered-only counts; genuine current counts zero | PARTIAL | Populated late/cancelled/disputed comparisons |
| Duration calculations | Bounded duration, source, actor/time and derived end | Existing validation tests pass; deployed guard inspected | PARTIAL | No duration written; planning time is not measured travel |
| Six-size safe controls | Navigation/forms/maps usable | 360/390/430/768/1024/1440 pass without submitting writes | PASS | Not proof of populated financial/custody workflows |

Earlier fixture-creating workflow scripts and acceptance reports were inspected, **not rerun**. Their earlier PASS results are historical evidence, not current workflow PASS. No account impersonation was performed.

## Phase 3 — payout and reconciliation results

| Test | Expected | Actual | Status |
|---|---|---|---|
| Current wallets/full ledger | Balance and lifetime earnings match | USD 0 and −5 balances match; lifetime 0 and 50 match earning totals | PASS |
| Posted booking commission | Actual price and current 10% calculation match | Two earlier authorized test-account $25 bookings: $2.50 commission each | PASS arithmetic only, not genuine receipts |
| Historical paid evidence | Payment and settlement exist | Three older $10 paid bookings: zero payment/ledger rows | FAIL |
| Unique ledger references | No duplicates | Six unique references; UPDATE/DELETE immutable trigger inspected | PASS existing data; concurrent replay NOT VERIFIED |
| Driver completed earnings | Actual settled completed deliveries | No completed deliveries or driver ledger history; driver wallet 0 | NOT VERIFIED |
| Requested/processing/completed/failed withdrawals | Real statuses and matching debits/reversals | Zero rows across entire withdrawal table | NOT VERIFIED; honest empty state PASS |
| Completed payout amount/date/status/reference/recipient/evidence | Actual transfer and debit verified | No completed payout exists; recipient/evidence trail not demonstrated | NOT VERIFIED |
| Failed/cancelled reversals | Exactly one reserve reversal | Helper tests and locked decision function inspected; no genuine cases | PARTIAL |
| Cash delivery settlement | Cash held not withdrawable twice | +gross −commission, no cash-held offset | FAIL |
| Confirmation integrity | Payment/ledger/audit atomic | Separate payment/delivery/settlement/notice calls | PARTIAL |
| Settlement replay | Stored totals; no duplicate notices/entries | Stable ledger refs; delivery function recalculates current commission and inserts another notice | PARTIAL |
| Rail honesty | Unsupported payouts not operational | UI explicitly says outbound payouts unavailable | PASS |

The −$5 wallet comprises prior authorized test-account entries: $50 gross −$50 directly held customer funds −$5 commission. $45 net job earnings are not platform funds or payout proof. These postings do not prove genuine money movement.

Historical missing-evidence bookings: `40cfa9f9-e150-46ec-a9aa-da1a094225d3`, `93cf059c-a2e8-4ffe-b360-33898fc18ad8`, `d1d2c594-aef7-4dd8-a9c4-ec5db9b60a5e`. Obtain source evidence, never synthesize historical payouts or change immutable entries.

Cash is live. Personal-account EcoCash/bank transfers are manual, not an integrated platform payment/payout rail. No integration was added or enabled.

## Phase 4 — security/data integrity

| Check | Actual evidence | Status |
|---|---|---|
| Anonymous administrative access | Six admin read/preview RPCs denied; private-table reads denied/empty | PASS anonymous cases |
| Signed-out dispatch | Browser redirects to /login, dispatch content absent | PASS |
| Stored admin authorization | Auth middleware and stored-role checks inspected on server/RPC paths | PARTIAL; signed-in non-admin not exercised |
| Delivery progress authorization | Nullable comparison can skip denial for unrelated caller on unassigned delivery | FAIL by deployed SQL semantics; no exploit executed |
| Driver/customer isolation | Participant/owner RLS inspected | PARTIAL; two-user authenticated isolation not run |
| Financial client edits | Wallet/ledger SELECT-only policies; immutable trigger; withdrawal write guard | PARTIAL; destructive mutation attempts not run |
| Assignment authorization/audit | Job/assignee locks, versions, reasons, action/audit/notices inspected | PARTIAL; no successful live mutation/readback |
| State-machine bypass | Transition guard precedes trusted-writer return; pending custody blocks status/driver changes | PARTIAL; direct transition attacks not run |
| Every sensitive action audited | Admin RPCs record actions; broader direct admin table writes and non-atomic cash confirmation not equivalent to audited RPC coverage | PARTIAL |

## Smallest safe corrections — report first, then separately implement

1. Explicitly reject absent jobs and false/NULL participant authorization using `coalesce(...,false)`; regress unrelated-customer cancellation, owner cancellation and assigned-driver actions with isolated records.
2. Reuse booking-style cash-held offset for delivery accounting; consolidate receipt, status, ledger and actor/reason audit through an authorized atomic transaction. Retain stable refs and immutable rows.
3. Require actual delivery-scoped proof, not only driver ownership; regress missing/wrong-job/previous-custodian/current-custodian photos.
4. Investigate the $30 historical paid markers with genuine evidence. Do not invent backfills.
5. Calendar currently shows assigned deliveries, not pending manual offers, replacement reservations or unscheduled commitments even though these affect availability checks. Expose those existing commitments so empty calendar does not imply available capacity.
6. After corrections, complete persisted assignment, notices, races, handover, wrong-role and financial-failure verification in an isolated environment. Actual payout verification requires a connected rail and genuine transfer evidence.

## Tests executed and limits

- **12 unit-test files / 48 tests PASS:** dispatch schemas, financial helper, lifecycle helper, eligibility, payments, provider-money/location/preferences, cash reconciliation and driver verification. These are not transactional-workflow proof.
- `tests/dispatch-financials-readonly.py`: wallet/commission/refs, admin/anonymous/invalid-page, signed-in desktop/mobile finance and unchanged financial rows PASS.
- `tests/dispatch-responsive-readonly.py`: six widths, signed-in navigation/selection/safe forms/investigation/calendar/wallet/map/driver detail PASS; no writes submitted.
- `tests/dispatch-comprehensive-readonly.py`: source totals, 17 views, priorities/search/pagination, failed eligibility/bulk preview, missing-duration alternatives, genuine zero performance/custody, anonymous access, signed-out redirect, signed-in search and 17-table unchanged comparison PASS.
- Screenshots viewed: actual search, custody empty state, login redirect, wallet and mobile calendar. No page errors in executed checks.
- Initial browser assertion guessed /auth; actual redirect /login was verified, expectation corrected and rerun passed. This was a test assumption, not an application defect.
- Deployed functions/policies/triggers inspected, not changed. No fixture-creating script, settlement/completion/payout or destructive test executed. No manual application build/typecheck run. No content routes changed; existing route head metadata inspected.

**Operational verdict:** search/observation and current wallet inspection have supporting evidence. Authorization, cash accounting and delivery-proof defects prevent unrestricted clearance. Missing live workflow/payout data remains NOT VERIFIED, never presumed PASS from page rendering.

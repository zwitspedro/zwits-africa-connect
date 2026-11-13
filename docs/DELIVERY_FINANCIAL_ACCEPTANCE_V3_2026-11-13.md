# ZWITS — End-to-end delivery and financial acceptance V3

13 November 2026. **Overall: PARTIAL, with one newly reproduced FAIL.**

**A complete hosted customer-delivery-to-driver-earnings journey was NOT demonstrated.** Successful settlements were confined to disposable PostgreSQL. Hosted application checks used existing records read-only. No production-readiness claim is supported.

## Safety and environment audit — PASS

Inspected existing delivery creation and dispatch, offer acceptance, participant progress, scoped proof, cash receipt, settlement, wallet posting, driver finance summaries, weekly reporting, owner reads, admin financial projection and histories. Reused these implementations; no interface redesign, replacement finances, migration, production data write, historical modification or money transfer.

The managed database is shared by preview and the live app, not a separate test environment. Immutable ledger entries cannot safely be deleted after a successful hosted test. Therefore the permitted isolated fallback was used rather than creating more hosted financial test history.

The local server uses only `/tmp/dispatch-integrity/pg`, port 55439, with network listening disabled. The V3 runner creates and destroys a separate database. It contains schema-only fixtures, disposable UUID identities, test driver evidence metadata and expressly isolated deliveries; no genuine rows are copied. Storage-object metadata is simulated. It does not constitute a hosted image upload or real proof of work.

Definition hashes from `pg_get_functiondef` **matched the hosted definitions exactly** for `post_wallet_transaction`, `settle_delivery`, `confirm_cash_delivery`, `respond_delivery_offer_atomic`, and `admin_dispatch_financials`. This verifies the tested core is not a substitute financial implementation. The fixture uses simplified identity functions and selected RLS policies; it is not a complete hosted authentication/storage stack.

## Lifecycle acceptance matrix

| Test | Isolated result | Hosted result / boundary |
|---|---|---|
| Customer delivery creation | PARTIAL: 12 inserts enforce the actual caller’s customer identity through the existing mutation guard | NOT VERIFIED: `createDelivery` server function, pricing, automatic wave selection and customer form were audited, not submitted in this run |
| Driver eligibility | PASS: offline, unverified and unrelated driver acceptance denied; approved online driver with vehicle accepts | NOT VERIFIED with disposable hosted driver; current hosted eligible drivers: 0 |
| Assignment and acceptance | PASS: actual offer RPC assigns the driver; acceptance replay is idempotent | NOT VERIFIED in hosted customer-to-driver flow |
| Pickup | PASS: assigned driver moves accepted → picked_up; customer, other driver and anonymous actions denied in the 29-check suite | NOT VERIFIED this run; earlier hosted tests are not counted as new V3 evidence |
| Custody | PASS for stored driver and pickup timestamp; pending handover blocks completion | PARTIAL: dedicated populated admin custody presentation/physical handover not exercised |
| Delivery-specific photo | PASS for scope, owner, type and post-pickup metadata checks; missing, old, cross-job and wrong-driver objects rejected | NOT VERIFIED: new hosted upload; isolated metadata is not an upload |
| Completion | PASS: actual progress RPC completes all 12 isolated deliveries with valid scoped metadata | NOT VERIFIED hosted |
| Cash receipt | PASS for first 11 $25 deliveries; **FAIL for the twelfth with pre-existing -$27.50 commission debt** | NOT VERIFIED successful hosted receipt; no cash exchanged |
| Atomic settlement | PASS for correct posted values and rollback; **FAIL for cumulative-debt availability** | NOT VERIFIED successful hosted settlement |
| Driver earnings readback | PASS from actual isolated SQL rows through existing summary and existing rendered DriverEarnings component | PARTIAL: hosted signed-in empty finances match actual records, but no posted driver settlement exists |

The original isolated integrity suite passed **29 transaction/security/rollback/concurrency checks**. V3 adds **11 explicitly printed passing checks**, records the debt failure separately, and runs the driver-summary assertions against the SQL output. **46 rule tests across eight files passed**; these do not substitute for integration evidence.

## Newly reproduced defect — FAIL, not repaired in this acceptance-only task

`settle_delivery` first posts positive gross using `post_wallet_transaction` without `_allow_negative=true`. That function rejects *any resulting negative balance*, even when the movement is positive and reduces existing commission debt.

After eleven $25 cash jobs at the isolated stored 10% rate, the wallet is **-$27.50**. The twelfth job’s temporary gross post would produce **-$2.50** before the held-cash offset, so receipt fails:

> Insufficient balance: available -27.50, requested 25

This is a valid assigned, completed cash job with matching proof, not an unauthorized withdrawal. The error prevents recording its receipt/settlement. Lower-priced jobs can encounter the same category sooner when debt already exceeds gross. Both hosted function source and identical isolated function hashes support the root cause; it was reproduced only in the isolated database.

**Rollback PASS:** the failed job stays delivered/pending payment; no payment, ledger row or receipt audit is created; wallet balance/lifetime gross remain unchanged. Production settlement code and genuine balances were not silently changed. A targeted repair and regression acceptance are still required.

## Financial reconciliation — PASS for 11 successful settlements

| Field | Per successful test job | 11-job total |
|---|---:|---:|
| Delivery amount | $25.00 | $275.00 |
| Recorded paid payment | $25.00 | $275.00 |
| Posted gross | +$25.00 | +$275.00 |
| Recorded commission | $2.50 (ledger -$2.50) | $27.50 (ledger -$27.50) |
| Driver-held cash | $25.00 (ledger -$25.00) | $275.00 (ledger -$275.00) |
| Economic net | $22.50 | $247.50 |
| Wallet movement | -$2.50 | -$27.50 |
| Current wallet balance | Depends on prior jobs | -$27.50 |
| Withdrawable balance | $0.00 | $0.00 |
| Lifetime wallet gross | Gross convention preserved | $275.00 |

Every successful job has exactly three canonical references sharing its delivery UUID: `delivery:<id>:earning`, `delivery:<id>:cash_held`, `delivery:<id>:commission`. One matching paid payment and receipt actor/reason audit per job were verified. Completion alone is not counted as earnings: the twelfth job is explicitly excluded and displayed as unconfirmed/unsettled.

The isolated rate was changed to 20% after posting. Receipt replay still returns stored $2.50 commission; no extra notices or ledger rows. Admin shows stored $2.50 separately from the $5.00 current-rate comparison. Driver reads stored rows, never another permanent rate assumption. No real rate was changed.

Concurrent receipt and settlement replay, injected commission-posting failure, immutable UPDATE/DELETE denial and unchanged booking cash accounting passed the original 29-check suite.

## Driver finance interface — PASS isolated presentation; PARTIAL hosted

The existing `DriverEarnings` component was rendered unchanged in a test-only harness, with **actual SQL-exported isolated records**, not manufactured JSON history. The browser intercepted only that harness’s isolated-record file request. This is not a hosted server-function readback and must not be described as one.

Verified gross, commission, held cash, net, negative wallet movement, zero withdrawable balance, settlement timestamp, canonical references, week beginning **2026-11-09** in Harare, and the incomplete-settlement warning. Existing wallet-history pagination traversed **1–12, 13–24, 25–33** with final Next disabled; no source rows were duplicated.

| Width | Populated isolated existing earnings component | Hosted driver earnings/dashboard/profile |
|---:|---|---|
| 360 | PASS, 0px horizontal overflow | PASS, 0px overflow |
| 390 | PASS, 0px horizontal overflow | PASS, 0px overflow |
| 430 | PASS, 0px horizontal overflow | PASS, 0px overflow |
| 768 | PASS, 0px horizontal overflow | PASS, 0px overflow |
| 1024 | PASS, 0px horizontal overflow | PASS, 0px overflow |
| 1440 | PASS, 0px horizontal overflow | PASS, 0px overflow |

Populated 360/390 screenshots were inspected: values fit and long references wrap. Hosted checks covered 18 view/width combinations, financial refresh, navigation and signed-out login redirection. No browser runtime errors. Hosted figures were all $0 for the current driver with no ledger, completed deliveries or withdrawals. Hosted populated pagination and actual posted-driver readback remain NOT VERIFIED. Completed-delivery pagination requires more than 12 records; withdrawals are empty, so those populated pagers remain NOT VERIFIED.

## Administrator agreement — PASS isolated; PARTIAL hosted

Actual `admin_dispatch_financials` returned the same $275 gross, $27.50 commission, $247.50 net, -$27.50 wallet and zero wallet mismatches. It returned 12 completed jobs, 11 paid payments and 33 ledger rows. The failed job is awaiting confirmed payment, not falsely settled. Ledger pages contain **25 and 8 disjoint rows**. Non-admin projection access was denied. Receipt actor/reason audit matched each settled delivery in the underlying database.

Hosted signed-in admin financial history matched existing empty driver history; current wallet and ledger agree. Anonymous projection access and invalid pagination were denied. Desktop and 390px admin screens passed without errors/overflow. A newly posted delivery viewed through both hosted driver and admin screens, and populated admin audit UI for it, remain NOT VERIFIED.

## Historical $30 investigation — NOT VERIFIED financially

Read-only evidence was examined for all three bookings. They are **booking-table records**, not entries in the delivery lifecycle tested here.

| Booking | Genuine evidence found | Reconciliation |
|---|---|---|
| `40cfa9f9-e150-46ec-a9aa-da1a094225d3` | $10 cash; completed/paid marker; six lifecycle history rows from pending to completed on 2 August; four request/lifecycle notices | NOT VERIFIED: no payment row, ledger, payment reference, receipt audit or direct receipt |
| `93cf059c-a2e8-4ffe-b360-33898fc18ad8` | $10 cash; completed/paid marker; six lifecycle history rows on 2 August; four request/lifecycle notices | NOT VERIFIED: no payment row, ledger, payment reference, receipt audit or direct receipt |
| `d1d2c594-aef7-4dd8-a9c4-ec5db9b60a5e` | $10 cash; completed/paid marker; creation 29 July/completion 30 July; two ordinary conversation messages | NOT VERIFIED: no lifecycle history, linked notice, payment row, ledger, payment reference, receipt audit or direct receipt |

No disputes were found for these jobs. The notices establish lifecycle only, not receipt. Conversation messages do not evidence payment. The **$30 evidence gap remains**: these amounts cannot be reconciled to actual receipt, commission or wallet posting from available records. No missing payments or ledger entries were invented. External receipt documents were not supplied or verified; the investigation cannot establish that cash was or was not physically received.

## Hosted record preservation — PASS

Current snapshot: one delivery, zero completed deliveries, zero eligible drivers, six original ledger rows, eight payments, zero withdrawals. The driver-finance reader compared five entire delivery/financial table snapshots before/after unchanged. The admin reader independently confirmed unchanged wallets, ledger and withdrawals; both existing wallet balances and two earlier posted booking settlements reconcile. RLS stays enabled. No historical financial records or genuine transactions were modified.

## Deliverables and reproduction

- `tests/delivery-acceptance-v3-isolated.py`: fixed-socket lifecycle, failed-debt rollback, admin comparison, pagination, exported records and disposal.
- `tests/delivery-acceptance-v3-readback.ts`: existing driver summary assertions over those SQL records.
- `tests/delivery-acceptance-v3-ui.html`, `.tsx`, `.py`: test-only rendering and six-width browser verification; not linked into the app and no financial endpoint added.
- Existing `delivery-integrity-isolated.py`, `driver-finance-readonly.py`, `dispatch-financials-readonly.py` and eight relevant rule suites rerun.

Run the isolated integrity test on its documented disposable server, then V3 isolated and UI runners. Hosted read-only scripts require a managed signed-in session and privileged read credential; never disclose them. Test setup initially required the local Python database driver and corrected a percent-placeholder runner error; neither was an application defect. Latest preview diagnostic: build OK.

## Final classification

- **PASS:** ordinary isolated lifecycle/authorization, stored accounting for successful settlements, failure atomicity, replay/concurrency, isolated populated driver presentation and admin source agreement, all six driver screen widths, hosted read-only preservation.
- **FAIL:** valid cash receipt blocked when accumulated commission debt exceeds the next delivery’s gross.
- **PARTIAL:** full creation path, custody/admin presentation, hosted driver/admin finance acceptance, overall end-to-end acceptance.
- **NOT VERIFIED:** complete hosted delivery-to-earnings journey, new hosted proof upload, physical receipt/work, populated hosted financial histories, completed-job/withdrawal pagination, historical $30 receipt/settlement evidence and real payouts.

Next necessary work: targeted cumulative-debt settlement repair with isolated rollback/concurrency regressions; a genuinely separate disposable hosted financial environment for full browser acceptance; genuine source receipts for the three historical bookings. No real payout rail or transfer is part of this acceptance exercise.
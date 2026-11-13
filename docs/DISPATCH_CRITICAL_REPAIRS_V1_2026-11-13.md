# ZWITS Dispatch — critical integrity repairs V1

Date: 13 November 2026. Scope: participant authorization, delivery cash settlement and delivery-specific proof. No redesign, historical backfill, outbound payment rail or new financial tables.

## Classification

| Defect | Result | Verification boundary |
|---|---|---|
| Nullable delivery participant authorization | FIXED AND VERIFIED | Actual PostgreSQL function: unrelated customer, unassigned driver, anonymous and missing ID denied; actual customer cancellation and assigned driver pickup succeed. Hosted browser pickup/completion succeeds. |
| Driver-held cash credited as platform funds; non-atomic receipt | FIXED BUT NOT FULLY VERIFIED | Actual schema-only PostgreSQL transactions verify accounting, injected failure rollback, duplicates and concurrent requests. Hosted browser verifies rejected mismatching payment; successful hosted cash posting intentionally not performed because immutable test ledger rows cannot safely be cleaned up. |
| Cross-delivery proof accepted | FIXED AND VERIFIED | Missing, cross-delivery, previous-delivery, pre-pickup and wrong-driver photos rejected in isolated PostgreSQL; real private Storage upload and completion verified in browser with disposable accounts/jobs, then removed. |

These results do not establish production readiness or prove that work, cash or photographs are genuine.

## 1. Participant authorization

**Original defect:** SQL three-valued logic could allow an unrelated authenticated caller to cancel an unassigned delivery.

**Root cause:** `NOT (NULL OR false)` is NULL; a PL/pgSQL `IF NULL` does not execute its denial. Missing rows were not explicitly rejected.

**Changes:** `update_delivery_progress_atomic` now explicitly requires an authenticated actor, checks `FOUND`, coalesces each participant comparison to false and denies anything other than Boolean true. Driver actions remain assigned-driver-only; customer actions remain cancellation-only. Existing `delivery_transition_allowed`, dispatch hold, optimistic-version and custody triggers remain in use. The prior trusted setting is restored before a successful return. Administrator operations still use the separate existing authorized dispatch action/reason/audit workflow, not a participant bypass.

**Tests/results:** unrelated customer cancellation denied; eligible owner cancellation succeeds; assigned pickup succeeds; other driver, anonymous and missing ID denied; customer pickup and cancellation of completed delivery denied. Dispatch hold and pending handover still block progress. PASS.

## 2. Cash accounting and atomic confirmation

**Original defect:** `settle_delivery` posted gross earnings and commission without offsetting money already held by the driver. Separate payment/status/settlement calls could leave paid markers without ledger entries.

**Root cause:** Delivery settlement did not reuse booking held-money accounting and the server orchestrated independent transactions.

**Changes:** Reuse the existing `payments`, `provider_wallets`, `wallet_transactions`, `delivery_events`, `admin_audit_log` and `notifications`. The existing settlement now locks the delivery/payment, requires matching amount, customer, currency and method, and posts stable `delivery:<id>:earning`, `:cash_held`, `:commission` references. Already-held cash/direct money offsets gross; commission may create commission debt, not withdrawable cash. A replay returns the actual stored gross/commission instead of recalculating current rates; malformed pre-existing settlements are rejected for investigation without rewriting their ledger.

One new orchestration RPC, `confirm_cash_delivery`, is not a duplicate financial system: it calls the same existing `settle_delivery`. Only the assigned driver can attest receipt; customers or administrators cannot attest receipt of money they do not hold. It records payment receipt metadata, delivery paid marker, settlement, actor/reason event and audit in the same transaction. The completed status remains unchanged; completion before confirmation does not claim payment received. The authenticated server wrapper now makes one RPC call and does not use privileged multi-step writes. Drivers have a confirmation control with an explicit receipt confirmation dialog on completed cash jobs.

In-app notices are transactional rows and become visible only on commit; there is no external notification dispatch inside the transaction. Failures roll them back and replay creates no duplicate notices. No payout or money transfer was implemented.

**Concrete accounting test:** USD25 gross, 10% commission USD2.50, USD22.50 economic net earnings; ledger +25 gross, -25 cash held, -2.50 commission. Wallet movement is -2.50 owed, not +22.50 withdrawable. Existing lifetime gross-earning convention is preserved, matching bookings.

**Tests/results:** exact values and stable refs PASS; stored replay after rate change PASS; actor/reason PASS; injected commission failure after earlier posts leaves no payment, paid marker, wallet movement, partial ledger or receipt audit PASS; four concurrent receipt requests yield exactly one new settlement and audit PASS; four concurrent settlement replays return stored totals with only three entries PASS; UPDATE/DELETE immutability PASS. Successful money posting tested only in the disposable local database, not against hosted genuine finances.

## 3. Delivery proof

**Original defect:** Any photo under the current driver's folder could satisfy completion, including another job's photo.

**Root cause:** Server validation did not check the delivery folder even though the uploader already included it.

**Changes:** Require the exact existing generated upload shape `<assigned-driver>/<delivery-id>/delivery-proof-<generated-id>.(jpg|png|webp)`, a matching private `job-photos` object owned by that driver, allowed image metadata and creation at/after the actual pickup timestamp. Apply checks before completion or completion replay; cash confirmation also checks retained delivery proof. Admin signing validates the driver/delivery scope and retains a 300-second private signed URL. No public bucket or broad read policy added.

**Tests/results:** no photo, other delivery, previous delivery, same-job photo predating pickup, wrong driver and traversal/URL rejected; correct scoped post-pickup photo succeeds. Browser: Confirm pickup → no-proof button disabled → upload actual test JPG through existing helper → Mark delivered → stored delivery/photo readback. PASS. Hosted bucket remains private.

A scoped upload proves association and storage ownership, not camera capture time or that the photograph depicts real work; re-uploaded identical image content cannot be identified reliably by this repair.

## Executed verification

- 54 Vitest tests across 13 relevant files PASS (including six new proof-path regressions).
- 29 actual PostgreSQL isolated workflow/security/accounting checks PASS. Schema-only snapshot includes actual repaired functions, immutable ledger and delivery guard/hold/custody triggers; no genuine rows imported. Local Storage-object fixtures model server checks; hosted Storage upload separately verified.
- Browser, disposable customer/driver: pickup, upload, completion, refresh-source readback and mismatching receipt denial PASS; zero browser runtime errors.
- Browser mismatch deliberately creates no ledger or wallet: genuine bookings/payments/wallets/ledger compared before/after and unchanged. Disposable hosted accounts, jobs, payment fixture, events, notices and uploaded files removed in finally.
- Hosted ledger remains six original entries; RLS remains enabled on deliveries, events, payments, wallets and ledger; `job-photos` public=false.
- Existing booking settlement unchanged in source/database; separate isolated booking USD25 cash settlement still returns 25/2.50/22.50 and wallet -2.50.
- Latest preview diagnostic: build OK. No manual build/typecheck performed.

## Code and database changes

- Applied `drizzle/migrations/0028_delivery_integrity_cash_atomic_repairs.sql`; generated types refreshed.
- Replaced two existing delivery RPCs and added one authorized receipt orchestration RPC. No new tables, parallel ledger or booking settlement change.
- `src/lib/payments.functions.ts`: authenticated one-transaction cash confirmation.
- `src/lib/delivery-proof.ts`, `.test.ts`, `admin-dispatch.functions.ts`: canonical private signing scope.
- Driver recent-delivery receipt control and payment fields; existing user lookups now use early guards.
- `tests/delivery-integrity-isolated.py`, schema-only fixture and `tests/delivery-integrity-browser.py` retain regression workflows. The local runner requires psycopg2 and a disposable Postgres at the fixed /tmp socket/port; it cannot fall back to project connection settings.

## Outstanding limitations

- Successful hosted cash confirmation/wallet UI readback is NOT VERIFIED: immutable test postings cannot be removed safely. The actual transaction logic is verified in isolated PostgreSQL, not merely mocked unit tests.
- Existing driver earnings/weekly "payouts" UI uses a hardcoded 15% estimate and counts completion before receipt, while actual stored commission currently uses 10%. This pre-existing presentation defect was observed in the browser and deliberately not expanded into an unrelated dashboard rewrite; it must not be used as financial evidence. Authoritative admin financial history and ledger remain the source.
- Existing driver earnings mobile page has 131px horizontal overflow at 390px. Receipt control/transaction works; a full mobile-layout PASS is not claimed. Dispatch responsive views were not changed.
- Historic missing booking evidence remains untouched; no settlements or transfers fabricated.
- Granular administrator direct-write audit coverage, automatic alternative-driver recommendations and real moving-device tracking are outside this repair.
- Physical cash receipt, actual courier performance and outbound payouts remain unverified/unavailable. No production-readiness claim.

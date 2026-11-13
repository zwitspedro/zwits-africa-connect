# ZWITS — Cumulative commission debt and cash settlement repair V4

Date: 13 November 2026. Overall: **PARTIAL** — repair applied and isolated workflows PASS; successful hosted delivery-to-earnings journey **NOT VERIFIED**. No production-readiness claim.

## 1. Audit and root cause

`post_wallet_transaction` tests the resulting available balance, not whether a movement is a legitimate positive earning. It rejects **any** transaction type (`job_earning`, `adjustment`, `commission`, `refund`, `withdrawal`) whose result is negative unless its existing `_allow_negative` argument is true. A positive credit can therefore fail while reducing debt.

Existing delivery sequence: lock delivery, validate/lock matching paid payment, validate existing stable references for replay, calculate new commission, post positive gross (default exception false), offset driver-held gross (exception true), post commission (exception true for cash/direct), record settlement event and notice. `confirm_cash_delivery` wraps paid payment, paid delivery marker, settlement, receipt actor/reason audit and notices in one transaction.

Reproduced before repair: balance −$27.50 + gross $25 = −$2.50 at the first post, triggering `Insufficient balance`. The rest never runs; payment, wallet, ledger and audit roll back. Correct complete cash outcome is **−$30**, not −$2.50: cash gross is held by the driver and fully offset, and new $2.50 commission increases debt.

Wallet rows already support negative commission debt. General posting is privileged; ordinary clients cannot execute it. Withdrawal requests verify authenticated provider/driver role, positive bounded amount, supported method, wallet row lock, available balance and absence of an existing pending request. Ledger updates/deletes are immutable. Booking uses the same general posting but is deliberately unchanged.

## 2. Exact changes and authorization

- Applied `drizzle/migrations/0029_delivery_settlement_cumulative_debt.sql`.
- Added `public.post_delivery_settlement_internal(uuid,numeric,numeric)` as **invoker-rights, owner-only**, not another security-definer entry point. Hosted ACL is `{postgres=X/postgres}`. PUBLIC, anon, authenticated and service_role have no execute grant.
- The existing owner-executed `settle_delivery` delegates new posting to it. The helper validates completed/assigned/paid delivery, matching customer/amount/currency/method, gross and calculated new commission, and absence of existing references. It derives owner and references from the delivery, not caller-supplied wallet identifiers.
- Only this validated delivery path explicitly passes the existing negative-result exception for its gross, cash-held and commission posts. It reuses the existing wallet and immutable ledger; no new tables, ledger or payout system.
- Delivery/payment locks remain; the first existing wallet posting obtains the wallet row lock, retained through all subsequent posts and commit. Withdrawals lock the same wallet and cannot observe intermediate gross as available funds.
- Existing stable references, replay validation/stored amounts, notices, audits, authorization and delivery-specific post-pickup evidence remain unchanged.
- `post_wallet_transaction`, `settle_booking`, `confirm_cash_delivery`, and `request_wallet_withdrawal` definitions remained byte-identical, confirmed locally and hosted by function hashes.
- Added isolated A–M tests and driver readback assertions; existing delivery regression script accepts an optional repair migration. Architecture rule recorded in `AGENTS.md`.

No client flag, customer, driver, ordinary RPC or service-role direct helper call can acquire the owner-only exception. A forged `zwits.trusted` flag still fails helper execution permission. Database owners remain trusted administrators by design.

## 3. Required tests — isolated PostgreSQL

All postings took place only at `/tmp/dispatch-integrity/pg:55439`, with no TCP listener or hosted credentials. Each V4 database was destroyed afterward. Opening balances are isolated ledger-backed test postings, not hosted history.

| Test | Result | Evidence |
|---|---|---|
| A | PASS | −27.50, cash 25, fee 2.50 → balance −30; withdrawal availability 0; first positive post records −27.50 → −2.50. |
| B | PASS | −100, cash 10, fee 1 → balance −101; withdrawal availability 0. |
| C | PASS (isolated) | −5, platform-collected 10, fee 1 → wallet +9, final/withdrawable 4. Tests existing non-held settlement accounting only; card rail is not enabled. Cash cannot clear old debt because cash is already held outside the platform wallet. |
| D | PASS | Zero balance, cash 25, fee 2.50 → balance −2.50, withdrawal availability 0. |
| E | PASS | Unauthorized gross credit, direct helper invocation by client/service role, forged trusted setting and direct client settlement denied. |
| F | PASS | Withdrawal of 1 against −101 denied; complete financial snapshot unchanged. |
| G | PASS | Withdrawal of 5 against available 4 denied; complete snapshot unchanged. |
| H | PASS | Replay after rate changes 10% → 20% returns stored 2.50, with no new ledger/payment/audit/notice writes. |
| I | PASS | Eight concurrent assigned-driver confirmations return one new settlement and seven replays: one paid payment, three stable ledger references, one receipt audit/event. |
| J | PASS | AFTER gross-insert injected failure rolls back every related change. |
| K | PASS | AFTER cash-held-insert injected failure rolls back every related change. |
| L | PASS | BEFORE commission-insert injected failure rolls back gross, held offset and every related change. |
| M | PASS | Booking definition unchanged; normal 25 cash booking yields gross 25, fee 2.50, net 22.50, balance −2.50 and three entries. |

J/K/L compare full stored snapshots of deliveries, payments, wallet transactions, wallets, notifications, delivery events, actor audit and withdrawal records. Failure injection exists only in the disposable database.

Additional PASS: original defect reproduced before repair; unchanged function definitions; immutable ledger update/delete rejected even under privileged role; ordinary positive adjustment ending below zero still rejected; mismatched payment rejects atomically; owner-scoped driver summaries agree with production admin projection. **19 V4 checks total**, including A–M.

Existing delivery integrity suite **29/29 PASS with the repair applied**: participant authorization, missing rows, pickup, correct and incorrect proof, receipt, replay, failure rollback, concurrency, booking, dispatch hold, custody handover, RLS and immutability. Financial rule suites **30/30 PASS across four files**. Preview diagnostics: latest entry `build OK`.

## 4. Reconciliation from actual isolated stored rows

USD amounts:

| Test | Opening | Gross | Commission | Cash held | Economic net | Wallet movement | Final balance | Withdrawable |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| A | −27.50 | 25 | 2.50 | 25 | 22.50 | −2.50 | −30 | 0 |
| B | −100 | 10 | 1 | 10 | 9 | −1 | −101 | 0 |
| C | −5 | 10 | 1 | 0 | 9 | 9 | 4 | 4 |
| D | 0 | 25 | 2.50 | 25 | 22.50 | −2.50 | −2.50 | 0 |
| I | −100 | 10 | 1 | 10 | 9 | −1 | −101 | 0 |

Every successful job has exact `delivery:<id>:earning` and `:commission` references, plus `:cash_held` for cash. Tests verify amounts/types, opening and intermediate gross balances, ledger sum/wallet movement, wallet balance/lifetime gross/pending balance, paid payment/customer/method/currency and paid delivery. Cash cases also require exactly one assigned-driver reason-bearing receipt audit/event. C has no cash receipt because it tests platform-held settlement, not cash confirmation.

Actual isolated owner-scoped RLS reads feed the existing `summarizeDriverFinance`; no duplicate calculation infrastructure. Driver gross, commission, cash, economic net, wallet movement, commission owed, withdrawable and recorded weekly net agree with `admin_dispatch_financials`; admin wallet/ledger mismatch count is zero for all five successful scenarios.

## 5. Hosted verification — read-only

**PASS:** repair exists in hosted database, helper is invoker-rights/owner-only, public settlement remains restricted, and four unchanged function definitions match pre-repair hashes.

**PASS:** before/after fingerprints match for every row in the five checked financial/delivery tables:

| Records | Count | Unchanged MD5 fingerprint |
|---|---:|---|
| Wallets | 2 | `4533f6c666c2f775404fab5fc856fdd1` |
| Ledger | 6 | `6eb29bb80360ea5c10b0495ca11358f0` |
| Payments | 8 | `53a09519028c38541948baa4f406ab7b` |
| Withdrawals | 0 | `d41d8cd98f00b204e9800998ecf8427e` |
| Deliveries | 1 | `7eb182f0781e843aa8f5178e654a3476` |

No hosted test transactions, financial backfills, historical updates or real transfers occurred. No redesign or payout rail was enabled.

## 6. Limits and final classification

- Repair accounting/security/atomicity/idempotency: **PASS in isolated workflows**, with hosted definition/ACL installation **PASS**.
- Complete hosted delivery → cash receipt → settlement → driver/admin earnings journey: **NOT VERIFIED**. Creating artificial hosted irreversible money records is prohibited; genuine work/receipt evidence was not supplied.
- Production readiness: **NOT VERIFIED**; isolated tests do not establish it.
- Booking cumulative-debt behavior is intentionally unchanged. Its existing gross-post default can still reject when prior debt exceeds gross; M verifies preservation, not a booking repair.
- Historical $30 booking evidence gaps, commission repayment collection and real payouts remain unresolved and outside scope. No missing evidence was manufactured.
- Non-held/card scenario C is isolated accounting coverage, not proof of a working electronic rail or real transfer.
- No UI changes; no new claim of mobile/browser acceptance for this V4 repair. Existing V3/V2 browser findings remain separate.

Reproduce: `python3 tests/delivery-debt-v4-isolated.py drizzle/migrations/0029_delivery_settlement_cumulative_debt.sql` against the fixed disposable socket-only server. The test cannot be redirected to hosted finances through an environment connection string.
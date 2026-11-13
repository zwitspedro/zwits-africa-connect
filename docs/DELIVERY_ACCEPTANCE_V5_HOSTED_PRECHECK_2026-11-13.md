# ZWITS V5 — main-hosted precheck and isolated acceptance handoff

Date: 13 November 2026. This is an interim evidence report, not final acceptance or a production-readiness claim.

## Main-hosted verification: PASS

Read-only database inspection compared actual installed definitions against migration `0029_delivery_settlement_cumulative_debt.sql` and the V4 report. No installation discrepancy found.

| Function | Hosted definition MD5 | Result |
|---|---|---|
| post_delivery_settlement_internal | 860d904176ed409c727a8f22b2eda16e | Matches V4 |
| settle_delivery | 5e04c87bbfc2de2717a8ca144cf1f249 | Matches V4 |
| confirm_cash_delivery | f211be210a53ac4c34022bf5f5c4ccc2 | Unchanged |
| post_wallet_transaction | 89f61aba7187d6f656d4b018eaed59cf | Unchanged |
| request_wallet_withdrawal | 5494a19a88ca873ac3f2ba149069c153 | Unchanged |
| settle_booking | 4c4f2cbcf35164e8dc6d833891ace24e | Unchanged |

Helper permission inspection: owner postgres, invoker-rights (`prosecdef=false`), ACL `{postgres=X/postgres}`. PUBLIC execution explicitly absent; anon, authenticated and service_role execute checks all false. Among public function bodies, only `settle_delivery` references the helper. Database-owner authority remains trusted; this inspection does not assert protection against owners modifying functions.

Actual function bodies retain assigned-driver receipt authorization, delivery-specific post-pickup proof validation, matching amount/customer/USD/method validation, delivery and payment row locks, stored-value replay and stable references. General wallet posting and withdrawal both obtain the wallet row lock. Withdrawal availability is checked against the existing wallet, not transient gross or cash held outside the platform.

Actual installed unique indexes include `wallet_transactions_reference_uniq`, `payments_delivery_uniq`, `payments_booking_uniq` and `delivery_events_dedupe_idx`. `wallet_transactions_no_mutate` remains a BEFORE UPDATE OR DELETE trigger using `wallet_transactions_immutable` (definition MD5 `defebfd8a4354da9a51829407b91c200`). These are installation observations, not newly executed V5 concurrency or rollback tests.

Existing general posting and settlement ACLs also include `sandbox_exec`; these predate V4 and do not grant helper execution. No permissions were widened or changed.

## Genuine financial records: unchanged

Current full-row fingerprints equal the V4 report's fingerprints:

| Records | Count | MD5 |
|---|---:|---|
| Wallets | 2 | 4533f6c666c2f775404fab5fc856fdd1 |
| Ledger | 6 | 6eb29bb80360ea5c10b0495ca11358f0 |
| Payments | 8 | 53a09519028c38541948baa4f406ab7b |
| Withdrawals | 0 | d41d8cd98f00b204e9800998ecf8427e |
| Deliveries | 1 | 7eb182f0781e843aa8f5178e654a3476 |

No main-hosted record writes, test identities, financial postings, withdrawals, external transfers, schema changes or application redesign occurred in this precheck.

## Safe hosted test environment: PASS for separation, workflows pending

Created the separate draft **V5 isolated delivery acceptance** (`drft_01m7asp3qafvc9jpgmsb9qds7k`, thread `thr_j3jo70gsen8r`). Initial creation reported setup in progress. A subsequent `drafts.list` result confirmed **its own test database; data changes stay in this draft and never reach the live app**.

The draft received the full V5 acceptance requirements with an explicit stop-before-writes gate if isolation cannot be independently verified. It must verify its schema, use disposable identities/records, prevent external transfers, exercise the existing application and produce its own test evidence. Main-project inspection is not a substitute for those results. The draft must not be accepted into main without explicit user review.

## Historical $30: UNRESOLVED

Read-only inspection of the three identified bookings found:

| Booking | Price | Status | Payment rows | Ledger rows | Payment reference | Receipt audit/direct receipt | Relevant message/attachment candidates |
|---|---:|---|---:|---:|---|---|---:|
| 40cfa9f9-e150-46ec-a9aa-da1a094225d3 | 10.00 | completed / paid / cash | 0 | 0 | absent | absent | 0 |
| 93cf059c-a2e8-4ffe-b360-33898fc18ad8 | 10.00 | completed / paid / cash | 0 | 0 | absent | absent | 0 |
| d1d2c594-aef7-4dd8-a9c4-ec5db9b60a5e | 10.00 | completed / paid / cash | 0 | 0 | absent | absent | 0 |

The first two have lifecycle status histories without receipt metadata; the third has no status-history rows. All have customer-confirmed timestamps, which do not establish cash receipt. No subject-linked admin audit records or direct receipt records were found. Message search considered attachments or receipt/paid/cash/transfer/transaction/payment terms; absence of such candidates does not exclude evidence held outside the app. No evidence was manufactured and no balances were backfilled.

## Required clarification in scenario E

The requested scenario E is opening wallet 10, cash gross 25, commission 2.50, final wallet 7.50, withdrawable 0. The existing rule is withdrawable = max(0, available_balance). If the opening 10 represents legitimate platform-held available funds, the cash job's held-money offset prevents the new cash from becoming withdrawable but does not erase the earlier funds: expected remaining availability is 7.50, not 0.

The draft was instructed to investigate and report this discrepancy, not silently change finance rules or fabricate a restriction to satisfy the requested assertion. A zero-withdrawable result needs a genuine, separately evidenced restriction on the opening funds. This is a test-expectation issue pending evidence, not an applied repair.

Duplicate authorized cash confirmation must return safe replay; it is not an unauthorized operation that must always error. V5 also requires failure injection AFTER commission insertion; V4's previous commission failure was BEFORE insertion, so that result must not be relabeled as V5 coverage.

## Interim classifications

| Area | Classification | Evidence / blocker |
|---|---|---|
| Main-hosted V4 installation | PASS | Actual hashes match V4 |
| Helper permissions | PASS | Invoker-rights, owner-only, four denied public/client-role paths |
| Safe isolated environment separation | PASS | Draft service confirms own test database; draft verification still required before writes |
| Complete delivery lifecycle / cash confirmation / settlement | NOT VERIFIED in V5 yet | Separate draft acceptance is running |
| Cumulative debt / wallet security / rollback / concurrency | NOT VERIFIED in V5 yet | Prior V4 isolated tests are historical evidence only |
| Driver interface / admin reconciliation / mobile / regressions | NOT VERIFIED in V5 yet | Await populated isolated-hosted application checks |
| Historical $30 | UNRESOLVED | No matching receipt/payment/ledger evidence found |
| Overall production readiness | NOT VERIFIED | No completed V5 isolated-hosted journey evidence yet |

V5 new workflow test count in this main thread: **0**. Read-only database evidence queries: **6** (definitions, permission/hash summary, constraints/triggers/callers, unique indexes, historical evidence and financial fingerprints). No screenshots were captured or claimed. Final test counts and application screenshots must come from the separate draft's completed report.
# ZWITS — Driver Finance Integrity and Mobile Experience V2

Date: 13 November 2026. Overall: **PARTIAL** — presentation and actual empty-account verification pass; populated genuine driver settlements and external payout evidence are unavailable.

## Original defects and root causes

- `delivery-config.ts` hardcoded 15%, and `driverPayout(price)` treated 85% of a job price as earned money.
- Driver Today/All time tiles, weekly chart, completed rows, active delivery and offer labels reused that price estimate. Neither confirmed receipt nor recorded settlement was required.
- “Weekly payouts” misleadingly described economic earnings as an outbound transfer. Weeks used completion/creation dates and browser-local week boundaries rather than settlement timestamps.
- Completed-delivery reads were capped at 200; financial activity and withdrawal history were absent from driver Earnings.
- Reported 131px overflow at 390px was **not reproduced** on the actual existing account: baseline overflow measured 0px. That account has no completed deliveries, ledger rows or withdrawals. The previous populated cash-receipt row used a nonwrapping horizontal arrangement; that structural risk has been replaced with stacked mobile content.

## Changes made

- Removed the fixed driver commission and net-price helper. Active jobs and offers now show job value before commission, not a confirmed payout.
- Added an authenticated read-only owner-scoped financial reader using existing `provider_wallets`, `wallet_transactions`, `deliveries` and `provider_withdrawals`. All history pages are read before aggregation; no new wallet, ledger, settlement, payment rail, migration, permission change or financial write.
- Confirmed delivery totals require delivered/paid status and a complete posted earning/commission pair with exact delivery references. Cash and manual direct payments also require the matching held-funds offset. Incomplete records are excluded and explicitly counted.
- Gross = recorded earning; commission = recorded charge; cash/direct received = recorded held offset; economic net = gross minus commission; wallet movement = gross minus commission minus already-held money. No rate estimation.
- Current withdrawable balance = positive portion of stored available balance. Negative balance remains visible as commission owed. Pending clearance, lifetime wallet gross, withdrawal request totals, recorded paid statuses, failures/cancellations and actual linked refund reversals remain separate.
- Wallet lifetime earnings retain their existing gross convention; on a multi-role account this is explicitly wallet-wide, whereas delivery totals are delivery-only.
- Weeks begin Monday in Harare (UTC+2), grouped by actual earning-ledger timestamp. Today’s net also uses settlement timestamps, not completion dates.
- Driver home and mobile dashboard/profile use the same authoritative finance read. Unavailable reads show loading/unavailable rather than estimated zero; stale data after a failed refresh is labelled.
- Transaction and withdrawal history show references, timestamps, balances/statuses, destinations and linked debits/reversals. All history can be paged. Completed rows show receipt/settlement status and retain assigned-driver cash confirmation through the existing atomic function.
- Removed the 200-row completed-query cap with paged owner-scoped reads. Mobile completed rows stack; long references wrap. The header uses a shrink-safe grid and finance controls are at least 48px.

## Source-to-display verification

Actual signed-in existing driver account: wallet available USD 0.00, pending USD 0.00, lifetime gross USD 0.00; zero driver ledger rows, zero completed driver deliveries and zero withdrawals.

| Figure / behaviour | Source | Result |
|---|---|---|
| Gross, commission, cash, economic net, delivery wallet movement | Posted matching delivery ledger rows | PASS for actual zero state; populated genuine history NOT VERIFIED |
| Current wallet balance, withdrawable, pending clearance, lifetime gross | Existing wallet row | PASS: each USD 0.00 |
| Pending requests, recorded paid, failures/cancellations | Existing withdrawal records | PASS for actual zero state; populated history NOT VERIFIED |
| Posted reversal totals | Posted linked refund reference | PASS unit rule; populated genuine reversals NOT VERIFIED |
| Weekly settled history | Harare week of earning transaction | PASS unit rule and honest empty UI; genuine populated weeks NOT VERIFIED |
| Completed/unpaid status | Existing deliveries and ledger | PASS unit exclusions; genuine populated driver readback NOT VERIFIED |
| Payout capability / transfer evidence | No genuine transfers or withdrawal records | NOT VERIFIED; outbound payouts remain unavailable |
| Immutable records preserved | Before/after snapshots of five tables | PASS: wallets, ledger, withdrawals, deliveries and payments unchanged |

## Tests executed

### Financial and regression tests — PASS

42 tests in eight files: driver-finance (15), payment-policy (8), provider-job-money (3), cash-reconciliation (2), dispatch-financials (5), delivery-eligibility (2), driver-verification-schema (3), dispatch-assignment-schema (4).

Driver rules cover stored commission differing from both 10% and 15%; USD25 gross/2.50 stored commission/25 held cash/22.50 net/−2.50 wallet movement/zero withdrawable; unpaid/cancelled/unposted exclusions; wrong-job references; incomplete held-funds records; duplicate earning references; readback without double count; Monday/year-safe ISO week keys; Harare today boundaries; direct transfers separated from cash; platform-held net credit; honest emptiness; pending/recorded-paid/failed totals and actual refund reversal references. Test inputs stay in unit tests; no artificial financial history was written to the hosted database.

`tests/driver-finance-readonly.py`: actual driver signed in through the managed session; all 14 displayed financial figures matched actual USD0 records; refresh, desktop/sidebar and mobile Earnings navigation passed; wallet/weekly/withdrawal empty states checked; signed-out driver redirected to login; no page runtime errors.

### Screen verification — PASS in actual existing account

| Width | Driver Earnings | Mobile dashboard | Mobile profile |
|---|---|---|---|
| 360px | 0px overflow | 0px | 0px |
| 390px | 0px overflow | 0px | 0px |
| 430px | 0px overflow | 0px | 0px |
| 768px | 0px overflow | 0px | 0px |
| 1024px | 0px overflow | 0px | 0px |
| 1440px | 0px overflow | 0px | 0px |

Screenshots reviewed at 390px and 1440px for financial categories and visible complete history empty states. Nothing is concealed through page-level clipping. Populated references, large amounts, enabled cash-receipt buttons and history pagination require genuine corresponding rows for full hosted verification; **NOT VERIFIED**, not falsely marked passed. The original exact 131px populated-state overflow remains **NOT VERIFIED** because its triggering record is unavailable.

## Remaining limitations

- No actual driver financial rows or payouts exist. No genuine transfer was performed or claimed. Production readiness is not asserted.
- Four underlying reads are individually authoritative but do not run in one database snapshot; simultaneous settlement during refresh can transiently produce an incomplete-state warning. Refresh/polling resolves read timing; atomic settlement itself is unchanged.
- Paged full-history reads avoid truncated totals but could become costly for very large accounts; a future owner-authorized SQL aggregate would improve scale, outside this targeted presentation repair.
- Existing unrelated marketing `/home` recruitment calculator still contains an estimated 15%/85% assumption; identified in audit and deliberately not modified under the “do not modify unrelated features” instruction. No such estimate remains in driver finance or delivery offer/active-job displays.
- Historical booking evidence gaps, external payout rail and genuine physical receipt verification remain prior blockers; no records were backfilled.

No publication or actual payout was performed.
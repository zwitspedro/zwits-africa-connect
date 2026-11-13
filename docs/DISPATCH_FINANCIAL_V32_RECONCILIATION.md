# Dispatch financial verification V3.2

Verified 13 November 2026. Overall: **PARTIALLY COMPLETE**. No sample financial records were created, no settlements were invoked, and no wallets, payments, withdrawals or immutable transactions were modified.

## Requirement results

| Requirement | Status | Evidence |
|---|---|---|
| Actual driver earnings from completed jobs | NOT VERIFIED | Read-only completed-delivery and ledger display added. No completed driver deliveries or driver earnings transactions exist to verify populated history. Zero is not invented historical income. |
| Actual wallet balances | PASS | Signed-in dispatch shows the existing driver's USD $0.00 wallet, matching its ledger. Both existing provider/driver wallet balances match ledger sums; the other balance is −$5.00 commission debt. |
| Withdrawal requests | NOT VERIFIED | Paginated request display added; no withdrawals exist. |
| Completed withdrawals | NOT VERIFIED | Recorded paid status supported, but no such records exist; status alone cannot verify an outbound transfer. |
| Failed withdrawals | NOT VERIFIED | Failure reason, reserved debit and reversal display added; no genuine failed withdrawal exists. |
| Pending withdrawals | NOT VERIFIED | Requested and processing statuses counted separately; no existing requests. |
| Transaction references | PARTIALLY COMPLETE | Existing booking references inspected. Driver ledger, payment and withdrawal references supported but no populated driver history available. |
| Relevant timestamps | PARTIALLY COMPLETE | Driver wallet updated time and query time verified on desktop/mobile. Creation, posting, completion and processing timestamps supported; populated driver transaction history absent. |
| Payment and settlement status | PARTIALLY COMPLETE | Completed jobs distinguish awaiting payment, recorded ledger and missing/incomplete ledger. Driver populated states remain unverified. |

## Existing-record reconciliation

- Database contains 6 completed service bookings, 0 completed deliveries, 8 payment records, 6 immutable ledger entries, 2 wallets and 0 withdrawals.
- Two previously posted $25 service bookings each have exactly one $25 earning, one −$25 direct-money offset and one −$2.50 commission. Total ledger gross $50, commission $5, net job earnings $45; wallet movement −$5 because customer money is held directly, not platform-held withdrawable funds.
- Both recorded commissions match the existing active 10% category rate. These are known earlier authorized test-account bookings, not evidence that genuine customer work or money transfers occurred. No new test financial records were introduced.
- Three older completed $10 bookings marked paid have **no payment row and no earning ledger entry**. Their settlement history is incomplete; $30 of marked-paid job value cannot be reconciled. A fourth older completed $10 booking remains payment-pending with no payment/ledger record.
- Missing history was not backfilled: confirmation evidence is absent. Do not reinterpret job payment flags as money received or create historical payouts.
- Every existing wallet balance equals its full ledger sum; lifetime gross earnings equals job-earning ledger totals. Pending wallet balance is displayed as stored, not inferred from withdrawals.
- No duplicate transaction references exist. Unique reference indexes and the immutable UPDATE/DELETE trigger remain intact.
- Existing withdrawal request logic reserves funds through a ledger debit; admin failed/cancelled decisions require matching debit and post a stable-reference reversal. These safeguards were inspected, not exercised on real withdrawals because none exist.

## Settlement limits and risks

**Duplicate settlements: PARTIALLY COMPLETE.** Booking settlement locks the booking, checks the stable commission reference, and returns recorded values on replay. Delivery settlement locks the delivery and uses unique earning/commission references. Actual concurrent/repeated settlements were not invoked: doing so would create financial records and notices. There are no completed deliveries to exercise safely.

**Delivery cash reconciliation: BLOCKED pending an evidenced completion/receipt workflow.** Existing `settle_delivery` posts gross earnings and commission after a paid payment record, but unlike booking settlement it does not offset cash held directly by a driver. No existing completed delivery demonstrates this path. This could incorrectly make cash withdrawable if used; it was not changed as part of this read-only audit. A safe correction requires a separate scoped settlement change and isolated tests, not fictional payout history.

**Historical commission comparison:** recorded ledger commission remains authoritative. Current `calc_commission` comparisons are explicitly labelled current-rate comparisons, not proof of the rate at historical settlement time. The active default is 10%; the function's legacy 15% fallback only applies when no category/default active rate exists and was not changed.

**Actual payouts: BLOCKED.** No verified outbound payout rail or transfer evidence is connected. Existing admin withdrawal decisions cannot mark a payout paid; no money was sent.

## Implementation and security

- Migration `0027_dispatch_financial_history_read_only.sql` adds only `admin_dispatch_financials`; no tables or financial data changed.
- New protected `dispatchFinancials` server function calls this admin-authorized projection. Existing settlement, commission, withdrawal and reconciliation functions remain unchanged.
- Reused the Dispatch Centre Driver performance view; replaced its abbreviated payout list with wallet, completed job, withdrawal, ledger and payment history.
- SQL checks the authenticated stored admin role; no client roles are trusted. Anonymous execution is revoked. Existing RLS/grants/ledger immutability unchanged.
- Each history is paginated in 25-row pages with authoritative total counts. Periods are at most 31 days; current wallet snapshots are labelled separately. Harare timestamps used. Withdrawal statuses do not imply verified transfer.
- No payment destination, account credentials or PIN is exposed by this projection.

## Tests executed

- **PASS:** 28 unit tests across financial reconciliation (5), insights validation (4), assignment schema (4), payment policy (8), cash reconciliation (2), provider preferences (5).
- **PASS:** Read-only authenticated RPC matches actual driver records; anonymous access rejected; negative page rejected.
- **PASS:** Existing 2-wallet balance/lifetime checks, 2 recorded booking price/commission checks, unique reference check.
- **PASS:** Signed-in admin opens Driver performance and reads financial history, on desktop and 390px mobile; no browser errors or horizontal page overflow. Empty history is explicitly unavailable.
- **PASS:** Full wallet/transaction/withdrawal readback unchanged after checks. Current build diagnostics report OK.
- **Failed test attempt, corrected:** Initial test incorrectly assumed the driver had no wallet. Actual zero-balance wallet was read and asserted; subsequent run passed. No application change was needed.
- **Restricted SQL diagnostic:** Direct read-tool call to privileged `calc_commission` was denied. Grants were not widened; authorized readback and existing rate values were used instead.
- **NOT VERIFIED:** Populated driver earnings/payment/payout rows, withdrawal failure reversal on genuine records, pagination beyond the first empty page, concurrent settlement execution and genuine transfer proof.
- `tests/dispatch-financials-readonly.py` retains the point-in-time existing-record and browser verification. It contains no writes or financial fixture setup; requires managed verification access and intentionally fails if its recorded baseline changes.

## Outstanding dependencies

1. Evidence-backed reconciliation for the three older paid-without-payment bookings; no automatic historical repair.
2. Separate safe completion of driver cash receipt/settlement accounting before claiming delivery cash wallet correctness.
3. Genuine completed driver records and withdrawal history for populated end-to-end verification.
4. A connected, verified payout rail and actual transfer references before validating completed payouts.
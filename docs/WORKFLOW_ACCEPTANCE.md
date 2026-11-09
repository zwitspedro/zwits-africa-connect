# Disputes, provider review and cash completion

## Audit and changes
- Reused existing disputes, provider verification, notifications, cash settlement and dashboard screens.
- Fixed booking issue tracking fetching only the newest 25 issues globally. Lookup now scopes to the booking before pagination.
- Added shared customer/provider issue forms, a protected issue-status list, duplicate-open serialization and participant validation. Admin resolutions notify both parties and remain non-financial.
- Upgraded admin review with secure short-lived document links, review acknowledgement, required decision reasons, rejection confirmation, pending controls, and authoritative ID/selfie/business-document validation. Decisions record reviewer audits and in-app notifications.
- Fixed the mobile jobs parent swallowing its detail page, initial session hydration caching an empty job, and dashboard notification links ignoring their target section.
- Cash confirmation now atomically records payment, booking payment state, wallet entries and notifications; repeated confirmation is idempotent. Historical job income uses ledger amounts where present. Unsettled figures are explicitly estimates.
- Existing completed bookings marked paid without ledger entries are shown honestly as “Marked paid · settlement not recorded”, with an authorized cash-confirmation action. No existing financial records were automatically rewritten.
- Provider-arriving status aliases now remain active and offer the arrival action in both provider views.

## Verification
| Requirement | Classification | Evidence |
| --- | --- | --- |
| Customer/provider issue submission, status and admin resolution | PARTIALLY COMPLETE | Form controls checked signed-in; rolled-back transaction verified duplicate prevention, investigating/resolved decisions, saved resolution, both-party notifications and non-admin rejection. No genuine issue was submitted through the live browser. |
| Provider document review, approval/rejection and notifications | PARTIALLY COMPLETE | Signed-in pending queue, document response 200 image/jpeg, approve disabled before acknowledgement, reject disabled without reason; transactional rejection, notification and missing-document approval guard passed. No real provider decision changed. |
| Completed cash bookings appear in provider history and detail | PASS | Signed-in existing provider history showed four completed jobs; detail, payment/settlement state and issue form rendered. Mobile widths checked without horizontal overflow or browser errors. |
| Cash settlement integrity | PASS | Rolled-back $100 cash job completed, payment read back paid, $10 commission owed, $90 net job income, precisely three ledger entries after repeated confirmation, authoritative per-job income read-back and customer authorization denial. |
| New browser-only completion to cash receipt and read-back | BLOCKED | Requires isolated controlled test records/accounts. No real job was completed or cash receipt invented. |
| Regression checks | PASS | Commission and payment preference tests, date boundaries, search ranking and lifecycle tests; existing SQL transition/admin-safety/10% commission tests passed. Preview build OK. |

In-app notifications are implemented; SMS/email decision delivery and refunds are not claimed. The privileged workflow regression is saved in `supabase/tests/07_workflow_integrity.sql`; the normal sandbox SQL role cannot execute its restricted cash RPC, so its rolled-back execution was performed through the privileged database query tool. No privilege widening was applied.
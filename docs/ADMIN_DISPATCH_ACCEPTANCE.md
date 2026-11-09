# Admin Dispatch and Job Control v2 acceptance

Date: 9 November 2026. Overall: PARTIALLY COMPLETE.

## Reused
Shared admin shell/navigation, existing record detail routes, booking/delivery state guards, provider offer acceptance, in-app notifications, audit log, pricing configuration, wallet ledger and settlement RPCs.

## Implemented and verified
- PASS: `/admin/dispatch`, combined real booking/delivery directory, all requested operational filter views, customer/assignee/category search, Harare date filtering and server-side pagination.
- PASS: admin role checked on server reads and inside mutation RPCs; no RLS or financial ledger restrictions disabled.
- PASS: reasoned internal notes, holds/release, cancellation, manual service offer, customer approval and assigned-provider acknowledgement through populated dummy browser journeys.
- PASS: edits are proposals, not silent overwrites; applied address reads back on the customer's job and scope reads back on the provider's job only after both decisions.
- PASS: atomic before/after admin audit and in-app notifications, optimistic timestamp versions, action-key replay protection.
- PASS: corrected a timezone validation defect and non-monotonic timestamps found during tests; corrected shared trigger access to different offer-row types.
- PASS: rollback test subset for holds, stale actions, manual offer, approved address, authoritative delivery repricing and no unpaid settlement.
- PASS: 15 Vitest assertions across dispatch validation and existing payment/lifecycle/money suites; current preview build OK.
- PASS: desktop and 390px mobile dispatch rendering, no horizontal overflow, no browser page errors in the dispatch browsing test.

## Requirement classification
| Brief section | Status | Evidence / limit |
| --- | --- | --- |
| 1 Audit | PASS | UI/backend investigation and approved implementation map |
| 2 Dispatch centre | PASS | Populated signed-in browser directory/search; bounded database pagination |
| 3 Job details/editing | PARTIALLY COMPLETE | Existing record fields/timeline plus controls/customer contact, ledger amounts, proposal/audit histories; structured evidence viewer and comprehensive email/customer-reference presentation incomplete |
| 4 Assignment | PARTIALLY COMPLETE | Manual provider offer → mobile provider acceptance verified; driver RPC implemented but populated driver journey and simultaneous races not verified; reassignment restricted to before acceptance |
| 5 Lifecycle | PARTIALLY COMPLETE | Existing guards preserved; holds/cancel implemented; terminal cancelled jobs cannot reopen under existing machine and no replacement exception workflow implemented |
| 6 Request changes | PASS | Dummy address approval and accepted-job scope acknowledgement verified; delivery recalculation guarded in database; scheduling and other editable fields validated but not every field browser-tested |
| 7 Driver operations | PARTIALLY COMPLETE | Actual driver directory, job history, availability, ratings, vehicle/workload; private document inspection and exhaustive paginated historical workload incomplete |
| 8 Live monitoring | PARTIALLY COMPLETE | Existing participant subscriptions reused; last booking-provider location shown; admin live subscription/map and delivery-driver tracking not implemented |
| 9 Business bulk dispatch | NOT IMPLEMENTED | No business grouping/order workflow exists; no bulk dispatch claim introduced |
| 10 Notifications | PARTIALLY COMPLETE | Transactional in-app notices for controls and participant decisions; external email/SMS remains unverified/configuration-blocked |
| 11 Security/finance | PARTIALLY COMPLETE | Role/RLS/version/audit protections and no paid/completed overrides; concurrent race and full evidence/settlement browser tests remain unverified |
| 12 Design | PASS | Existing semantic Zwits design controls, mobile/desktop checked |
| 13 Tests | PARTIALLY COMPLETE | Browser service assignment/approval/acknowledgement/cancel and rollback subset passed; driver rejection/timeout/concurrent assignment/evidence completion not exercised end to end |
| 14 Report | PASS | This requirement-level report |

## New implementation
Routes: `/admin/dispatch`, `/admin/dispatch-drivers`, `/admin/dispatch-drivers/:id`, `/job-changes`.
Server functions: dispatch directory/detail/control, participant changes/responses, driver investigation; delivery offer response and progress moved to authenticated atomic RPCs.
Database: admin job controls, immutable proposed changes, action history; control/offer guards, atomic admin actions/participant decisions/delivery responses, authoritative route repricing, monotonic job versions and paginated directory.

## Remaining limits
- Accepted-job reassignment and terminal reopen are intentionally not offered; implementing controlled replacement/exception flows is outstanding, not complete.
- Business bulk dispatch, new delivery-driver tracking and external notifications are not available.
- Evidence upload is wired to desktop and mobile driver completion with server ownership validation, but the full populated delivery-evidence journey remains unverified.
- Existing driver workload fetch is bounded; it is not an exhaustive fleet-wide delayed-job/SLA system.
- Ordinary automatic matching is reused; new guards stop paused/manual jobs, but fully transactional wave creation and stress-tested concurrency remain outstanding.
- Full SQL regression file is retained at supabase/tests/11_admin_dispatch.sql; the initial run exposed bugs, and the corrected subset was executed successfully. Do not equate the subset with an exhaustive full-suite pass.

## Test safety
One clearly labelled dummy job was added, customer and provider actions were simulated and the job was cancelled through the admin browser. No cash receipt or money transfer was recorded. Dummy provider was restored offline and temporary document references removed. Existing completed cash/direct-transfer records and ledger entries were preserved.

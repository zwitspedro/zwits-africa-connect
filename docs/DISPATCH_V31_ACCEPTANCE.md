# Dispatch v3.1 completion report

## Requirement results

### REASSIGNMENT — PASS for executed acceptance and custody workflows
- Admin opens an assigned delivery, selects a replacement, checks verification/online status/vehicle/commitments, records reason and confirms.
- Current driver remains responsible until replacement acceptance. Rejection leaves the current assignment unchanged.
- Collected parcels require a recorded handover location and separate acknowledgement from both custodians; neither acknowledgement alone transfers responsibility.
- Job row locks, one pending replacement per delivery, version checking and replay keys prevent competing responsibility records. Pending custody blocks normal progress until resolved; an admin can withdraw a stalled request with a reason.
- Authorizing administrator, previous/replacement driver, reason, request/acceptance/acknowledgement/handover times and notifications are retained. Current delivery status and financial records are not reset.
- Browser tested admin request → replacement acceptance → assigned delivery readback; authenticated integration checks tested collected handover and rejection. Concurrent replacement attempts themselves were not stress-tested; the unique constraint/locks are implemented, not claimed as a tested stress result.

### BULK ASSIGNMENT — PASS for executed offer workflows
- Existing board selection opens a real per-job assignee review, driver-name filtering, individual provider candidates, reason, preview and confirmation.
- Compatible jobs can share a driver within the existing three-place queue capacity, or choose different drivers per row. Individual job state, version, online/approved eligibility, vehicle, schedule and reservations are rechecked server-side.
- Manual offers reserve capacity. Preview also accounts for other selected jobs; conflicting selected windows or excess capacity are rejected. Confirmation returns independent success/failure rows through per-item transaction subblocks.
- Stable keys allow retrying successful submissions without creating duplicate offers; failed rows can be reviewed separately. Already assigned jobs/live offers are rejected.
- Browser tested selection → preview → two offers → outcome display. Integration tests exercised three compatible offers, capacity overflow, duplicate replay, partial failure and concurrent same-job assignment with exactly one winner.
- Geographic coordinates are shown when recorded. Automated geographic grouping/filtering and a configurable distance policy are **not implemented**; no fabricated proximity or travel feasibility is claimed. Different-driver selection exists, but its end-to-end browser batch was not separately exercised.

### SCHEDULING CONFLICTS — PARTIALLY COMPLETE
- Added optional actual commitment end to bookings; optional start/end to deliveries. No default duration or travel-time estimate is fabricated.
- Shared assignment check shows assignee, conflicting reference, existing/proposed start/end and conflict reason; it checks declared provider availability and driver hours when present.
- Offer/assignment/schedule-update triggers lock assignee records and reject overlapping intervals. Manual offers and pending replacements reserve commitments. Missing end-times conservatively block ambiguous scheduled overlap.
- Existing customer-approved change workflow now accepts both schedule fields; original request and approval history are preserved and conflicts are checked again when applied.
- Integration tested driver overlap, adjacent non-overlap, provider overlap/non-overlap, missing end-times, capacity reservations and two concurrent overlapping offers with exactly one winner.
- **Limitations:** unscheduled deliveries keep the existing capacity-limited queue without a timing guarantee; undeclared driver hours are explicitly reported. No reliable suggested alternative times, overnight-working-hours model, business-parent schedule grouping or travel feasibility calculation was added. Provider end-point availability checks do not prove every instant inside a multi-day commitment is available; do not use multi-day windows as an availability guarantee.

## Database changes
Applied additive migrations 0022–0025:
- Existing booking/delivery optional commitment windows.
- `delivery_reassignments` linked to existing delivery: participant/admin SELECT, explicit grants, RLS, unique pending request, indexed replacement reservations.
- Shared eligibility/scheduling check and guarded offer/assignment/schedule paths.
- Admin replacement request/withdrawal, participant decision/acknowledgement, custody guard, actor audit/notices.
- Existing proposal field validation extended, bulk checked offer RPC, preview intra-batch reservation checks, schedule visibility in existing operational projection.
- Existing states, roles, ledger and financial settlement unchanged. No terminal lifecycle reset or RLS bypass.

## Server changes
- New wrappers in `dispatch-assignment.functions.ts`: `checkAssignment`, `bulkAssign`, `requestDriverReplacement`, `listDriverReplacements`, `respondDriverReplacement`, `withdrawDriverReplacement`.
- Existing `admin_dispatch_action` reused for offers; existing proposal/participant approval logic reused for scheduling.
- `admin-dispatch.server.ts` now validates optional start/end schedule fields.
- Existing admin controls/board and desktop/mobile driver screens extended; no dispatch rebuild or duplicate route system.

## Security
- New admin actions validate stored admin role in both server wrappers and RPCs; participant replies validate actual previous/replacement user identity.
- Custody history is read only through participant/admin RLS; client cannot mutate it directly.
- Assignee row locks serialize reservations, job locks/version checks serialize responsibility, unique pending replacement prevents duplicate active handovers.
- Existing admin audit, notices, customer approval and private documents remain protected. No real provider approval, cash receipt, completion, wallet or payout changed during verification.

## Tests executed
**Passed:** 28 unit/rule tests across six files (new assignment schema; existing dispatch, driver eligibility, location, verification, payment tests).
**Passed:** existing SQL transitions — 12 valid and 10 invalid transitions rolled back.
**Passed:** repeatable `tests/dispatch-v31-workflows.py` using disposable accounts/jobs: browser replacement and wallet-free delivery readback, two-custodian handover, rejection, three bulk offers, capacity reservation, duplicate replay, overlap/non-overlap, board bulk confirmation/outcomes, concurrent same-job assignment, partial batch failure, provider overlap/non-overlap, missing-end conservative block, concurrent overlapping schedules, offline denial, non-admin denial.
**Passed:** previous 21-row real-data board search/queue/list/table/Kanban/job inspection at desktop and 390px phone; no page errors or horizontal overflow.
**Passed:** latest preview compilation build OK; existing content routes retain unique head metadata; no new content route introduced.
**Cleanup:** verified zero temporary delivery/provider records after the final run; disposable auth accounts removed. No money moved.
**Test development failures:** weekday fixture initially used 0 instead of existing 1–7; corrected. Bulk browser selection initially raced result hydration; selection-state dependency was stabilized and test awaited settled results. Concurrent schedule fixture initially retained prior reserved offers; isolated correctly before final passing run. None were ignored or used to weaken safeguards.
**Not executed:** full financial settlement suite, full concurrent replacement stress, missing-doc replacement test, driver-hour/leave multi-day cases, actual collected-parcel physical handover, geographic routing, exhaustive mobile bulk controls and different-driver browser batch. Existing SQL dispatch regression still requires a privileged test connection; sandbox SQL role permissions were not widened.

## Dependencies and remaining limits
- Reliable actual commitment end-times and declared working hours must be supplied for meaningful timed planning. The UI and RPC do not invent those values.
- Business parent orders and geographic policy are outside existing data relationships and remain absent.
- Suggested alternative availability and exhaustive stress/financial regressions remain unverified/not implemented as above.
- A real physical handover needs both actual drivers; tests verified recorded workflow with disposable accounts only.
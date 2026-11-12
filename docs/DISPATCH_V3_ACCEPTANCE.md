# Dispatch Control Centre v3 — acceptance report

Overall: **PARTIALLY COMPLETE**, not a claim that all 35 sections or all 20 acceptance criteria are finished.

## A. Audit findings
See `DISPATCH_V3_AUDIT.md` for the implementation map created before application changes. Existing combined directory, driver verification, participant approvals, operational actions, lifecycle, ledger, disputes, notices and provider tracking were reused. Missing capabilities were not represented as working business orders or payment rails.

## B. Implementation
### PASS — verified this delivery
- Twelve clickable, server-aggregated operational counters, with search/date/priority/account filters and Harare completion-day boundaries. Failed matching is labelled unfulfilled, not silently equated with a failed lifecycle.
- Expanded global reference/address/category/customer email/phone/name/assignee-name search, 25-row pagination and filter-preserving list, table and Kanban presentations.
- Selected-job dialog reuses existing operational controls and links to existing full investigations; existing actor history and proposals remain visible.
- Low/normal/high/urgent priority with admin authorization, reason, job lock, optimistic version, replay protection and audit.
- Bounded per-job batch holds/releases/priorities with individual outcomes; priority success was exercised through the browser and read back from stored control and audit records.
- Automatic delivery candidates now explicitly require approved verification and online availability.
- Recorded-coordinate job map, lazy map loading, existing provider freshness tracking and list fallback. OpenStreetMap tiles rendered after loading; no coordinates fabricated.
- Signed-in 1280×1800 desktop and 390×844 phone inspection: board, search, queue changes, table, Kanban, job dialog and priority result; no detected page errors or horizontal overflow.

### PARTIALLY COMPLETE
- Scheduling: existing booking schedule range filters and bounded agenda presentation. Delivery scheduling, calendar, conflict detection and advance driver scheduling are not implemented.
- Map: job pickup/service coordinates are supported; destination markers, live delivery-driver reporting, moving-device verification and matching every tracking row to board filters are not complete. Provider tracking is a separately labelled existing live section.
- Evidence: admin-only signer derives stored delivery path, validates assigned-driver prefix and generates five-minute private access. No populated evidence/completion verification journey was exercised this turn; no independent recipient confirmation is claimed.
- Driver operations: workload now uses exact per-driver counts rather than a truncated history sample; history remains bounded. Directory pagination and complete performance/availability histories are not added.
- Bulk actions: holds/releases/priorities only; bulk driver assignment, rescheduling and exports are not implemented.
- Existing manual offers, customer-approved corrections, acceptance, notices, financial controls and disputes remain reused; their full multi-account lifecycle/concurrency suite was not reverified this turn.
- Mobile works without horizontal page overflow, but the requested dedicated mobile detail/assignment navigation and fixed controls are not complete.

## C. Database
- Reused bookings, deliveries, provider/driver profiles, user roles, offers, controls, proposals, actions, notices, wallet ledger and existing audit infrastructure.
- Applied `0021_dispatch_v3_operational_overview.sql`: additive priority on existing controls; restricted operational projection; extended existing directory RPC; priority RPC.
- No new job state machine, no destructive changes, no new public table, no altered existing RLS policies, no new index. Existing offer/history indexes remain used.
- Projection SELECT is revoked from anonymous and authenticated clients; only authorized RPC reads expose its data. Verified anonymous priority EXECUTE=false, authenticated EXECUTE=true and authenticated direct projection SELECT=false.
- Reversal strategy: stop invoking the additive priority RPC/projection and restore the previous directory implementation; retain historical priority audits and data. Retention remains existing audit retention, not an invented policy.

## D. Server functions
- Reused `listDispatchJobs`, `getDispatchJob`, `dispatchAction`, `getDispatchDrivers`, `respondJobChange`, existing acceptance/progress/settlement RPCs.
- Added `setDispatchPriority`, `batchDispatchActions`, `getDispatchEvidence`.
- Expanded directory return to include metrics and as-of time; added 30-second board refresh alongside existing tracking subscriptions/polling.

## E. Security
- Every new privileged function validates authenticated identity and stored admin role before accessing protected data or signed storage.
- Priority locks the actual job and checks version; all batch actions use per-job authorized RPCs, not direct browser writes.
- Existing assignment locks, acceptance requirements, append-only ledger and private verification review remain intact. No payment or completion override was added.
- No real assignment, receipt, financial adjustment, provider approval or completion was changed in tests.

## F. Testing
- **PASS:** 24 tests across dispatch schemas, driver approval eligibility, location freshness, driver verification and payment policy.
- **PASS:** existing `01_transitions.sql`: 12 valid and 10 invalid transitions, rolled back.
- **PASS:** signed-in browser list/table/Kanban, populated job controls, reference search, priority transaction plus stored audit readback, map tiles, phone no-overflow and no page errors.
- **PASS:** temporary booking/control/audit/history records removed; confirmed zero temporary bookings afterward. No money moved.
- **PASS:** latest preview compilation reports build OK; content-route metadata scan found no uncovered content component routes.
- **BLOCKED test execution:** existing `11_admin_dispatch.sql` and new `13_dispatch_v3.sql` cannot call restricted RPCs as the sandbox SQL role. Permission errors rolled transactions back; permissions were not widened to make tests pass. New SQL test remains in the project for a privileged test connection. Browser priority testing used the actual signed-in admin instead.
- **NOT VERIFIED:** mixed-success batch, duplicate request network replay, concurrent admins/drivers, full driver acceptance/rejection/evidence lifecycle, populated evidence signer and unauthorized browser journeys.

## G. Not completed / dependencies
- **NOT IMPLEMENTED:** accepted-job replacement and collected-parcel custody handover; requires a transactional participant-acknowledged custody design, not an arbitrary state override.
- **NOT IMPLEMENTED:** business parent orders/batch relationships, business grouping workspace, bulk assignments, controlled completion exceptions, exception ownership/resolution records, configurable SLA thresholds and detailed operational analytics/exports.
- **NOT IMPLEMENTED:** new granular dispatcher roles. Existing stored admin role remains authoritative; proposed permission groups are not falsely advertised as enforced.
- **NOT IMPLEMENTED:** requested new nested schedule/business/provider/driver routes; existing job investigations, driver operations, providers and business directories remain linked rather than duplicated.
- **BLOCKED:** genuine moving-device verification needs consenting isolated device sessions; real payouts need verified sending integration; genuine paid-work testing needs genuine job/completion/receipt details; real email delivery remains subject to previously recorded sender verification.
- Terminal reopen remains unavailable by existing lifecycle design. No terminal-state bypass was introduced.

## Acceptance criteria mapping
1–3 job visibility/search/investigation: **PASS for inspected records**.
4–8 offers, driver/provider assignment and acceptance monitoring: **PARTIALLY COMPLETE — existing workflows reused, not full multi-account reverified**.
9 reassignment: **NOT IMPLEMENTED after acceptance**.
10–12 request edits/history/price approvals: **PARTIALLY COMPLETE — existing transactional proposals reused**.
13 progress: **PASS existing recorded timeline inspection**.
14 proof review: **PARTIALLY COMPLETE — signer/panel added, populated journey unverified**.
15 invalid transitions: **PASS transition regression; full concurrency unverified**.
16 financial rules: **PARTIALLY COMPLETE — unchanged policy tests pass, full ledger suite blocked this turn**.
17 exceptions: **PARTIALLY COMPLETE — attention queue and existing disputes, no new case ownership workflow**.
18 business orders: **NOT IMPLEMENTED parent/bulk orders; business-role job filter only**.
19 mobile: **PARTIALLY COMPLETE — inspected layout works, specialised workflow remains**.
20 existing workflows: **PARTIALLY COMPLETE — selective regressions only**.
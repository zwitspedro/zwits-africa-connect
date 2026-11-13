# Current request
- [x] Audit and correct dispatch presentation at 360/390/430/768/1024/1440px; 48 rendered view checks, six-width signed-in form/navigation checks and 28 rule tests passed; no backend changes. Populated reassignment/conflicts/payouts and physical Android remain unverified, documented in docs/DISPATCH_RESPONSIVE_ACCEPTANCE.md.
- [x] Audit V3.2 financial history and add read-only driver wallets/jobs/withdrawals/ledger/payments; 28 tests and signed-in desktop/mobile checks passed; report in docs/DISPATCH_FINANCIAL_V32_RECONCILIATION.md.
- [ ] Reconcile three historical paid bookings without payment/ledger evidence, verify populated driver finances and correct driver cash settlement offset; blocked by missing receipt evidence/driver financial records and requires separately scoped settlement correction, no historical payouts fabricated.
- [x] Add and verify dispatch custody, daily driver calendar/conflicts, sourced duration recording and checked alternatives; performance counts and bulk comparisons passed; populated payout history remains unverified (no genuine payout fixtures), details in docs/DISPATCH_INSIGHTS_ACCEPTANCE.md.
- [x] Implement and verify dispatch v3.1 replacement acceptance/two-custodian handover, checked bulk offers and interval conflict prevention; 28 unit tests, disposable browser/integration workflows and board regressions passed; limitations in docs/DISPATCH_V31_ACCEPTANCE.md.
- [x] Audit Dispatch Control Centre v3 and deliver verified overview/search/views, priority transaction, bounded batch controls, recorded-coordinate map and acceptance report; 24 rule tests and signed-in disposable-priority journey passed.
- [ ] Complete remaining v3 accepted-job custody/replacement, business parent orders/bulk assignment, schedule conflicts/calendar, granular permissions and analytics; NOT IMPLEMENTED, requirements and gaps recorded in docs/DISPATCH_V3_ACCEPTANCE.md.
- [ ] Run privileged dispatch SQL regression and full concurrent driver/evidence/mixed-result batch journeys; SQL sandbox role cannot execute restricted RPCs, so permissions were preserved and browser priority was tested instead.
- [x] Add ledger-backed cash received, commission and cash-in-hand comparison; rule tests and signed-in desktop/mobile comparison passed; real-account receipt totals not changed or physically verified. EcoCash details remain PIN-free; outbound payouts blocked pending connection.
- [ ] Connect real provider EcoCash payout destinations and verified outbound transfers; awaiting the approved disbursement service’s official API documentation and secure credentials.
- [ ] Exercise genuine cash work through customer/provider screens and wallet; awaiting identified customer/provider accounts, actual job details, agreed price and genuine completion/receipt confirmation.
- [x] Finish driver verification application, private ID/vehicle evidence and atomic admin decisions; disposable approval/rejection browser journeys, authorization checks, mobile layout and tests passed.
- [x] Add live provider tracking in the dispatch centre; populated admin map/timestamps, mobile layout, freshness tests and rollback permissions/upsert verified.
- [ ] Verify moving-device provider-to-admin realtime updates; needs an isolated provider device/location session, not fabricated live locations on real jobs.
- [x] Audit and map uploaded Admin Dispatch and Job Control Centre v2 requirements onto existing workflows.
- [x] Add unified dispatch oversight, controlled proposals, manual pre-acceptance offers, holds and cancellation; populated dummy browser journeys verified.
- [x] Verify dispatch permission/approval/hold/stale/payment subset and dummy customer/provider notices; report remaining concurrency, driver/evidence and exception workflows honestly.
- [ ] Complete accepted-job reassignment/replacement, terminal reopen exceptions, live driver monitoring, exhaustive driver investigation and bulk business dispatch; not implemented in this delivery.
- [ ] Verify populated driver acceptance/rejection/evidence and concurrent assignment stress cases; needs isolated driver fixtures and completion of the outstanding transactional wave work.
- [x] Verify cash and manual-bank-transfer browser journeys using existing dummy accounts; fixed direct Accept failure, confirmed simulated receipts and wallet −$5 for two $25 jobs; no money moved.
- [x] Add direct provider EcoCash/bank payments, private account editing/display, provider receipt confirmation and direct-money ledger accounting; rollback regression and signed-in empty-account UI passed.
- [x] Verify populated manual-bank-payment browser journey with dummy accounts and customer receipt readback; actual transfers remain unavailable.
- [ ] Run a real cash booking in the browser (needs actual job, provider, agreed amount and confirmation that work/cash receipt are genuine).
- [ ] Connect provider EcoCash accounts and real outbound payouts (user reports approved account; blocked pending official outbound API documentation, secure credentials and settlement verification).
- [x] Extend admin approval queue with secure document uploads and review status tracking.
- [x] Add automatic individual provider decision emails, protected recipient selection and delivery status/retry tracking.
- [x] Verify queue/upload/email safeguards and report sending limitations in approval acceptance report.
- [ ] Verify actual provider email delivery (blocked by failed sender DNS verification; More → Emails → Retry setup after delegation correction).
- [ ] Verify successful document replacement and full review/email browser journey (requires isolated test records; real provider documents and decisions preserved).
- [x] Complete customer/provider dispute submission and status tracking with admin resolutions; transactional regression passed, browser submission on real records intentionally avoided.
- [x] Complete secure provider document review, profile decisions and in-app notifications; regression and signed-in document access/control checks passed.
- [x] Fix provider detail navigation, atomic cash confirmation, historical commission display and completed-job visibility; regression passed and existing completed records verified.
- [ ] Verify new provider cash completion and both-party dispute decisions entirely through the browser (requires isolated test accounts/records; real work and decisions were not changed).
- [x] Enhance executive admin navigation, search, overview, analytics and live operational previews using existing records; incomplete capabilities classified in acceptance report.
- [x] Verify signed-in admin flows, permissions, date filters and mobile layout; deliver requirement-by-requirement report.
- [x] Add provider profile page linked from dashboard with contact, bank and payment preference editing.
- [x] Verify signed-in profile and payment saves with existing account details, read-back after refresh and mobile layout; unavailable payout preferences remain disabled.
- [x] Verify cash checkout from homepage search without dispatching to real providers; corrected unknown price display.
- [x] Verify provider acceptance, completion and cash accounting in a rolled-back test; restored missing default 10% commission.
- [x] Report observed results and any unverified steps.
- [ ] Verify one persisted booking across customer and provider screens (requires controlled test accounts/environment; real-provider dispatch avoided).

# Admin control centre
- [x] Audit existing admin workflows and report P0/P1/P2 gaps.
- [x] Harden verified financial and metric integrity defects.
- [x] Complete connected navigation, operational directories and search-quality inspection.
- [x] Verify authorized admin flows, regression tests and requested viewport widths.
- [x] Deliver an honest acceptance report with remaining dependencies.
- [ ] Verify populated admin financial decisions and concurrency (requires controlled test records/environment).
- [ ] Enable actual payout settlement, refunds and debt collection (requires verified payment rails and commission repayment decision).

- [x] Add subtle Z pulses for matching, active delivery and existing network activity; verify idle/network and reduced-motion behavior.
- [ ] Verify populated matching and active-delivery journeys (no eligible matching booking or active delivery available in the test account).

- [x] Expand Terms of Service to cover marketplace roles, cash payments, commission, cancellations and disputes.
- [x] Expand Privacy Policy to cover account and job data, live location, sharing, retention and data requests.
- [x] Verify both public legal pages on desktop and mobile.
- [ ] Obtain professional legal review before launch (requires qualified local legal counsel).
- [x] Check the existing open-source map integration and custom-domain compatibility.
- [x] Publish the supplied support phone number and email.
- [x] Make email the active sign-in choice and mark phone sign-in coming soon.
- [x] Verify the updated sign-in, contact and signed-in map views.
# Zwits Design System v1
- [x] Centralize palette, typography, spacing, radii and restrained motion.
- [x] Upgrade existing controls, forms, status, notifications and navigation.
- [x] Apply customer/provider/driver/admin experience themes and lightweight entry screen.
- [x] Audit public and authenticated views, accessibility and all requested viewport widths.
- [x] Report verification and remaining blockers without changing business logic.

# Design System v1 completion audit
- [x] Correct the audited shared-control and calendar touch-target gaps.
- [x] Unify audited role and operational presentation without changing behavior; exhaustive migration is PARTIAL in the report.
- [x] Audit 35 public/account pages, basic keyboard access, eight viewport widths and initial requests; deeper dynamic-state checks remain PARTIAL.
- [x] Deliver the refreshed PASS/PARTIAL/BLOCKED report with honest remaining limits.

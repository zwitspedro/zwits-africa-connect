# Dispatch mobile and desktop audit — 13 November 2026

## Scope and preservation
Presentation-only continuation of the existing Dispatch Centre. No database, permission, server-function, settlement, assignment or lifecycle changes. No real job changes, financial records or test payouts were created. Existing brand tokens and fonts retained.

## Problems found
- Mobile overview and eleven always-open filters pushed job controls far down the page.
- Queue navigation scrolled sideways at all six widths.
- Job tables required sideways scrolling on phones, tablets and laptops; calendar forced a 1050px grid; performance forced a 700px table.
- Job checkboxes had only 20px targets; map zoom controls were 29px tall.
- Mobile global search occupied a separate header row.
- Investigation pages left the executive navigation shell.

## Changes implemented
- Compact mobile header with search destination, expandable overview and advanced filters; every metric/filter remains accessible.
- Queue/view selectors below desktop width; wrapped desktop queue navigation and existing sidebar.
- Stacked job records below 1280px even when Table is selected; desktop table keeps its operational columns. Prices/payment states now also appear in list records.
- Selection has a 48px clickable label; selected-job actions remain sticky while scrolling.
- Stacked daily driver calendar and performance records below 1280px, using the same records and callbacks as desktop. Desktop calendar uses available width.
- Existing assignment, bulk, batch and replacement dialogs receive scoped wrapping, input constraints and title/close spacing.
- Map zoom controls and location markers enlarged to 48px; semantic primary surface keeps zoom symbols legible.
- Booking/delivery investigation uses the existing executive shell; driver links have 48px targets.

## Actual testing
Signed-in administrator using current connected records, Chromium emulation:

| Width | Eight dispatch views: no page overflow or sideways scrollers | Navigation, forms, wallet, calendar, map zoom, driver detail |
|---|---|---|
| 360 | PASS | PASS |
| 390 | PASS | PASS |
| 430 | PASS | PASS |
| 768 | PASS | PASS |
| 1024 | PASS | PASS |
| 1440 | PASS | PASS |

Eight views: List, Table, Kanban, Agenda, Map, Driver calendar, Parcel custody, Driver performance. Forty-eight rendered view/width combinations inspected. Screenshots reviewed for mobile/desktop overview, calendar, financial history and mobile map. No page errors during final interaction checks.

Saved and executed `tests/dispatch-responsive-readonly.py`: expands mobile overview/filters, selects a job, opens and edits but does not submit bulk and note forms, opens batch and individual assignment dialogs, follows full investigation and driver investigation, opens mobile navigation, checks current wallet readback, calendar and map zoom. All six widths passed; checkbox label and zoom button dimensions verified at least 44px.

28 existing rule tests PASS across financials, insights, assignment, payments, cash reconciliation and payment preferences. Latest application diagnostic: build OK. Content-route metadata inspected: existing app-specific leaf metadata retained, including index.

## Outstanding verification
- **PARTIALLY COMPLETE — reassignment/custody:** presentation hardened and custody view checked, but no eligible accepted driver delivery or handover record was available to exercise populated replacement and acknowledgement forms. No fabricated live job was introduced.
- **PARTIALLY COMPLETE — bulk/assignment workflows:** connected forms and touch accessibility tested; offers and consequential confirmations deliberately not submitted against real records.
- **NOT VERIFIED — populated calendar conflicts:** current week has no recorded driver commitments; both calendar layouts checked in their real empty state. Existing conflict rules passed, but populated visual highlights were not newly exercised.
- **NOT VERIFIED — populated payout history:** current driver wallet renders its actual zero balance and matches ledger; no payout history exists. No false history created; existing payout/settlement limitations remain unchanged.
- **NOT VERIFIED — physical Android hardware:** widths emulated in Chromium, not tested on an actual Android handset.
- Previously reported historical settlement evidence gaps and delivery cash settlement risk are unchanged; this UI-only request did not authorize financial corrections.

Overall: **PARTIALLY COMPLETE** for the full workflow-testing brief; **PASS** for the tested responsive layouts and connected read-only interactions.
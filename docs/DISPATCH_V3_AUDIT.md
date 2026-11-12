# Dispatch Control Centre v3 — implementation map

## Existing and reusable
- `/admin/dispatch`: authenticated, admin-authorized, paginated combined booking/delivery search; existing investigation pages and driver operations.
- Atomic dispatch RPC: manual offers, holds/releases, cancellation, notes, customer-approved edits with assignee acknowledgement, optimistic versions, actor audit and notifications.
- Booking/delivery lifecycle, private storage, append-only settlement ledger, disputes, commission calculations and provider/driver portals.
- Approved driver verification applications and private admin document review.
- Provider device-location tracking with timestamps, freshness indicators, MapLibre and list fallback.
- Email-first authentication, separate protected user roles, Harare-first service availability.

## Incomplete or missing
- Board lacks aggregate overview, scheduled/delayed queues, alternative presentations, selected-job workspace and batch result handling.
- Search does not include customer contact fields or assignee names in global term.
- No operational priority field or auditable priority action.
- Driver list and candidate workload use bounded raw rows, potentially undercounting capacity; assignment acceptance remains the final authority.
- Delivery automatic candidate selection excludes revoked drivers but does not explicitly require approval.
- Delivery evidence exists but admin investigation lacks private signed evidence review.
- Accepted-job replacement and collected-parcel custody handover are not implemented.
- Business role exists; business batch/order relationship, shared team and business scheduling do not exist. Do not invent order groupings.
- Delivery scheduled timestamp and measured SLA targets do not exist. Do not invent delays or on-time compliance.
- Granular dispatcher roles do not exist; retain server-authorized admin access.

## Planned enhancement boundaries
Reuse authoritative tables and RPCs. Add server-computed queue aggregates, expanded filters, operational priority, safe per-job batch actions, scheduling agenda for existing booking timestamps, alternative bounded board views and evidence inspection. Preserve automatic dispatch and existing state machines. Unsupported custody handover, business parent orders and unconnected payment/SMS rails remain unavailable and are reported explicitly.

## Verification
Run existing lifecycle/security tests plus concrete rule tests for added controls; inspect signed-in admin desktop and Android-sized views, populated search/detail readback and server aggregate consistency. Do not submit real assignments or fabricate completion/receipt evidence.
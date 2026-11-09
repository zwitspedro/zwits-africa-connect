# Provider approval queue

## Delivered
- Extended the existing administrator provider queue rather than creating a duplicate page.
- Added ID, selfie and business-document uploads. Server verifies administrator role, file signatures, allowed type and 20 KB–10 MB size before uploading to private, provider-owned paths. Registration resets verification to pending/offline and records audit and provider notice; failed registration removes the orphaned upload.
- Added uploaded-document counts, submission/review times, protected review history, email status and individual retry controls. Replacing a document resets the administrator's review acknowledgement.
- Added automatic single-provider decision emails after administrator review. Recipient, status and reason are derived from protected review events, not client inputs. Stable event identifiers and queue claims prevent duplicate event submission. Existing queue retry, suppression and unsubscribe footer remain intact.
- Added a branded unsubscribe page and registered provider-decision email template. Email history distinguishes queued from sent; delivery logs update the corresponding review event.

## Verification
| Requirement | Result | Evidence |
| --- | --- | --- |
| Queue, status filters, review controls and document-upload controls | PASS | Signed-in pending queue, three upload actions, acknowledgement approval guard, desktop and 423px mobile with no overflow or browser errors. |
| Upload validation | PASS | Five concrete size/type tests; HTML upload rejected by the server through the real UI. |
| Upload registration and review history | PARTIALLY COMPLETE | Rolled-back database regression verified pending/offline state, audit-backed decision event and unauthorized registration denial. Successful private-file upload and save was not exercised against a real provider to avoid replacing their documents. |
| Automatic individual decision emails | PARTIALLY COMPLETE | Trigger, template, recipient authorization, event claim, status/retry wiring implemented. Unauthenticated send rejected with 401. No message was sent to a real provider during testing. |
| Sent/failed status tracking | PASS | Rolled-back regression verified delivery log updates review email state to sent and failed. No email was dispatched. |
| Email delivery | BLOCKED | Sender notify.zwits.co.zw has failed DNS verification; configured nameserver delegation does not match. User must correct sender delegation and use More → Emails → Retry setup. |
| Unsubscribe page | PARTIALLY COMPLETE | Missing-token error verified; valid token flow implemented but not used to unsubscribe a real provider. |

The sender's verification is the delivery blocker, not a missing queue screen. A newly verified sending domain should start at low volumes; reputation improves over roughly 2–4 weeks. Existing signup/reset emails remain separate from app-email unsubscribe preferences.
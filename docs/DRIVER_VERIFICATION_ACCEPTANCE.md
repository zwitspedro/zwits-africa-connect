# Driver verification acceptance — 12 November 2026

## PASS
- Reused the existing driver profile/vehicle forms, private verification storage, dispatch driver directory and investigation page.
- Added national ID evidence, ID/licence numbers and explicit submission; applications snapshot personal details, vehicle details and document paths.
- Both desktop driver portal and mobile profile expose the saved application and admin decision history.
- Admin opens submitted ID/licence/registration evidence, records a reason and confirms approval or rejection.
- Atomic review persists the decision, driver state, administrator audit and driver in-app notice. Approval leaves the driver offline until they choose availability.
- Browser journeys used two temporary driver accounts: full form save, three actual document uploads, submission, admin approval/rejection, driver decision readback and mobile checks. No real driver decisions changed; temporary accounts, evidence and records removed.
- Unauthorized approval failed, client self-approval remained pending/offline, and submitted vehicle editing was rejected.
- Verification schema tests passed: ID/licence required, review reason required, dispatch disabled pending admin approval.
- Private documents are owner/admin-readable; registered application evidence cannot be overwritten or deleted by its owner. Signed admin document links expire after five minutes.
- Server submission verifies document ownership, size and signature; transactional submission verifies stored objects, active registered vehicles, Harare profile and current insurance.
- Build signal is successful; desktop/mobile journeys produced no page errors or mobile overflow.

## Scope and limitations
- Approval is a human document review, not an external government/licence-registry identity check.
- Decision notifications are in-app. Email delivery is not introduced by this request.
- Existing bulk dispatch, accepted-job reassignment and moving-device tracking tasks are unchanged.
- Submission requires a driver-role account; service-provider verification is unchanged.
# Dispatch provider tracking acceptance

## Scope
Live provider locations for assigned active service bookings in the existing dispatch centre. Bulk dispatch, post-acceptance reassignment, delivery-driver location producers and full driver verification are not implemented by this update.

## Results
- PASS: existing current-location uniqueness was causing repeated inserts to fail; publisher now upserts, preserving the server-maintained update timestamp.
- PASS: dashboard and mobile provider job screen share locations during assigned active job stages, stopping their geolocation watcher on unmount or terminal status.
- PASS: admin-only bounded directory returns up to 100 active assignments and their assigned provider's latest location; missing reports remain explicitly unavailable. Both server authorization and database role checks remain enabled.
- PASS: dispatch map renders OpenStreetMap tiles, stale marker, Harare update timestamp and accuracy on existing populated records. Refresh succeeds; three real active assignments read back, one stale report and two missing reports.
- PASS: realtime subscription reports Connected, is effect-scoped and cleaned up; 15-second polling provides fallback. Local freshness checks every 10 seconds mark reports stale at 60 seconds without changing the device timestamp.
- PASS: desktop and 423×729 mobile checks have no horizontal overflow or page errors.
- PASS: automated freshness/stage tests and directory grant inspection. Signed-in admin reads were separately verified in the browser. The SQL test connection cannot assume the authenticated role or execute the protected directory; provider write-policy execution and non-admin RPC rejection remain unverified.
- PARTIALLY COMPLETE: moving-device publication through to admin realtime marker movement has not been exercised with an isolated provider device; existing locations were not altered or represented as live for demonstration. Browser geolocation permission, an open provider job screen and connectivity are required. Background tracking while the app is closed is not supported.
- NOT IMPLEMENTED: bulk dispatch, accepted-job reassignment and full driver verification remain separate outstanding work.
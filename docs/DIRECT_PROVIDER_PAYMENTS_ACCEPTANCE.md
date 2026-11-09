# Direct provider payments

- PASS: providers can privately save their personal EcoCash and bank accounts with explicit sharing consent; owner-scoped access.
- PASS: accepted booking customers can select a direct destination; chosen account details are snapshotted and locked.
- PASS: only assigned providers can confirm direct receipt on completed bookings with an agreed price.
- PASS: rolled-back checks covered both methods, customer/outsider denial, pending selection, $100 gross / $10 commission / $90 income, wallet decrease of $10 and repeated confirmation without duplicate ledger entries.
- PASS: signed-in browser checked provider account form, consent gate, existing customer booking missing-account state, and mobile overflow; no real details saved or money moved.
- PARTIALLY COMPLETE: populated browser selection → receipt → wallet read-back has not been exercised; no isolated browser fixture account was supplied. Database journey passed with rollback.
- NOT IMPLEMENTED: automated EcoCash/bank processing or payouts; this feature records manual transfers confirmed by providers, not independently verified bank transactions.
- Existing live cash flow preserved. Direct payments do not create withdrawable balances. Terms/Privacy describe consent, retained destinations and receipt attestation.
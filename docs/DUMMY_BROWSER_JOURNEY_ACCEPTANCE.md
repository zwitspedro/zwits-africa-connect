# Dummy browser cash and manual-transfer verification

Both journeys used existing test59557@example.com (customer) and test60566@example.com (provider), not Peter's account. Work and receipts were simulated; no funds moved.

## Results
- PASS: homepage → cleaning search → dummy provider selection → scheduled cash checkout → persisted request.
- PASS: provider acceptance → on the way → arrived → start job → complete job, entirely through browser controls.
- PASS: cash receipt confirmation → completed list → wallet: $25 gross, $2.50 commission, $22.50 income, wallet −$2.50.
- PASS: provider-owned dummy bank details and sharing consent saved through profile form.
- PASS: second completed booking → customer chooses bank → immutable account snapshot shown → pending receipt → provider confirms simulated transfer → customer refresh reads confirmed receipt.
- PASS: second $25 settlement adds $2.50 commission; final wallet −$5.00, six ledger movements, no withdrawable funds.
- FIXED AND RETESTED: direct booking Accept previously used an ordinary update rejected by the booking guard. Owner-authorized atomic acceptance now preserves verification, availability, capacity and audit checks.
- NOT IMPLEMENTED: sending bank/EcoCash transfers or payouts. This test verifies provider-attested manual payments, not a payment network.

## Persisted test records
- Cash: f0070f85-a10a-4c4c-a075-0e46d660cd33.
- Manual bank: 60b1f0c3-b434-427b-a9bf-8cc650b701e0.
- Both descriptions and addresses identify dummy tests. Their simulated ledger records remain auditable; they are not real revenue.
- Temporary dummy verification references and bank details must be removed after regression, and the dummy provider taken offline so test credentials are not offered to customers.

Screenshots were inspected for cash wallet, manual transfer selection, final wallet and customer receipt readback. Cash/transfer testing does not verify actual service delivery or money receipt.
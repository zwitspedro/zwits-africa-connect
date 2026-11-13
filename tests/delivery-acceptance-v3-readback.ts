// Uses only rows emitted by the fixed-socket isolated SQL test, never invented history.
import { readFileSync } from 'node:fs';
import { strict as assert } from 'node:assert';
import { summarizeDriverFinance, harareWeek } from '../src/lib/driver-finance';

const path = process.argv[2];
if (!path?.startsWith('/tmp/dispatch-integrity/v3/')) throw new Error('Isolated records path required');
const records = JSON.parse(readFileSync(path, 'utf8'));
const s = summarizeDriverFinance(records.ledger, records.jobs, [], records.wallet);
assert.equal(s.gross, 275);
assert.equal(s.commission, 27.5);
assert.equal(s.cash, 275);
assert.equal(s.net, 247.5);
assert.equal(s.wallet_movement, -27.5);
assert.equal(s.withdrawable, 0);
assert.equal(s.commission_owed, 27.5);
assert.equal(s.unrecorded_completed, 1);
assert.equal(s.settlements.length, 11);
assert.equal(s.weeks.reduce((n, w) => n + w.net, 0), 247.5);
for (const settlement of s.settlements) {
  const earning = records.ledger.find((t: { reference: string }) => t.reference === settlement.reference);
  assert.equal(settlement.recorded_at, earning.created_at);
  assert.equal(settlement.reference, `delivery:${settlement.id}:earning`);
  assert.ok(s.weeks.some(w => w.week === harareWeek(earning.created_at)));
  assert.ok(records.admin[0].jobs.some((j: { id: string; net_earned: number }) => j.id === settlement.id && j.net_earned === settlement.net));
}
console.log('PASS: existing driver summary agrees with isolated ledger and production admin financial projection');
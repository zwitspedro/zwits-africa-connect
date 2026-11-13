import { readFileSync } from 'node:fs';
import { strict as assert } from 'node:assert';
import { summarizeDriverFinance } from '../src/lib/driver-finance';

const path = process.argv[2];
if (path !== '/tmp/dispatch-integrity/v4/records.json') throw new Error('Fixed isolated output required');
for (const r of JSON.parse(readFileSync(path, 'utf8'))) {
  const s = summarizeDriverFinance(r.ledger, r.jobs, [], r.wallet);
  assert.equal(s.gross, r.expected.gross);
  assert.equal(s.commission, r.expected.commission);
  assert.equal(s.cash, r.expected.cash_held);
  assert.equal(s.net, r.expected.economic_net);
  assert.equal(s.wallet_movement, r.expected.wallet_movement);
  assert.equal(s.withdrawable, r.expected.withdrawable);
  assert.equal(s.commission_owed, Math.max(0, -r.expected.balance));
  assert.equal(s.settlements.length, 1);
  assert.equal(s.unrecorded_completed, 0);
  assert.equal(s.weeks.reduce((n, w) => n + w.net, 0), r.expected.economic_net);
  assert.equal(r.admin.summary.net_earned, s.net);
  assert.equal(r.admin.wallets[0].ledger_balance, r.expected.balance);
}
console.log('PASS: A/B/C/D/I stored driver summaries agree with admin projection, weekly net and withdrawable balances');
# Zwits — Production Runbook

Audience: Zwits administrators and developers. Never paste secrets into this file,
a ticket, or a chat message.

## 0. Where production lives

Everything is administered from **Lovable → Cloud** for this project (database, auth users,
storage, secrets, logs). There is no separate backend console and no second database.
In-app admin surfaces:

| Page | Use |
| --- | --- |
| `/admin` | Live KPIs: bookings, revenue, commission, disputes, payouts |
| `/admin/health` | Backend health: database, auth, storage, payment rails, email, realtime, last operations |
| `/admin/operations` | Disputes and provider payouts |
| `/admin/reconciliation` | Per-booking and per-provider money reconciliation |
| `/admin/email` | Transactional email log and failures |
| `/admin/providers` | Verification queue |
| `/admin/commissions` | Commission rates + change history |

## 1. Inspect production

Start at `/admin/health`. A red core service means the platform is degraded; a green
database with stale "last operations" usually means the app layer, not the database.

## 2. Failed or stuck bookings

- Stuck in `pending`/`matching`: no eligible provider. Check that providers in the city are
  approved, online, within radius and under the 3-open-job cap.
- Check `booking_status_history` for the booking to see every transition and who caused it.
- Offers that never resolved: `job_offers` rows with `status = 'offered'` and
  `expires_at < now()` should be swept every minute by `zwits-dispatch-sweep`.

## 3. Failed payments

Look at `payments` for the booking: `status`, `payment_method`, `failure_reason`.
Rails other than cash are "not connected" until their API key is configured, and will
report that explicitly. Never mark a payment paid by editing the row — use the
confirmation flow so settlement and the ledger stay consistent.

## 4. Provider wallets

`provider_wallets` holds the balance; `wallet_transactions` is the append-only ledger.
The balance must equal the sum of the ledger for that provider. `/admin/reconciliation`
shows this comparison per provider and flags any discrepancy.

## 5. Disputes

`/admin/operations` lists open disputes with the linked booking or delivery. Resolution
writes to `disputes` and to `admin_audit_log`.

## 6. Email failures

`/admin/email` shows the send log. If `throttled until` on `/admin/health` is in the
future, the provider rate-limited us and the queue will resume automatically. Persistent
failures for one address usually mean it is in `suppressed_emails`.

## 7. Safe financial corrections

1. Never UPDATE or DELETE `wallet_transactions` — the trigger blocks it by design.
2. Correct by posting a **reversing entry** with a new stable reference, through the same
   server path that created the original.
3. Record why in `admin_audit_log` (any admin action performed in-app does this for you).
4. Re-check the provider in `/admin/reconciliation` afterwards.

## 8. Migrations

Schema changes go through the Lovable migration flow only; each is reviewed before it runs
and is stored in `supabase/migrations/`. Every new `public` table needs GRANTs, RLS enabled
and policies in the same migration. After a migration, run `bash supabase/tests/run.sh`.

## 9. Rolling back non-financial changes

- Application code: revert the change in Lovable and republish.
- Schema: write a forward migration that undoes it. Do not hand-edit the database.
- Never roll back anything that has already produced ledger entries; reverse it instead.

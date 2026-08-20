#!/usr/bin/env bash
# Real concurrency proof: two providers accept the SAME booking from two
# separate, committing database sessions at the same instant.
# Expected: exactly one winner, one assignment, one accepted offer.
set -euo pipefail
: "${SUPABASE_DB_URL:?SUPABASE_DB_URL is required}"
PSQL=(psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -At)

cleanup() {
  "${PSQL[@]}" >/dev/null <<SQL || true
SELECT set_config('zwits.trusted','on',false);
DELETE FROM public.notifications WHERE link LIKE '%' || (SELECT id::text FROM public.bookings WHERE address = 'CONCURRENCY TEST' LIMIT 1);
DELETE FROM public.booking_status_history WHERE booking_id IN (SELECT id FROM public.bookings WHERE address = 'CONCURRENCY TEST');
DELETE FROM public.job_offers WHERE booking_id IN (SELECT id FROM public.bookings WHERE address = 'CONCURRENCY TEST');
DELETE FROM public.bookings WHERE address = 'CONCURRENCY TEST';
DELETE FROM public.providers WHERE business_name IN ('CONC TEST A','CONC TEST B');
SQL
}
trap cleanup EXIT
cleanup

read -r BOOKING OFFER_A OFFER_B USER_A USER_B < <("${PSQL[@]}" -F' ' <<'SQL'
SELECT set_config('zwits.trusted','on',false);
WITH users AS (
  SELECT p.user_id, row_number() OVER (ORDER BY p.created_at) rn FROM public.profiles p LIMIT 3
), ins_a AS (
  INSERT INTO public.providers (user_id, business_name, category, city, hourly_rate, verification_status,
                                available, id_document_url, selfie_url, business_doc_url)
  SELECT user_id,'CONC TEST A','plumbing','Harare',20,'approved',true,'a/id','a/selfie','a/biz' FROM users WHERE rn=2
  RETURNING id, user_id
), ins_b AS (
  INSERT INTO public.providers (user_id, business_name, category, city, hourly_rate, verification_status,
                                available, id_document_url, selfie_url, business_doc_url)
  SELECT user_id,'CONC TEST B','plumbing','Harare',20,'approved',true,'b/id','b/selfie','b/biz' FROM users WHERE rn=3
  RETURNING id, user_id
), bk AS (
  INSERT INTO public.bookings (customer_id, category, address, status, price, payment_method, payment_status)
  SELECT user_id,'plumbing','CONCURRENCY TEST','pending',100,'cash','pending' FROM users WHERE rn=1
  RETURNING id
), oa AS (
  INSERT INTO public.job_offers (booking_id, provider_id, provider_user_id, wave, status, expires_at)
  SELECT bk.id, ins_a.id, ins_a.user_id, 1, 'offered', now() + interval '10 minutes' FROM bk, ins_a
  RETURNING id, provider_user_id
), ob AS (
  INSERT INTO public.job_offers (booking_id, provider_id, provider_user_id, wave, status, expires_at)
  SELECT bk.id, ins_b.id, ins_b.user_id, 1, 'offered', now() + interval '10 minutes' FROM bk, ins_b
  RETURNING id, provider_user_id
)
SELECT bk.id, oa.id, ob.id, oa.provider_user_id, ob.provider_user_id FROM bk, oa, ob;
SQL
)
# The first output line is set_config's return value.
read -r BOOKING OFFER_A OFFER_B USER_A USER_B <<<"$(printf '%s %s %s %s %s' "$BOOKING" "$OFFER_A" "$OFFER_B" "$USER_A" "$USER_B")"

START=$("${PSQL[@]}" -c "select (now() + interval '3 seconds')::text")

race() { # $1 offer, $2 user, $3 out file
  "${PSQL[@]}" -o "$3" <<SQL
SELECT set_config('zwits.trusted','on',false);
SELECT pg_sleep(GREATEST(0, extract(epoch from ('$START'::timestamptz - clock_timestamp()))));
SELECT public.accept_job_offer('$1'::uuid, '$2'::uuid)::text;
SQL
}

race "$OFFER_A" "$USER_A" /tmp/zwits-race-a.txt &
PID_A=$!
race "$OFFER_B" "$USER_B" /tmp/zwits-race-b.txt &
PID_B=$!
wait $PID_A $PID_B

A=$(tail -1 /tmp/zwits-race-a.txt)
B=$(tail -1 /tmp/zwits-race-b.txt)
echo "provider A -> $A"
echo "provider B -> $B"

WINS=0
grep -q '"won": true' <<<"$A" && WINS=$((WINS+1))
grep -q '"won": true' <<<"$B" && WINS=$((WINS+1))

ASSERT=$("${PSQL[@]}" -c "
  select (select count(*) from public.job_offers where booking_id='$BOOKING' and status='accepted')
      || '|' || (select count(*) from public.bookings where id='$BOOKING' and provider_id is not null)
      || '|' || (select count(*) from public.job_offers where booking_id='$BOOKING' and status='lost')")
IFS='|' read -r ACCEPTED ASSIGNED LOST <<<"$ASSERT"

echo "winners=$WINS accepted_offers=$ACCEPTED assigned=$ASSIGNED lost_offers=$LOST"
[ "$WINS" = "1" ]     || { echo "FAIL: expected exactly 1 winner"; exit 1; }
[ "$ACCEPTED" = "1" ] || { echo "FAIL: expected exactly 1 accepted offer"; exit 1; }
[ "$ASSIGNED" = "1" ] || { echo "FAIL: booking not assigned exactly once"; exit 1; }
[ "$LOST" = "1" ]     || { echo "FAIL: loser offer not marked lost"; exit 1; }
echo "PASS 03_concurrency: one winner, one assignment, loser rejected"

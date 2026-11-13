"""V4 A–M. Fixed disposable socket only; never reads hosted credentials.
Usage: python3 tests/delivery-debt-v4-isolated.py /path/to/repair.sql
The repair is staged under /tmp before application, then reused from migrations.
"""
import concurrent.futures, json, subprocess, sys, uuid
from pathlib import Path
from datetime import datetime, timedelta, timezone
from decimal import Decimal
import psycopg2

ROOT = Path(__file__).resolve().parents[1]
BASE = 'host=/tmp/dispatch-integrity/pg port=55439 user=zwits_test'
name = 'debt_v4_' + uuid.uuid4().hex[:12]
bootstrap = psycopg2.connect(BASE + ' dbname=integrity_test')
bootstrap.autocommit = True
with bootstrap.cursor() as c: c.execute('CREATE DATABASE ' + name)
bootstrap.close()
DSN = BASE + ' dbname=' + name
db = psycopg2.connect(DSN); db.autocommit = True; db.set_client_encoding('UTF8')
out = Path('/tmp/dispatch-integrity/v4'); out.mkdir(exist_ok=True)
checks, evidence = [], []
def query(sql, args=(), conn=db):
    with conn.cursor() as c:
        c.execute(sql, args if args else None)
        return c.fetchall() if c.description else []
def actor(uid=None, role='authenticated', conn=db):
    query("SELECT set_config('request.jwt.claim.sub',%s,false),set_config('request.jwt.claim.role',%s,false),set_config('zwits.trusted','',false)", (uid or '',role), conn)
def passed(label): checks.append(label); print('PASS:',label)
def denied(sql,args=(),message=None):
    try: query(sql,args)
    except psycopg2.Error as error:
        if message: assert message in str(error), str(error)
        return
    raise AssertionError('Expected rejection: '+sql)
def hashes():
    return dict(query("SELECT proname,md5(pg_get_functiondef(oid)) FROM pg_proc WHERE pronamespace='public'::regnamespace AND proname IN ('post_wallet_transaction','settle_booking','confirm_cash_delivery','request_wallet_withdrawal')"))
def snapshot():
    return {table:query(f'SELECT to_jsonb(t) FROM {table} t ORDER BY 1') for table in ['deliveries','payments','wallet_transactions','provider_wallets','notifications','delivery_events','admin_audit_log','provider_withdrawals']}

try:
    query((ROOT/'tests/fixtures/delivery-integrity-schema.sql').read_text())
    query((ROOT/'drizzle/migrations/0028_delivery_integrity_cash_atomic_repairs.sql').read_text())
    query("CREATE TABLE provider_withdrawals(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),provider_user_id uuid,amount numeric,method text,destination text,status text,created_at timestamptz DEFAULT now(),updated_at timestamptz DEFAULT now(),processed_at timestamptz,failure_reason text,note text)")
    query((ROOT/'drizzle/migrations/0003_withdrawal_guard_rpc_context.sql').read_text())
    query((ROOT/'drizzle/migrations/0027_dispatch_financial_history_read_only.sql').read_text())
    # The schema snapshot omits function ACLs. Mirror hosted owner-only posting.
    query('REVOKE ALL ON FUNCTION public.post_wallet_transaction(uuid,text,numeric,text,uuid,uuid,uuid,text,boolean) FROM PUBLIC,anon,authenticated; GRANT EXECUTE ON FUNCTION public.post_wallet_transaction(uuid,text,numeric,text,uuid,uuid,uuid,text,boolean) TO service_role')
    before_hash = hashes()
    customer,admin,outsider = [str(uuid.uuid4()) for _ in range(3)]
    query("INSERT INTO commission_rates(category,percent,min_fee) VALUES('default',10,0)")
    query("INSERT INTO user_roles(user_id,role) VALUES(%s,'admin'),(%s,'customer')",(admin,customer))
    def fixture(balance,gross=25,method='cash'):
        driver=str(uuid.uuid4()); actor(None,'service_role')
        query("INSERT INTO driver_profiles(user_id,city) VALUES(%s,'Harare')",(driver,))
        query("INSERT INTO user_roles(user_id,role) VALUES(%s,'driver')",(driver,))
        # Isolated opening debt is a genuine posting in this disposable test DB,
        # not a manufactured hosted balance or inserted immutable history.
        query("SELECT post_wallet_transaction(%s,'adjustment',%s,%s,NULL,NULL,NULL,'ISOLATED opening balance',true)",(driver,balance,'isolated:'+driver))
        jid=str(query("INSERT INTO deliveries(customer_id,driver_id,pickup_address,dropoff_address,status,price,payment_method,payment_status,picked_up_at,delivered_at) VALUES(%s,%s,'ISOLATED V4','ISOLATED V4','delivered',%s,%s,'pending',now()-interval '1 minute',now()) RETURNING id",(customer,driver,gross,method))[0][0])
        path=f'{driver}/{jid}/delivery-proof-{uuid.uuid4()}.jpg'
        query("INSERT INTO storage.objects(bucket_id,name,owner,owner_id,metadata) VALUES('job-photos',%s,%s,%s,'{\"mimetype\":\"image/jpeg\"}')",(path,driver,driver))
        query('UPDATE deliveries SET proof_photo_url=%s WHERE id=%s',(path,jid))
        return driver,jid
    driver,jid=fixture(-27.5)
    actor(driver); baseline=snapshot()
    denied('SELECT confirm_cash_delivery(%s)',(jid,),'Insufficient balance')
    assert snapshot()==baseline
    passed('Baseline: -27.50 plus 25 gross fails; atomic rollback reproduced')
    query(Path(sys.argv[1]).read_text())
    assert hashes()==before_hash
    passed('General posting, booking, receipt and withdrawal functions byte-identical')
    def receipt(driver,jid):
        actor(driver); return query('SELECT confirm_cash_delivery(%s)',(jid,))[0][0]
    def reconcile(label,driver,jid,start,gross,fee,held,final,receipt_required=True):
        rows=query('SELECT type,amount,balance_before,balance_after,reference FROM wallet_transactions WHERE delivery_id=%s ORDER BY created_at,reference',(jid,))
        expected={f'delivery:{jid}:earning':('job_earning',Decimal(str(gross))), f'delivery:{jid}:commission':('commission',-Decimal(str(fee)))}
        if held: expected[f'delivery:{jid}:cash_held']=('adjustment',-Decimal(str(held)))
        assert {r[4]:(r[0],r[1]) for r in rows}==expected
        assert sum(r[1] for r in rows)==Decimal(str(final))-Decimal(str(start))
        earning=next(r for r in rows if r[0]=='job_earning')
        assert earning[2]==Decimal(str(start)) and earning[3]==Decimal(str(start))+Decimal(str(gross))
        w=query('SELECT available_balance,pending_balance,lifetime_earnings FROM provider_wallets WHERE provider_user_id=%s',(driver,))[0]
        assert w==(Decimal(str(final)),0,Decimal(str(gross)))
        payment=query('SELECT amount,currency,payment_method,status,customer_id FROM payments WHERE delivery_id=%s',(jid,))[0]
        assert payment[:4]==(Decimal(str(gross)),'USD','cash' if held else 'card','paid') and str(payment[4])==customer
        if receipt_required:
            assert query("SELECT count(*) FROM admin_audit_log WHERE subject_id=%s AND actor=%s AND metadata->>'reason' IS NOT NULL",(jid,driver))[0][0]==1
            assert query("SELECT count(*) FROM delivery_events WHERE delivery_id=%s AND event='cash_receipt_confirmed'",(jid,))[0][0]==1
        assert query('SELECT payment_status FROM deliveries WHERE id=%s',(jid,))[0][0]=='paid'
        evidence.append(dict(test=label,driver=driver,job=jid,start=start,gross=gross,commission=fee,cash_held=held,economic_net=gross-fee,wallet_movement=final-start,balance=final,withdrawable=max(0,final),references=[r[4] for r in rows]))
    receipt(driver,jid); reconcile('A',driver,jid,-27.5,25,2.5,25,-30); passed('A: -27.50 / 25 cash settles to -30.00; withdrawable 0')
    b,bj=fixture(-100,10); receipt(b,bj); reconcile('B',b,bj,-100,10,1,10,-101); passed('B: -100 / 10 cash settles to -101; withdrawable 0')
    c,cj=fixture(-5,10,'card'); actor(None,'service_role')
    query("INSERT INTO payments(delivery_id,customer_id,amount,currency,payment_method,status) VALUES(%s,%s,10,'USD','card','paid')",(cj,customer)); query("UPDATE deliveries SET payment_status='paid' WHERE id=%s",(cj,))
    assert query('SELECT * FROM settle_delivery(%s)',(cj,))[0]==(10,1,9)
    reconcile('C',c,cj,-5,10,1,0,4,False); passed('C: isolated platform-collected 10 clears 5 debt; final/withdrawable 4 (rail remains unavailable)')
    d,dj=fixture(0); receipt(d,dj); reconcile('D',d,dj,0,25,2.5,25,-2.5); passed('D: normal cash settles to -2.50')
    actor(outsider); query('SET ROLE authenticated'); denied("SELECT post_wallet_transaction(%s,'job_earning',100,'forged',NULL,NULL,NULL,NULL,true)",(driver,),'permission denied'); query('RESET ROLE')
    # Even forged trusted flags cannot obtain owner-only function/schema access.
    actor(outsider); query("SELECT set_config('zwits.trusted','on',false)"); query('SET ROLE authenticated')
    denied('SELECT public.post_delivery_settlement_internal(%s,25,2.5)',(jid,),'permission denied'); query('RESET ROLE')
    query('SET ROLE service_role'); denied('SELECT public.post_delivery_settlement_internal(%s,25,2.5)',(jid,),'permission denied'); query('RESET ROLE')
    actor(driver); query('SET ROLE authenticated'); denied('SELECT settle_delivery(%s)',(jid,),'permission denied'); query('RESET ROLE')
    passed('E: unauthorized credits, forged trust flag, direct helper and client settlement rejected')
    actor(b); baseline=snapshot(); denied("SELECT request_wallet_withdrawal(1,'cash','ISOLATED recipient')",message='Insufficient withdrawable balance'); assert snapshot()==baseline; passed('F: withdrawal against negative balance rejected without writes')
    actor(c); baseline=snapshot(); denied("SELECT request_wallet_withdrawal(5,'cash','ISOLATED recipient')",message='Insufficient withdrawable balance'); assert snapshot()==baseline; passed('G: withdrawal above available 4 rejected without writes')
    actor(None,'service_role'); query("UPDATE commission_rates SET percent=20 WHERE category='default'")
    baseline=snapshot(); result=receipt(driver,jid); assert result['commission']==2.5 and result['unchanged']; assert snapshot()==baseline
    passed('H: replay after rate change returns stored 2.50; no writes or duplicate notices')
    actor(None,'service_role'); query("UPDATE commission_rates SET percent=10 WHERE category='default'")
    i,ij=fixture(-100,10)
    def confirm_concurrently(_):
        conn=psycopg2.connect(DSN); conn.autocommit=True
        try: actor(i,conn=conn); return query('SELECT confirm_cash_delivery(%s)',(ij,),conn)[0][0]
        finally: conn.close()
    with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool: results=list(pool.map(confirm_concurrently,range(8)))
    assert sum(not r['unchanged'] for r in results)==1
    reconcile('I',i,ij,-100,10,1,10,-101); passed('I: 8 concurrent confirmations yield one payment, 3 entries and one receipt audit')
    for label,kind,timing in [('J','job_earning','AFTER'),('K','adjustment','AFTER'),('L','commission','BEFORE')]:
        f,fj=fixture(-100,10); actor(None,'service_role')
        query(f"CREATE FUNCTION isolated_failure() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.delivery_id='{fj}'::uuid AND NEW.type='{kind}' THEN RAISE EXCEPTION 'V4 injected {label}'; END IF; RETURN NEW; END $$; CREATE TRIGGER isolated_failure {timing} INSERT ON wallet_transactions FOR EACH ROW EXECUTE FUNCTION isolated_failure()")
        actor(f); baseline=snapshot(); denied('SELECT confirm_cash_delivery(%s)',(fj,),f'V4 injected {label}'); assert snapshot()==baseline
        query('DROP TRIGGER isolated_failure ON wallet_transactions; DROP FUNCTION isolated_failure()')
        passed(f'{label}: injected failure {timing.lower()} {kind} rolls back payment, wallet, ledger, notices and audit')
    actor(None,'service_role'); provider=str(uuid.uuid4())
    pid=query("INSERT INTO providers(user_id,business_name,category,city,hourly_rate) VALUES(%s,'ISOLATED','plumbing','Harare',25) RETURNING id",(provider,))[0][0]
    bid=query("INSERT INTO bookings(customer_id,provider_id,category,address,status,price,payment_method,payment_status) VALUES(%s,%s,'plumbing','ISOLATED','completed',25,'cash','paid') RETURNING id",(customer,pid))[0][0]
    query("INSERT INTO payments(booking_id,customer_id,amount,payment_method,status) VALUES(%s,%s,25,'cash','paid')",(bid,customer))
    assert query('SELECT * FROM settle_booking(%s)',(bid,))[0]==(25,2.5,22.5)
    assert query('SELECT available_balance FROM provider_wallets WHERE provider_user_id=%s',(provider,))[0][0]==-2.5
    assert query('SELECT count(*) FROM wallet_transactions WHERE booking_id=%s',(bid,))[0][0]==3
    assert hashes()==before_hash; passed('M: booking function unchanged and normal booking cash accounting unchanged')
    actor(None,'service_role'); baseline=snapshot()
    denied('UPDATE wallet_transactions SET amount=999 WHERE delivery_id=%s',(jid,),'immutable'); denied('DELETE FROM wallet_transactions WHERE delivery_id=%s',(jid,),'immutable'); assert snapshot()==baseline; passed('Immutable ledger update/delete denied even to privileged role')
    # Default general posting still refuses a positive credit ending below zero.
    denied("SELECT post_wallet_transaction(%s,'adjustment',1,'ordinary-negative-credit')",(b,),'Insufficient balance'); passed('Ordinary posting negative-balance guard remains enforced')
    f,fj=fixture(-100,10); actor(None,'service_role')
    query("INSERT INTO payments(delivery_id,customer_id,amount,payment_method,status) VALUES(%s,%s,9,'cash','pending')",(fj,customer))
    actor(f); baseline=snapshot(); denied('SELECT confirm_cash_delivery(%s)',(fj,),'Payment mismatch'); assert snapshot()==baseline; passed('Mismatched payment still rejected atomically')
    exported=[]; start=datetime.now(timezone.utc)-timedelta(days=1); end=start+timedelta(days=2)
    for e in evidence:
        actor(admin); report=query('SELECT admin_dispatch_financials(%s,%s,%s,0)',(start,end,e['driver']))[0][0]
        assert report['summary']['wallet_mismatches']==0
        assert report['summary']['gross_earned']==e['gross'] and report['summary']['commission']==e['commission'] and report['summary']['net_earned']==e['economic_net']
        assert report['wallets'][0]['available_balance']==e['balance']
        actor(e['driver']); query('SET ROLE authenticated')
        ledger=[r[0] for r in query('SELECT to_jsonb(t) FROM wallet_transactions t WHERE provider_user_id=%s',(e['driver'],))]
        jobs=[r[0] for r in query('SELECT to_jsonb(t) FROM deliveries t WHERE driver_id=%s',(e['driver'],))]
        wallet=query('SELECT to_jsonb(t) FROM provider_wallets t WHERE provider_user_id=%s',(e['driver'],))[0][0]; query('RESET ROLE')
        exported.append(dict(expected=e,ledger=ledger,jobs=jobs,wallet=wallet,admin=report))
    (out/'records.json').write_text(json.dumps(exported,default=str))
    subprocess.run(['bun',str(ROOT/'tests/delivery-debt-v4-readback.ts'),str(out/'records.json')],check=True,cwd=ROOT)
    passed('All successful A/B/C/D/I driver RLS readbacks agree with admin projection and reconciliation')
    (out/'results.json').write_text(json.dumps(dict(checks=checks,reconciliation=evidence,unchanged_hashes=before_hash),indent=2))
    print(len(checks),'V4 checks passed')
finally:
    db.close()
    cleanup=psycopg2.connect(BASE+' dbname=integrity_test'); cleanup.autocommit=True
    with cleanup.cursor() as cursor: cursor.execute('DROP DATABASE '+name)
    cleanup.close(); print('Disposable V4 database destroyed; hosted finances never connected')
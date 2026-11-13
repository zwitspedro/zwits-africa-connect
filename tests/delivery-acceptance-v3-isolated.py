"""Acceptance V3: local Unix-socket database only; never uses hosted credentials.
Run after starting the disposable server described by delivery-integrity-isolated.py.
Creates a separate disposable database. Production functions are reused verbatim.
Storage metadata is simulated, not an actual hosted upload. No physical cash moves.
"""
import json, uuid, subprocess
from pathlib import Path
from datetime import datetime, timedelta, timezone
from decimal import Decimal
import psycopg2

ROOT = Path(__file__).resolve().parents[1]
BASE = 'host=/tmp/dispatch-integrity/pg port=55439 user=zwits_test'
bootstrap = psycopg2.connect(BASE + ' dbname=integrity_test')
bootstrap.autocommit = True
name = 'acceptance_' + uuid.uuid4().hex[:12]
with bootstrap.cursor() as c:
    c.execute('CREATE DATABASE ' + name)
bootstrap.close()
db = psycopg2.connect(BASE + ' dbname=' + name)
db.autocommit = True
db.set_client_encoding('UTF8')
checks = []
def query(sql, args=()):
    with db.cursor() as c:
        c.execute(sql, args if args else None)
        return c.fetchall() if c.description else []
def actor(uid, role='authenticated'):
    query("SELECT set_config('request.jwt.claim.sub',%s,false),set_config('request.jwt.claim.role',%s,false),set_config('zwits.trusted','',false)", (uid or '', role))
def passed(label):
    checks.append(label)
    print('PASS:', label)
def denied(label, sql, args):
    try:
        query(sql, args)
    except psycopg2.Error:
        passed(label)
        return
    raise AssertionError(label)
try:
    query((ROOT/'tests/fixtures/delivery-integrity-schema.sql').read_text())
    query((ROOT/'drizzle/migrations/0028_delivery_integrity_cash_atomic_repairs.sql').read_text())
    source = (ROOT/'drizzle/migrations/0013_admin_dispatch_control_transactions.sql').read_text()
    query(source[source.index('CREATE OR REPLACE FUNCTION public.respond_delivery_offer_atomic'):])
    # Empty dependency needed by the production read-only admin projection.
    query('CREATE TABLE provider_withdrawals(id uuid,provider_user_id uuid,amount numeric,method text,status text,created_at timestamptz,updated_at timestamptz,processed_at timestamptz,failure_reason text,note text)')
    query((ROOT/'drizzle/migrations/0027_dispatch_financial_history_read_only.sql').read_text())
    query('CREATE TRIGGER acceptance_offer_commitment BEFORE INSERT OR UPDATE ON delivery_offers FOR EACH ROW EXECUTE FUNCTION dispatch_commitment_guard()')
    customer, driver, outsider, admin = [str(uuid.uuid4()) for _ in range(4)]
    query("INSERT INTO commission_rates(category,percent,min_fee) VALUES('default',10,0)")
    query("INSERT INTO user_roles(user_id,role) VALUES(%s,'admin'),(%s,'driver'),(%s,'customer')",(admin,driver,customer))
    actor(None,'service_role')
    query("INSERT INTO driver_profiles(user_id,city,available,verification_status,id_document_url,licence_url,vehicle_doc_url) VALUES(%s,'Harare',true,'approved','ISOLATED ID','ISOLATED LICENCE','ISOLATED VEHICLE')",(driver,))
    query("INSERT INTO vehicles(user_id,vehicle_type,plate,active) VALUES(%s,'bike','ISOLATED V3',true)",(driver,))
    ids=[]
    for index in range(12):
        actor(customer)
        jid=str(query("INSERT INTO deliveries(customer_id,pickup_address,dropoff_address,price,service_tier,parcel_size,payment_method) VALUES(%s,'ISOLATED V3 PICKUP','ISOLATED V3 DROP',25,'express_bike','small','cash') RETURNING id",(outsider,))[0][0])
        assert str(query('SELECT customer_id FROM deliveries WHERE id=%s',(jid,))[0][0])==customer
        ids.append(jid)
        actor(None,'service_role')
        offer=str(query("INSERT INTO delivery_offers(delivery_id,driver_user_id,expires_at) VALUES(%s,%s,now()+interval '5 minutes') RETURNING id",(jid,driver))[0][0])
        if index==0:
            query('UPDATE driver_profiles SET available=false WHERE user_id=%s',(driver,))
            actor(driver);denied('Offline driver cannot accept','SELECT respond_delivery_offer_atomic(%s,\'accept\')',(offer,))
            actor(None,'service_role');query("UPDATE driver_profiles SET available=true,verification_status='unverified' WHERE user_id=%s",(driver,))
            actor(driver);denied('Unverified driver cannot accept','SELECT respond_delivery_offer_atomic(%s,\'accept\')',(offer,))
            actor(None,'service_role');query("UPDATE driver_profiles SET verification_status='approved' WHERE user_id=%s",(driver,))
        actor(outsider)
        if index==0: denied('Other driver cannot accept the offer','SELECT respond_delivery_offer_atomic(%s,\'accept\')',(offer,))
        actor(driver)
        result=query("SELECT respond_delivery_offer_atomic(%s,'accept')",(offer,))[0][0]
        assert result['won']
        assert query("SELECT respond_delivery_offer_atomic(%s,'accept')",(offer,))[0][0]['idempotent']
        query("SELECT update_delivery_progress_atomic(%s,'picked_up',NULL)",(jid,))
        custodian,pickup=query('SELECT driver_id,picked_up_at FROM deliveries WHERE id=%s',(jid,))[0]
        assert str(custodian)==driver and pickup
        proof=f'{driver}/{jid}/delivery-proof-{uuid.uuid4()}.jpg'
        query("INSERT INTO storage.objects(bucket_id,name,owner,owner_id,metadata) VALUES('job-photos',%s,%s,%s,'{\"mimetype\":\"image/jpeg\"}')",(proof,driver,driver))
        query("SELECT update_delivery_progress_atomic(%s,'delivered',%s)",(jid,proof))
        if index == 11:
            before=query('SELECT available_balance,lifetime_earnings FROM provider_wallets WHERE provider_user_id=%s',(driver,))[0]
            try:
                query('SELECT confirm_cash_delivery(%s)',(jid,))
            except psycopg2.Error as error:
                assert 'Insufficient balance' in str(error)
            else:
                raise AssertionError('Expected cumulative-debt defect was not reproduced')
            assert query('SELECT payment_status FROM deliveries WHERE id=%s',(jid,))[0][0]=='pending'
            assert query('SELECT count(*) FROM payments WHERE delivery_id=%s',(jid,))[0][0]==0
            assert query('SELECT count(*) FROM wallet_transactions WHERE delivery_id=%s',(jid,))[0][0]==0
            assert query('SELECT count(*) FROM admin_audit_log WHERE subject_id=%s',(jid,))[0][0]==0
            assert query('SELECT available_balance,lifetime_earnings FROM provider_wallets WHERE provider_user_id=%s',(driver,))[0]==before
            passed('Failure at twelfth $25 cash job with -$27.50 debt rolls back payment, ledger, audit and wallet completely')
            print('FAIL: cumulative commission debt greater than next gross prevents valid cash receipt; production logic unchanged')
            continue
        result=query('SELECT confirm_cash_delivery(%s)',(jid,))[0][0]
        assert (Decimal(str(result['gross'])),Decimal(str(result['commission'])),Decimal(str(result['providerEarnings'])))==(Decimal('25'),Decimal('2.5'),Decimal('22.5'))
        assert query('SELECT count(*) FROM wallet_transactions WHERE delivery_id=%s',(jid,))[0][0]==3
        assert query('SELECT amount,status FROM payments WHERE delivery_id=%s',(jid,))[0]==(Decimal('25'),'paid')
        assert query("SELECT count(*) FROM admin_audit_log WHERE subject_id=%s AND actor=%s AND metadata->>'reason' IS NOT NULL",(jid,driver))[0][0]==1
    passed('12 customer identities, offers, pickups, custody and completions; 11 cash confirmations succeed')
    wallet=query('SELECT available_balance,pending_balance,lifetime_earnings,currency FROM provider_wallets WHERE provider_user_id=%s',(driver,))[0]
    assert wallet==(Decimal('-27.5'),Decimal('0'),Decimal('275'),'USD')
    passed('11 settlements reconcile $275 gross, $27.50 commission, $275 cash held, $247.50 economic net and -$27.50 wallet; no withdrawable credit')
    notices=query('SELECT count(*) FROM notifications')[0][0]
    actor(None,'service_role');query("UPDATE commission_rates SET percent=20 WHERE category='default'")
    actor(driver)
    assert query('SELECT confirm_cash_delivery(%s)',(ids[0],))[0][0]['commission']==2.5
    assert query('SELECT count(*) FROM wallet_transactions')[0][0]==33 and query('SELECT count(*) FROM notifications')[0][0]==notices
    passed('Replay preserves stored commission, all 33 references and notice counts after a rate change')
    start=datetime.now(timezone.utc)-timedelta(days=1);end=start+timedelta(days=2)
    actor(outsider);denied('Non-admin financial projection denied','SELECT admin_dispatch_financials(%s,%s,%s,0)',(start,end,driver))
    actor(admin)
    reports=[query('SELECT admin_dispatch_financials(%s,%s,%s,%s)',(start,end,driver,page))[0][0] for page in [0,1]]
    r=reports[0]
    assert r['summary']['gross_earned']==275 and r['summary']['commission']==27.5 and r['summary']['net_earned']==247.5 and r['summary']['wallet_mismatches']==0
    assert r['jobs_total']==12 and r['payments_total']==11 and r['ledger_total']==33
    assert len(r['ledger'])==25 and len(reports[1]['ledger'])==8
    assert not ({t['id'] for t in r['ledger']} & {t['id'] for t in reports[1]['ledger']})
    for j in r['jobs']:
        assert j['id'] in ids
        if j['id']==ids[-1]:
            assert j['payment_status']=='pending' and j['settlement_status']=='Awaiting confirmed payment' and j['gross_earned']==0
        else:
            assert j['payment_status']=='paid' and j['settlement_status']=='Ledger recorded' and j['commission']==2.5 and j['current_calculated_commission']==5
    passed('Production admin projection agrees on settled and failed jobs, stored versus current commission and disjoint 25/8-row pages')
    actor(driver);query('SET ROLE authenticated')
    def records(sql):
        return [row[0] for row in query(sql,(driver,))]
    ledger=records('SELECT to_jsonb(t) FROM wallet_transactions t WHERE provider_user_id=%s ORDER BY created_at DESC,id')
    jobs=records('SELECT to_jsonb(d) FROM deliveries d WHERE driver_id=%s ORDER BY created_at DESC,id')
    wallet_obj=query('SELECT to_jsonb(w) FROM provider_wallets w WHERE provider_user_id=%s',(driver,))[0][0]
    assert len(ledger)==33 and len(jobs)==12
    query('RESET ROLE')
    passed('Driver owner-scoped RLS reads all 33 posted rows and 12 completed jobs')
    out=Path('/tmp/dispatch-integrity/v3');out.mkdir(exist_ok=True)
    (out/'records.json').write_text(json.dumps({'ledger':ledger,'jobs':jobs,'wallet':wallet_obj,'withdrawals':[],'admin':reports,'checks':checks},default=str))
    subprocess.run(['bun',str(ROOT/'tests/delivery-acceptance-v3-readback.ts'),str(out/'records.json')],check=True,cwd=ROOT)
    passed('Existing driver financial summary reconciles actual isolated SQL records, timestamp, references and weekly totals with admin')
    (out/'results.json').write_text(json.dumps(checks,indent=2))
    with db.cursor() as c:
        c.execute("SELECT proname,md5(pg_get_functiondef(oid)) FROM pg_proc WHERE pronamespace='public'::regnamespace AND proname IN ('post_wallet_transaction','settle_delivery','confirm_cash_delivery','respond_delivery_offer_atomic','admin_dispatch_financials')")
        (out/'function-hashes.json').write_text(json.dumps(dict(c.fetchall()),indent=2))
finally:
    db.close()
    cleanup=psycopg2.connect(BASE+' dbname=integrity_test');cleanup.autocommit=True
    with cleanup.cursor() as c:c.execute('DROP DATABASE '+name)
    cleanup.close()
    print('Disposable V3 database destroyed; hosted records never connected')
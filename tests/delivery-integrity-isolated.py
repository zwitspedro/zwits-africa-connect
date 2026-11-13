"""Schema-only disposable Postgres regression. Never connects to the app database.
Start a disposable Postgres on /tmp/dispatch-integrity/pg:55439; run this script.
All fixture rows are confined to that disposable server. Destroy its data directory after testing.
"""
import json,uuid,concurrent.futures,sys
from pathlib import Path
import psycopg2
DSN='host=/tmp/dispatch-integrity/pg port=55439 user=zwits_test dbname=integrity_test'
def connect():return psycopg2.connect(DSN)
db=connect();db.set_client_encoding('UTF8');db.autocommit=True
with db.cursor() as c:
 c.execute(Path('tests/fixtures/delivery-integrity-schema.sql').read_text())
 c.execute(Path('drizzle/migrations/0028_delivery_integrity_cash_atomic_repairs.sql').read_text())
 if len(sys.argv)>1: c.execute(Path(sys.argv[1]).read_text())
customer,driver,other=[str(uuid.uuid4()) for _ in range(3)]
checks=[]
def query(sql,args=(),conn=db):
 with conn.cursor() as c:c.execute(sql,args);return c.fetchall() if c.description else None
def actor(uid,conn=db):query("SELECT set_config('request.jwt.claim.sub',%s,false),set_config('request.jwt.claim.role','authenticated',false),set_config('zwits.trusted','',false)",(uid or '',),conn)
def passed(name):checks.append(name);print('PASS:',name)
def deny(name,sql,args=(),uid=other,conn=db):
 actor(uid,conn)
 try:query(sql,args,conn)
 except psycopg2.Error:passed(name);return
 raise AssertionError(name+' unexpectedly succeeded')
def job(status='pending',assigned=None):
 actor(None);query("SELECT set_config('request.jwt.claim.role','service_role',false)")
 return query("INSERT INTO deliveries(customer_id,driver_id,service_tier,parcel_size,pickup_address,dropoff_address,status,price,payment_method,payment_status,picked_up_at) VALUES(%s,%s,'express_bike','small','ISOLATED TEST','ISOLATED TEST',%s,25,'cash','pending',CASE WHEN %s IN ('picked_up','delivered') THEN now()-interval '1 minute' END) RETURNING id",(customer,assigned,status,status))[0][0]
def photo(j,owner=driver,old=False):
 path=f'{owner}/{j}/delivery-proof-{uuid.uuid4()}.jpg'
 query("INSERT INTO storage.objects(bucket_id,name,owner,owner_id,created_at,metadata) VALUES('job-photos',%s,%s,%s,now()-CASE WHEN %s THEN interval '1 day' ELSE interval '0' END,'{\"mimetype\":\"image/jpeg\"}')",(path,owner,owner,old));return path
try:
 query("INSERT INTO commission_rates(category,percent,min_fee) VALUES('default',10,0)")
 query("INSERT INTO driver_profiles(user_id,city) VALUES(%s,'Harare')",(driver,))
 j=job();deny('Unrelated customer cannot cancel unassigned delivery','SELECT update_delivery_progress_atomic(%s,\'cancelled\',NULL)',(j,))
 actor(customer);query("SELECT update_delivery_progress_atomic(%s,'cancelled',NULL)",(j,));assert query('SELECT status FROM deliveries WHERE id=%s',(j,))[0][0]=='cancelled';passed('Actual customer cancels eligible delivery')
 j=job('accepted',driver);deny('Unassigned driver denied','SELECT update_delivery_progress_atomic(%s,\'picked_up\',NULL)',(j,))
 deny('Unauthenticated denied','SELECT update_delivery_progress_atomic(%s,\'picked_up\',NULL)',(j,),uid=None)
 deny('Missing delivery rejected','SELECT update_delivery_progress_atomic(%s,\'cancelled\',NULL)',(str(uuid.uuid4()),))
 deny('Customer cannot perform driver action','SELECT update_delivery_progress_atomic(%s,\'picked_up\',NULL)',(j,),uid=customer)
 actor(driver);query("SELECT update_delivery_progress_atomic(%s,'picked_up',NULL)",(j,));passed('Assigned driver pickup allowed')
 for name,path in [('No photograph',None),('Other delivery photograph',photo(job('picked_up',driver))),('Previous delivery photograph',photo(uuid.uuid4())),('Same job pre-pickup photograph',photo(j,old=True)),('Unauthorized driver photograph',photo(j,other))]:
  deny(name+' completion denied',"SELECT update_delivery_progress_atomic(%s,'delivered',%s)",(j,path),uid=driver)
 assert query('SELECT status FROM deliveries WHERE id=%s',(j,))[0][0]=='picked_up'
 path=photo(j);actor(driver);query("SELECT update_delivery_progress_atomic(%s,'delivered',%s)",(j,path));passed('Correct delivery photograph completes job')
 deny('Completed delivery cannot be cancelled',"SELECT update_delivery_progress_atomic(%s,'cancelled',NULL)",(j,),uid=customer)
 deny('Customer cannot confirm cash','SELECT confirm_cash_delivery(%s)',(j,),uid=customer)
 actor(driver);t=query('SELECT confirm_cash_delivery(%s)',(j,))[0][0];assert (float(t['gross']),float(t['commission']),float(t['providerEarnings']))==(25,2.5,22.5)
 rows=query('SELECT type,amount,reference FROM wallet_transactions WHERE delivery_id=%s ORDER BY created_at,reference',(j,));assert len(rows)==3 and sum(float(r[1]) for r in rows)==-2.5;assert {r[2] for r in rows}=={f'delivery:{j}:{x}' for x in ['earning','cash_held','commission']}
 assert query('SELECT available_balance,lifetime_earnings FROM provider_wallets WHERE provider_user_id=%s',(driver,))[0]==(-2.5,25);passed('Cash held offset, 10% commission and $22.50 economic earnings; wallet -$2.50')
 notices=query('SELECT count(*) FROM notifications')[0][0];audit=query('SELECT count(*) FROM admin_audit_log WHERE actor=%s AND subject_id=%s AND metadata->>\'reason\' IS NOT NULL',(driver,j))[0][0];assert audit==1;passed('Receipt actor/reason and settlement audit recorded')
 query("UPDATE commission_rates SET percent=20 WHERE category='default'");actor(driver);replay=query('SELECT confirm_cash_delivery(%s)',(j,))[0][0];assert replay['commission']==2.5 and replay['unchanged'];assert query('SELECT count(*) FROM notifications')[0][0]==notices;passed('Replay returns stored totals and no duplicate notices or receipt')
 deny('Ledger update immutable','UPDATE wallet_transactions SET amount=999 WHERE delivery_id=%s',(j,));deny('Ledger delete immutable','DELETE FROM wallet_transactions WHERE delivery_id=%s',(j,))
 # Inject a failure AFTER gross and cash-held posts. Only the isolated database gets this trigger.
 fail=job('delivered',driver);p=photo(fail);query('UPDATE deliveries SET proof_photo_url=%s WHERE id=%s',(p,fail))
 query("CREATE FUNCTION isolated_fail() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.type='commission' THEN RAISE EXCEPTION 'isolated commission failure'; END IF; RETURN NEW; END $$; CREATE TRIGGER isolated_fail BEFORE INSERT ON wallet_transactions FOR EACH ROW EXECUTE FUNCTION isolated_fail()")
 balance=query('SELECT available_balance FROM provider_wallets WHERE provider_user_id=%s',(driver,))[0][0]
 deny('Failure during settlement rolls back confirmation','SELECT confirm_cash_delivery(%s)',(fail,),uid=driver)
 assert query('SELECT count(*) FROM payments WHERE delivery_id=%s',(fail,))[0][0]==0 and query('SELECT count(*) FROM wallet_transactions WHERE delivery_id=%s',(fail,))[0][0]==0
 assert query('SELECT payment_status FROM deliveries WHERE id=%s',(fail,))[0][0]=='pending' and query('SELECT available_balance FROM provider_wallets WHERE provider_user_id=%s',(driver,))[0][0]==balance
 assert query('SELECT count(*) FROM admin_audit_log WHERE subject_id=%s',(fail,))[0][0]==0;passed('Failure leaves no paid marker, partial ledger, wallet change or audit')
 query('DROP TRIGGER isolated_fail ON wallet_transactions; DROP FUNCTION isolated_fail()')
 query("UPDATE commission_rates SET percent=10 WHERE category='default'")
 def concurrent_confirm(_):
  c=connect();c.autocommit=True
  try:actor(driver,c);return query('SELECT confirm_cash_delivery(%s)',(fail,),c)[0][0]
  finally:c.close()
 with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:results=list(pool.map(concurrent_confirm,range(4)))
 assert len(results)==4 and sum(not r['unchanged'] for r in results)==1 and query('SELECT count(*) FROM wallet_transactions WHERE delivery_id=%s',(fail,))[0][0]==3
 assert query('SELECT count(*) FROM admin_audit_log WHERE subject_id=%s',(fail,))[0][0]==1;passed('Concurrent confirmations settle exactly once')
 def concurrent_settle(_):
  c=connect();c.autocommit=True
  try:actor(None,c);query("SELECT set_config('request.jwt.claim.role','service_role',false)",conn=c);return query('SELECT * FROM settle_delivery(%s)',(fail,),c)[0]
  finally:c.close()
 with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:results=list(pool.map(concurrent_settle,range(4)))
 assert all(r==(25,2.5,22.5) for r in results) and query('SELECT count(*) FROM wallet_transactions WHERE delivery_id=%s',(fail,))[0][0]==3;passed('Concurrent settlement replay stable and duplicate-free')
 # Unchanged booking settlement, on a separate isolated provider wallet.
 provider=str(uuid.uuid4());actor(None);query("SELECT set_config('request.jwt.claim.role','service_role',false)")
 pid=query("INSERT INTO providers(user_id,business_name,category,city,hourly_rate) VALUES(%s,'ISOLATED','plumbing','Harare',25) RETURNING id",(provider,))[0][0]
 bid=query("INSERT INTO bookings(customer_id,provider_id,category,address,status,price,payment_method,payment_status) VALUES(%s,%s,'plumbing','ISOLATED','completed',25,'cash','paid') RETURNING id",(customer,pid))[0][0]
 query("INSERT INTO payments(booking_id,customer_id,amount,payment_method,status) VALUES(%s,%s,25,'cash','paid')",(bid,customer));assert query('SELECT * FROM settle_booking(%s)',(bid,))[0]==(25,2.5,22.5);assert query('SELECT available_balance FROM provider_wallets WHERE provider_user_id=%s',(provider,))[0][0]==-2.5;passed('Existing booking cash settlement unchanged')
 held=job('accepted',driver);query("INSERT INTO admin_job_controls(kind,job_id,held) VALUES('delivery',%s,true)",(held,));deny('Dispatch hold still prevents pickup',"SELECT update_delivery_progress_atomic(%s,'picked_up',NULL)",(held,),uid=driver)
 custody=job('picked_up',driver);cp=photo(custody);query("INSERT INTO delivery_reassignments(delivery_id,action_key,actor,previous_driver,replacement_driver,reason,status,requires_handover) VALUES(%s,%s,%s,%s,%s,'ISOLATED','awaiting_handover',true)",(custody,str(uuid.uuid4()),customer,driver,other));deny('Pending custody handover still blocks completion',"SELECT update_delivery_progress_atomic(%s,'delivered',%s)",(custody,cp),uid=driver)
 query('SET ROLE authenticated');actor(other);assert query('SELECT count(*) FROM deliveries WHERE id=%s',(j,))[0][0]==0;assert query('SELECT count(*) FROM wallet_transactions WHERE delivery_id=%s',(j,))[0][0]==0;query('RESET ROLE');passed('Owner-scoped RLS isolates delivery and ledger')
 assert all(r[0] for r in query("SELECT relrowsecurity FROM pg_class WHERE relname IN ('deliveries','payments','wallet_transactions','provider_wallets')"));passed('RLS enabled')
 Path('/tmp/dispatch-integrity/results.json').write_text(json.dumps(checks,indent=2));print(len(checks),'isolated workflow checks passed')
finally:
 db.close()

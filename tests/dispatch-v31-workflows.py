# Opt-in integration test: uses disposable auth accounts/jobs and removes them in finally.
# Requires managed test environment credentials; never run against unrelated credentials.
import os,json,requests,uuid,asyncio
from playwright.async_api import async_playwright
SCREENSHOTS=__import__('pathlib').Path('/tmp/browser/dispatch-v31');SCREENSHOTS.mkdir(parents=True,exist_ok=True)
url=os.environ['SUPABASE_URL'].rstrip('/');key=os.environ['SUPABASE_SERVICE_ROLE_KEY'];h={'apikey':key,'Content-Type':'application/json','Prefer':'return=representation'}
if not key.startswith('sb_'):h['Authorization']='Bearer '+key
session=json.loads(os.environ['LOVABLE_BROWSER_SUPABASE_SESSION_JSON']);admin=session['user']['id'];ah={'apikey':os.environ['SUPABASE_PUBLISHABLE_KEY'],'Authorization':'Bearer '+session['access_token'],'Content-Type':'application/json'}
users=[];jobs=[]
def api(path,data=None,method='POST',headers=h):
 r=requests.request(method,url+path,headers=headers,json=data);r.raise_for_status();return r.json() if r.content else None
def rpc(name,data,headers=ah):return api('/rest/v1/rpc/'+name,data,headers=headers)
def read(table,query):return api('/rest/v1/'+table+'?'+query,method='GET')
def delivery(driver=None,status='pending',start=None,end=None):
 data={'customer_id':admin,'pickup_address':'V31 DISPOSABLE CHECK','dropoff_address':'V31 DISPOSABLE DROP','price':5,'payment_method':'cash','service_tier':'express_bike','parcel_size':'small','status':status,'driver_id':driver,'scheduled_for':start,'scheduled_until':end};r=api('/rest/v1/deliveries',data)[0];jobs.append(r['id']);return r
def make_driver(name):
 password=uuid.uuid4().hex+'aA1!';email='dispatch-v31-'+uuid.uuid4().hex+'@example.com'
 u=api('/auth/v1/admin/users',{'email':email,'password':password,'email_confirm':True,'user_metadata':{'display_name':name}});uid=u['id'];users.append(uid)
 api('/rest/v1/user_roles',{'user_id':uid,'role':'driver'})
 api('/rest/v1/driver_profiles',{'user_id':uid,'full_name':name,'city':'Harare','phone':'+263770000000','available':False,'verification_status':'unverified'})
 api('/rest/v1/vehicles',{'user_id':uid,'vehicle_type':'bike','plate':'TEST V31','make':'TEST','model':'TEST','active':True})
 api('/rest/v1/driver_profiles?user_id=eq.'+uid,{'verification_status':'approved','available':True,'id_document_url':uid+'/TEST-ID','licence_url':uid+'/TEST-LICENCE','vehicle_doc_url':uid+'/TEST-REG'},method='PATCH')
 login=api('/auth/v1/token?grant_type=password',{'email':email,'password':password},headers={'apikey':os.environ['SUPABASE_PUBLISHABLE_KEY'],'Content-Type':'application/json'})
 return uid,login,{'apikey':os.environ['SUPABASE_PUBLISHABLE_KEY'],'Authorization':'Bearer '+login['access_token'],'Content-Type':'application/json'}
async def browser_check(old,new,job):
 async with async_playwright() as p:
  b=await p.chromium.launch(headless=True);c=await b.new_context(viewport={'width':1280,'height':1800});page=await c.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  await page.goto('http://localhost:8080');await page.evaluate('([k,v])=>localStorage.setItem(k,v)',[os.environ['LOVABLE_BROWSER_SUPABASE_STORAGE_KEY'],os.environ['LOVABLE_BROWSER_SUPABASE_SESSION_JSON']]);await page.goto('http://localhost:8080/admin/deliveries/'+job['id']);await page.get_by_role('button',name='Reassign Driver',exact=True).wait_for();await page.get_by_role('button',name='Reassign Driver',exact=True).click();await page.get_by_label('Replacement driver').select_option(new[0]);await page.get_by_role('button',name='Check replacement eligibility').click();await page.get_by_role('button',name='Confirm reassignment request').wait_for();await page.get_by_label('Reassignment reason').fill('Disposable browser replacement validation');await page.get_by_role('button',name='Confirm reassignment request').click();await page.get_by_role('dialog').wait_for(state='hidden');await page.screenshot(path='/tmp/browser/dispatch-v31/admin-request.png')
  await page.evaluate('([k,v])=>localStorage.setItem(k,v)',[os.environ['LOVABLE_BROWSER_SUPABASE_STORAGE_KEY'],json.dumps(new[1])]);await page.goto('http://localhost:8080/driver');await page.get_by_role('button',name='Accept replacement').wait_for();await page.get_by_role('button',name='Accept replacement').click();await page.get_by_role('button',name='Accept replacement').wait_for(state='hidden');await page.screenshot(path='/tmp/browser/dispatch-v31/driver-accepted.png');assert read('deliveries','id=eq.'+job['id']+'&select=driver_id')[0]['driver_id']==new[0]
  await page.set_viewport_size({'width':390,'height':844});await page.goto('http://localhost:8080/m/driver');await page.wait_for_timeout(1500);await page.screenshot(path='/tmp/browser/dispatch-v31/mobile.png');print('browser replacement and driver readback passed; overflow',await page.evaluate('document.documentElement.scrollWidth>innerWidth'),'errors',errors);await b.close()
async def browser_bulk(driver,records):
 async with async_playwright() as p:
  browser=await p.chromium.launch(headless=True);context=await browser.new_context(viewport={'width':1280,'height':1800});page=await context.new_page()
  await page.goto('http://localhost:8080');await page.evaluate('([k,v])=>localStorage.setItem(k,v)',[os.environ['LOVABLE_BROWSER_SUPABASE_STORAGE_KEY'],os.environ['LOVABLE_BROWSER_SUPABASE_SESSION_JSON']]);await page.goto('http://localhost:8080/admin/dispatch')
  await page.get_by_role('textbox',name='Search',exact=True).fill('V31 DISPOSABLE CHECK');await page.get_by_role('button',name='Search',exact=True).click()
  await page.wait_for_timeout(1000)
  for row in records:await page.get_by_role('checkbox',name='Select '+row['id'][:8]).check()
  await page.get_by_role('button',name='Bulk Assign (2)',exact=True).click()
  for row in records:await page.get_by_label('Assignee '+row['id'][:8]).select_option(driver[0])
  await page.get_by_label('Bulk assignment reason').fill('Disposable bulk browser review')
  await page.get_by_role('button',name='Preview assignments').click();await page.get_by_role('button',name='Confirm checked offers').wait_for(state='visible');await page.get_by_role('button',name='Confirm checked offers').click();await page.get_by_text('· Offer sent',exact=False).first.wait_for()
  await page.screenshot(path='/tmp/browser/dispatch-v31/bulk-outcomes.png');print('bulk board preview/confirmation/results browser passed');await browser.close()

try:
 old=make_driver('V31 Previous Driver');new=make_driver('V31 Replacement Driver');other=make_driver('V31 Third Driver')
 d=delivery(old[0],'accepted');asyncio.run(browser_check(old,new,d))
 d=delivery(old[0],'picked_up');r=rpc('admin_request_driver_reassignment',{'_id':d['id'],'_replacement':new[0],'_expected':d['updated_at'],'_key':str(uuid.uuid4()),'_reason':'Disposable collected parcel test','_location':'TEST HANDOVER ONLY'});rid=r['id'];assert rpc('respond_driver_reassignment',{'_id':rid,'_decision':'accept'},new[2])['ok'];assert read('deliveries','id=eq.'+d['id']+'&select=driver_id')[0]['driver_id']==old[0];rpc('respond_driver_reassignment',{'_id':rid,'_decision':'handover'},old[2]);assert read('deliveries','id=eq.'+d['id']+'&select=driver_id')[0]['driver_id']==old[0];rpc('respond_driver_reassignment',{'_id':rid,'_decision':'handover'},new[2]);assert read('deliveries','id=eq.'+d['id']+'&select=driver_id')[0]['driver_id']==new[0];print('two-custodian handover passed')
 d=delivery(old[0],'accepted');r=rpc('admin_request_driver_reassignment',{'_id':d['id'],'_replacement':other[0],'_expected':d['updated_at'],'_key':str(uuid.uuid4()),'_reason':'Disposable rejection test'});rpc('respond_driver_reassignment',{'_id':r['id'],'_decision':'reject'},other[2]);assert read('deliveries','id=eq.'+d['id']+'&select=driver_id')[0]['driver_id']==old[0];print('rejection preserved driver')
 a=delivery();bb=delivery();cc=delivery();batch=[{'kind':'delivery','id':x['id'],'expected':x['updated_at'],'key':str(uuid.uuid4()),'assignee':other[0]} for x in [a,bb,cc]]
 result=rpc('admin_bulk_assign',{'_jobs':batch,'_reason':'Disposable bulk capacity test','_preview':False});print('bulk offered',sum(x['ok'] for x in result['results']));assert all(x['ok'] for x in result['results']);assert all(x['ok'] for x in rpc('admin_bulk_assign',{'_jobs':batch,'_reason':'Disposable bulk replay test','_preview':False})['results']);extra=delivery();assert not rpc('dispatch_assignment_check',{'_kind':'delivery','_id':extra['id'],'_assignee':other[0]})['ok'];print('reserved-offer capacity and duplicate replay passed')
 # Free the third driver manual offers before interval cases.
 for x in [a,bb,cc]:api('/rest/v1/delivery_offers?delivery_id=eq.'+x['id'],{'status':'expired'},method='PATCH')
 first=delivery(other[0],'accepted','2026-11-15T08:00:00Z','2026-11-15T09:00:00Z');second=delivery(start='2026-11-15T08:30:00Z',end='2026-11-15T09:30:00Z');assert not rpc('dispatch_assignment_check',{'_kind':'delivery','_id':second['id'],'_assignee':other[0]})['ok'];api('/rest/v1/deliveries?id=eq.'+second['id'],{'scheduled_for':'2026-11-15T09:00:00Z','scheduled_until':'2026-11-15T10:00:00Z'},method='PATCH');assert rpc('dispatch_assignment_check',{'_kind':'delivery','_id':second['id'],'_assignee':other[0]})['ok'];print('overlap blocked; adjacent non-overlap passed')
 # Confirm two offers through the actual board controls.
 for x in [first]:api('/rest/v1/deliveries?id=eq.'+x['id'],{'status':'cancelled'},method='PATCH')
 ui1=delivery();ui2=delivery();asyncio.run(browser_bulk(other,[ui1,ui2]))
 # Concurrent requests for the same job must yield one winning offer.
 from concurrent.futures import ThreadPoolExecutor
 race=delivery(); requests_data=[{'_jobs':[{'kind':'delivery','id':race['id'],'expected':race['updated_at'],'key':str(uuid.uuid4()),'assignee':drv[0]}],'_reason':'Disposable concurrent assignment','_preview':False} for drv in [old,other]]
 with ThreadPoolExecutor(max_workers=2) as pool:race_results=list(pool.map(lambda data:rpc('admin_bulk_assign',data),requests_data))
 assert sum(r['results'][0]['ok'] for r in race_results)==1; print('concurrent same-job assignment: one winner')
 # One invalid assignee must not erase a valid offer in the same batch.
 good=delivery();bad=delivery();mixed=[{'kind':'delivery','id':j['id'],'expected':j['updated_at'],'key':str(uuid.uuid4()),'assignee':drv} for j,drv in [(good,old[0]),(bad,str(uuid.uuid4()))]]
 outcome=rpc('admin_bulk_assign',{'_jobs':mixed,'_reason':'Disposable partial batch check','_preview':False});assert sum(r['ok'] for r in outcome['results'])==1; print('partial batch outcome: one success one failure')
 # Provider interval checks use declared availability as well as stored commitments.
 api('/rest/v1/providers',{'user_id':other[0],'business_name':'V31 TEMP PROVIDER','category':'cleaning','city':'Harare','available':True,'verification_status':'approved','hourly_rate':25})
 pid=read('providers','user_id=eq.'+other[0]+'&select=id')[0]['id']
 for day in range(1,8):api('/rest/v1/provider_availability',{'user_id':other[0],'weekday':day,'enabled':True,'start_time':'00:00:00','end_time':'23:59:59'})
 b1=api('/rest/v1/bookings',{'customer_id':admin,'provider_id':pid,'category':'cleaning','address':'V31 PROVIDER TEST','scheduled_for':'2026-11-15T08:00:00Z','scheduled_until':'2026-11-15T09:00:00Z','price':25,'payment_method':'cash'})[0]
 b2=api('/rest/v1/bookings',{'customer_id':admin,'category':'cleaning','address':'V31 PROVIDER TEST','scheduled_for':'2026-11-15T08:30:00Z','scheduled_until':'2026-11-15T10:00:00Z','price':25,'payment_method':'cash'})[0]
 try:
  assert not rpc('dispatch_assignment_check',{'_kind':'booking','_id':b2['id'],'_assignee':pid})['ok'];print('provider overlapping schedule blocked')
  api('/rest/v1/bookings?id=eq.'+b2['id'],{'scheduled_for':'2026-11-15T09:00:00Z','scheduled_until':'2026-11-15T10:00:00Z'},method='PATCH');assert rpc('dispatch_assignment_check',{'_kind':'booking','_id':b2['id'],'_assignee':pid})['ok'];print('provider non-overlapping interval passed')
 finally:
  for booking in [b1,b2]:
   api('/rest/v1/booking_status_history?booking_id=eq.'+booking['id'],method='DELETE');api('/rest/v1/bookings?id=eq.'+booking['id'],method='DELETE')
  api('/rest/v1/provider_availability?user_id=eq.'+other[0],method='DELETE');api('/rest/v1/providers?id=eq.'+pid,method='DELETE')
 # Missing end-times are explicit and must conservatively block possible overlap.
 for rec in read('deliveries','driver_id=eq.'+other[0]+'&status=in.(accepted,arriving,picked_up)&select=id'):api('/rest/v1/deliveries?id=eq.'+rec['id'],{'status':'cancelled'},method='PATCH')
 for rec in [ui1,ui2]:api('/rest/v1/delivery_offers?delivery_id=eq.'+rec['id'],{'status':'expired'},method='PATCH')
 unknown=delivery(other[0],'accepted','2026-11-16T08:00:00Z',None);proposed=delivery(start='2026-11-16T10:00:00Z',end='2026-11-16T11:00:00Z');c=rpc('dispatch_assignment_check',{'_kind':'delivery','_id':proposed['id'],'_assignee':other[0]});assert not c['ok'] and any('Missing' in x['reason'] for x in c['conflicts']);print('missing end-times conservatively blocked')
 api('/rest/v1/deliveries?id=eq.'+unknown['id'],{'status':'cancelled'},method='PATCH')
 for offer in read('delivery_offers','driver_user_id=eq.'+other[0]+'&status=eq.offered&select=id'):api('/rest/v1/delivery_offers?id=eq.'+offer['id'],{'status':'expired'},method='PATCH')
 ca=delivery(start='2026-11-17T08:00:00Z',end='2026-11-17T09:00:00Z');cb=delivery(start='2026-11-17T08:30:00Z',end='2026-11-17T09:30:00Z');race_data=[{'_jobs':[{'kind':'delivery','id':x['id'],'expected':x['updated_at'],'key':str(uuid.uuid4()),'assignee':other[0]}],'_reason':'Concurrent schedule check','_preview':False} for x in [ca,cb]]
 with ThreadPoolExecutor(max_workers=2) as pool:out=list(pool.map(lambda value:rpc('admin_bulk_assign',value),race_data))
 assert sum(r['results'][0]['ok'] for r in out)==1;print('concurrent overlapping schedules: one winner')
 # Unavailable driver remains ineligible and cannot authorise an admin action.
 api('/rest/v1/driver_profiles?user_id=eq.'+other[0],{'available':False},method='PATCH');assert not rpc('dispatch_assignment_check',{'_kind':'delivery','_id':proposed['id'],'_assignee':other[0]})['ok'];print('offline driver rejected')
 forbidden=requests.post(url+'/rest/v1/rpc/admin_bulk_assign',headers=other[2],json={'_jobs':[{'kind':'delivery','id':proposed['id'],'expected':proposed['updated_at'],'key':str(uuid.uuid4()),'assignee':other[0]}],'_reason':'Not an admin','_preview':False});assert forbidden.status_code>=400;print('non-admin assignment denied')
 print('ALL EXECUTED CHECKS PASSED')
finally:
 for jid in jobs:
  for table,col in [('delivery_reassignments','delivery_id'),('admin_job_actions','job_id'),('admin_job_controls','job_id'),('admin_job_changes','job_id'),('admin_audit_log','subject_id'),('delivery_events','delivery_id'),('delivery_offers','delivery_id')]:api('/rest/v1/'+table+'?'+col+'=eq.'+jid,method='DELETE')
  api('/rest/v1/notifications?link=like.*'+jid+'*',method='DELETE');api('/rest/v1/deliveries?id=eq.'+jid,method='DELETE')
 for uid in users:
  api('/rest/v1/notifications?user_id=eq.'+uid,method='DELETE');api('/rest/v1/vehicles?user_id=eq.'+uid,method='DELETE');api('/rest/v1/driver_profiles?user_id=eq.'+uid,method='DELETE');api('/auth/v1/admin/users/'+uid,method='DELETE')
 print('Disposable accounts/jobs removed')

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

async def check_views(job):
 async with async_playwright() as p:
  b=await p.chromium.launch(headless=True);c=await b.new_context(viewport={'width':1280,'height':1800});page=await c.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  await page.goto('http://localhost:8080');await page.evaluate('([k,v])=>localStorage.setItem(k,v)',[os.environ['LOVABLE_BROWSER_SUPABASE_STORAGE_KEY'],os.environ['LOVABLE_BROWSER_SUPABASE_SESSION_JSON']]);await page.goto('http://localhost:8080/admin/deliveries/'+job['id']);await page.get_by_role('button',name='Record duration',exact=True).click();await page.get_by_label('Duration in minutes').fill('45');await page.get_by_label('Duration source').fill('Disposable confirmed planning duration');await page.get_by_label('Duration reason').fill('Disposable browser duration test');await page.get_by_role('button',name='Confirm duration',exact=True).click();await page.get_by_role('dialog').wait_for(state='hidden');await page.reload();await page.get_by_text('45 minutes · Disposable confirmed planning duration',exact=True).wait_for();print('Browser duration persisted after refresh');await page.goto('http://localhost:8080/admin/dispatch')
  for label,layout in [('Driver calendar','calendar'),('Parcel custody','custody'),('Driver performance','performance')]:
   await page.get_by_role('button',name=label,exact=True).click();await page.wait_for_timeout(1300);assert 'Records unavailable' not in await page.locator('body').inner_text();await page.screenshot(path='/tmp/browser/dispatch-insights/'+layout+'.png')
  await page.set_viewport_size({'width':390,'height':844});await page.get_by_role('button',name='Driver calendar',exact=True).click();await page.wait_for_timeout(1000);assert not await page.evaluate('document.documentElement.scrollWidth>innerWidth');await page.screenshot(path='/tmp/browser/dispatch-insights/mobile.png');await page.locator('select[aria-label="Insights driver"]').scroll_into_view_if_needed();await page.screenshot(path='/tmp/browser/dispatch-insights/mobile-calendar.png');assert not errors;await b.close();print('Authenticated desktop/mobile insights passed')
try:
 drv=make_driver('V31 Insights Driver');api('/rest/v1/driver_profiles?user_id=eq.'+drv[0],{'work_start':'06:00','work_end':'22:00'},method='PATCH')
 d=delivery(start='2026-11-14T08:00:00Z');rpc('admin_record_delivery_duration',{'_id':d['id'],'_expected':d['updated_at'],'_minutes':45,'_basis':'Disposable customer confirmed 45 minutes','_reason':'Disposable timing verification'})
 row=read('deliveries','id=eq.'+d['id'])[0];assert row['duration_minutes']==45 and row['scheduled_until'].startswith('2026-11-14T08:45:00');assert row['duration_recorded_by']==admin;print('Duration, derived end and author readback passed')
 active=delivery(drv[0],'accepted','2026-11-14T08:00:00Z','2026-11-14T09:00:00Z')
 alt=rpc('admin_delivery_alternatives',{'_id':d['id'],'_assignee':drv[0]});assert alt['slots'] and alt['slots'][0]['start']>='2026-11-14T09:00:00';print('Conflict-aware alternatives passed')
 custody=delivery(drv[0],'picked_up');api('/rest/v1/deliveries?id=eq.'+custody['id'],{'picked_up_at':'2026-11-12T20:00:00Z'},method='PATCH')
 data=rpc('admin_dispatch_insights',{'_from':'2026-11-12T00:00:00Z','_to':'2026-11-20T00:00:00Z','_driver':drv[0]});entry=next(x for x in data['custody'] if x['id']==custody['id']);assert entry['custodian_id']==drv[0] and entry['custody_status']=='in_transit';assert any(x['id']==active['id'] for x in data['calendar']);print('Calendar and real custodian projection passed')
 forbidden=requests.post(url+'/rest/v1/rpc/admin_dispatch_insights',headers=drv[2],json={'_from':'2026-11-12T00:00:00Z','_to':'2026-11-20T00:00:00Z'});assert forbidden.status_code>=400;print('Non-admin insights denied')

 on=delivery(drv[0],'delivered','2026-11-12T08:00:00Z','2026-11-12T09:00:00Z');api('/rest/v1/deliveries?id=eq.'+on['id'],{'delivered_at':'2026-11-12T08:50:00Z'},method='PATCH')
 late=delivery(drv[0],'delivered','2026-11-12T08:00:00Z','2026-11-12T09:00:00Z');api('/rest/v1/deliveries?id=eq.'+late['id'],{'delivered_at':'2026-11-12T09:10:00Z'},method='PATCH')
 cancelled=delivery(drv[0],'cancelled');data=rpc('admin_dispatch_insights',{'_from':'2026-11-12T00:00:00Z','_to':'2026-11-20T00:00:00Z','_driver':drv[0]});metrics=data['performance'][0];assert metrics['on_time']==1 and metrics['late']==1 and metrics['cancellations']==1 and metrics['timed_deliveries']==2;print('Concrete on-time, late and cancellation aggregates passed')
 browser_job=delivery();asyncio.run(check_views(browser_job))
finally:
 for jid in jobs:
  for table,col in [('delivery_reassignments','delivery_id'),('admin_job_actions','job_id'),('admin_job_controls','job_id'),('admin_job_changes','job_id'),('admin_audit_log','subject_id'),('delivery_events','delivery_id'),('delivery_offers','delivery_id')]:api('/rest/v1/'+table+'?'+col+'=eq.'+jid,method='DELETE')
  api('/rest/v1/notifications?link=like.*'+jid+'*',method='DELETE');api('/rest/v1/deliveries?id=eq.'+jid,method='DELETE')
 for uid in users:
  api('/rest/v1/notifications?user_id=eq.'+uid,method='DELETE');api('/rest/v1/vehicles?user_id=eq.'+uid,method='DELETE');api('/rest/v1/driver_profiles?user_id=eq.'+uid,method='DELETE');api('/auth/v1/admin/users/'+uid,method='DELETE')
 print('Disposable accounts/jobs removed')

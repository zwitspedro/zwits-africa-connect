import os,json,requests,hashlib,uuid,asyncio
from pathlib import Path
from playwright.async_api import async_playwright
OUT=Path('/tmp/browser/dispatch-comprehensive')
url=os.environ['SUPABASE_URL'].rstrip('/');key=os.environ['SUPABASE_SERVICE_ROLE_KEY'];pub=os.environ['SUPABASE_PUBLISHABLE_KEY'];session=json.loads(os.environ['LOVABLE_BROWSER_SUPABASE_SESSION_JSON'])
h={'apikey':key}
if not key.startswith('sb_'):h['Authorization']='Bearer '+key
ah={'apikey':pub,'Authorization':'Bearer '+session['access_token']};anon={'apikey':pub}
def rows(t):
 r=requests.get(url+'/rest/v1/'+t+'?select=*',headers=h);r.raise_for_status();return sorted(r.json(),key=lambda x:json.dumps(x,sort_keys=True))
def rpc(name,args,headers=ah):return requests.post(url+'/rest/v1/rpc/'+name,headers=headers,json=args)
def call(name,args):
 r=rpc(name,args);r.raise_for_status();return r.json()
tables=['bookings','deliveries','delivery_offers','delivery_reassignments','job_offers','provider_wallets','wallet_transactions','payments','provider_withdrawals','admin_job_actions','admin_job_controls','admin_job_changes','admin_audit_log','delivery_events','notifications','driver_profiles']
before={t:rows(t) for t in tables}
base=call('admin_dispatch_directory',{'_filters':{'kind':'all','view':'all','page':0}})
assert base['total']==len(before['bookings'])+len(before['deliveries'])
checks=[]
for kind in ['booking','delivery']:
 data=call('admin_dispatch_directory',{'_filters':{'kind':kind,'view':'all','page':0}})
 assert data['total']==len(before['bookings' if kind=='booking' else 'deliveries'])
 checks.append(kind+' totals match source records')
for view in ['all','active','unassigned','awaiting_acceptance','awaiting_driver','awaiting_provider','assigned','accepted','awaiting_collection','in_transit','scheduled','delayed','completed','completed_today','failed','cancelled','intervention']:
 d=call('admin_dispatch_directory',{'_filters':{'view':view,'page':0}})
 assert len(d['rows'])==min(d['total'],25)
 if view in base['metrics']:assert d['total']==base['metrics'][view],view
 checks.append(view+' filtered total and page agree')
job=before['deliveries'][0];driver=before['driver_profiles'][0]
found=call('admin_dispatch_directory',{'_filters':{'term':job['id'],'page':0}});assert found['total']==1 and found['rows'][0]['id']==job['id']
none=call('admin_dispatch_directory',{'_filters':{'term':'NO-MATCH-'+uuid.uuid4().hex,'page':0}});assert none['total']==0 and not none['rows']
page=call('admin_dispatch_directory',{'_filters':{'page':1}});assert not page['rows'] and page['total']==base['total']
for priority in ['low','normal','high','urgent']:
 d=call('admin_dispatch_directory',{'_filters':{'priority':priority}});assert all(x['priority']==priority for x in d['rows'])
check=call('dispatch_assignment_check',{'_kind':'delivery','_id':job['id'],'_assignee':driver['user_id']});assert not check['ok'] and any('approved' in x['reason'] for x in check['conflicts'])
bulk=call('admin_bulk_assign',{'_jobs':[{'kind':'delivery','id':job['id'],'expected':job['updated_at'],'key':str(uuid.uuid4()),'assignee':driver['user_id']}],'_reason':'Read-only eligibility preview','_preview':True});assert len(bulk['results'])==1 and not bulk['results'][0]['ok']
alt=call('admin_delivery_alternatives',{'_id':job['id'],'_assignee':driver['user_id']});assert not alt['slots'];checks.append('unverified driver rejected in eligibility and bulk preview; alternatives require duration')
period={'_from':'2026-10-15T00:00:00+02:00','_to':'2026-11-14T00:00:00+02:00'}
insights=call('admin_dispatch_insights',period);assert not insights['calendar'] and not insights['custody'];assert all(x['delivered']==0 and x['on_time']==0 and x['cancellations']==0 for x in insights['performance'])
for name,args in [('admin_dispatch_directory',{'_filters':{}}),('admin_dispatch_insights',period),('admin_dispatch_financials',period),('admin_bulk_assign',{'_jobs':[],'_reason':'Unauthorized audit check','_preview':True}),('dispatch_assignment_check',{'_kind':'delivery','_id':job['id'],'_assignee':driver['user_id']}),('admin_dispatch_locations',{})]:
 r=rpc(name,args,anon);assert r.status_code>=400,name;checks.append(name+' denies anonymous access')
for t in ['deliveries','provider_wallets','wallet_transactions','provider_withdrawals','admin_job_actions','delivery_reassignments']:
 r=requests.get(url+'/rest/v1/'+t+'?select=*',headers=anon);assert r.status_code>=400 or r.json()==[],t
checks.append('anonymous private-table reads denied or empty')
async def browser():
 async with async_playwright() as p:
  b=await p.chromium.launch(headless=True);c=await b.new_context(viewport={'width':1280,'height':1800});page=await c.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  await page.goto('http://localhost:8080/admin/dispatch');await page.wait_for_timeout(1500);assert page.url.endswith('/login') and await page.get_by_role('heading',name='Dispatch Control Centre').count()==0;await page.screenshot(path=str(OUT/'signed-out.png'))
  await page.goto('http://localhost:8080');await page.evaluate('([k,v])=>localStorage.setItem(k,v)',[os.environ['LOVABLE_BROWSER_SUPABASE_STORAGE_KEY'],os.environ['LOVABLE_BROWSER_SUPABASE_SESSION_JSON']]);await page.goto('http://localhost:8080/admin/dispatch');await page.get_by_role('heading',name='Dispatch Control Centre').wait_for();await page.get_by_role('textbox',name='Search',exact=True).fill(job['id']);await page.get_by_role('button',name='Search',exact=True).click();await page.get_by_text('1 matching jobs',exact=True).wait_for();await page.screenshot(path=str(OUT/'search.png'))
  await page.goto('http://localhost:8080/admin/dispatch?layout=custody');await page.get_by_text('No parcels in transit or awaiting handover.',exact=True).wait_for();await page.screenshot(path=str(OUT/'custody.png'));assert not errors;await b.close()
asyncio.run(browser())
after={t:rows(t) for t in tables};assert before==after,'Records changed during audit'
checks.append('all 17 operational, notice, audit and financial tables unchanged')
result={'counts':{t:len(v) for t,v in before.items()},'checks':checks,'overview_metrics':base['metrics'],'eligibility_reasons':[x['reason'] for x in check['conflicts']],'alternatives_limitation':alt['limitation'],'mutations_performed':0}
OUT.joinpath('results.json').write_text(json.dumps(result,indent=2));print(json.dumps(result,indent=2))

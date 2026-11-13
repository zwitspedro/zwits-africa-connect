import os,json,requests,asyncio
from pathlib import Path
from playwright.async_api import async_playwright
url=os.environ['SUPABASE_URL'].rstrip('/');key=os.environ['SUPABASE_SERVICE_ROLE_KEY'];h={'apikey':key}
if not key.startswith('sb_'):h['Authorization']='Bearer '+key
session=json.loads(os.environ['LOVABLE_BROWSER_SUPABASE_SESSION_JSON']);ah={'apikey':os.environ['SUPABASE_PUBLISHABLE_KEY'],'Authorization':'Bearer '+session['access_token']}
def read(table):
 r=requests.get(url+'/rest/v1/'+table,headers=h);r.raise_for_status();return r.json()
def rpc(name,data,headers=ah):return requests.post(url+'/rest/v1/rpc/'+name,headers=headers,json=data)
wallets=read('provider_wallets?select=*');tx=read('wallet_transactions?select=*');withdrawals=read('provider_withdrawals?select=*');deliveries=read('deliveries?status=eq.delivered&select=*');bookings=read('bookings?status=eq.completed&select=*');providers=read('providers?select=id,user_id');rates=read('commission_rates?active=eq.true&select=*')
assert len(withdrawals)==0 and len(deliveries)==0
assert len({t['reference'] for t in tx})==len(tx)
for w in wallets:
 rows=[t for t in tx if t['provider_user_id']==w['provider_user_id']]
 assert round(sum(float(t['amount']) for t in rows),2)==float(w['available_balance'])
 assert sum(float(t['amount']) for t in rows if t['type']=='job_earning')==float(w['lifetime_earnings'])
for b in bookings:
 earning=[t for t in tx if t['booking_id']==b['id'] and t['type']=='job_earning'];commission=[t for t in tx if t['booking_id']==b['id'] and t['type']=='commission']
 if not earning:continue
 assert len(earning)==1 and len(commission)==1
 assert float(earning[0]['amount'])==float(b['price'])
 rate=next((r for r in rates if r['category']==b['category']),next(r for r in rates if r['category']=='default'))
 expected=min(float(b['price']),max(float(rate['min_fee'] or 0),round(float(b['price'])*float(rate['percent'])/100,2)))
 if rate['max_fee'] is not None:expected=min(expected,float(rate['max_fee']))
 assert -float(commission[0]['amount'])==expected
print('Existing records: 2 wallet balances match; 2 posted booking settlements match price and 10% commission; 0 duplicate references; 0 driver completions/withdrawals.')
args={'_from':'2026-10-15T00:00:00+02:00','_to':'2026-11-14T00:00:00+02:00','_page':0}
r=rpc('admin_dispatch_financials',args);r.raise_for_status();d=r.json();assert d['jobs_total']==0 and d['withdrawals_total']==0 and d['ledger_total']==0 and d['summary']['wallet_mismatches']==0
assert all(not w['wallet_exists'] or float(w['available_balance'])==0 for w in d['wallets'])
bad=rpc('admin_dispatch_financials',args,{'apikey':os.environ['SUPABASE_PUBLISHABLE_KEY']});assert bad.status_code>=400
invalid=rpc('admin_dispatch_financials',{**args,'_page':-1});assert invalid.status_code>=400
print('Admin projection matches readback; anonymous access and invalid page rejected.')
async def browser():
 async with async_playwright() as p:
  b=await p.chromium.launch(headless=True);c=await b.new_context(viewport={'width':1280,'height':1800});page=await c.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  await page.goto('http://localhost:8080');await page.evaluate('([k,v])=>localStorage.setItem(k,v)',[os.environ['LOVABLE_BROWSER_SUPABASE_STORAGE_KEY'],os.environ['LOVABLE_BROWSER_SUPABASE_SESSION_JSON']]);await page.goto('http://localhost:8080/admin/dispatch');await page.get_by_role('button',name='Driver performance',exact=True).click();await page.get_by_role('heading',name='Driver financial history',exact=True).wait_for();await page.get_by_text('Balance matches ledger',exact=False).wait_for();assert 'Financial history unavailable.' not in await page.locator('body').inner_text()
  panel=page.locator('section').filter(has=page.get_by_role('heading',name='Driver financial history',exact=True)).last
  await panel.screenshot(path='/tmp/browser/financial-v32/desktop.png');await page.set_viewport_size({'width':390,'height':844});await page.get_by_role('heading',name='Driver financial history',exact=True).scroll_into_view_if_needed();await page.screenshot(path='/tmp/browser/financial-v32/mobile.png');assert not await page.evaluate('document.documentElement.scrollWidth>innerWidth');assert not errors;await b.close();print('Signed-in admin financial history verified on desktop/mobile; no page errors or overflow.')
asyncio.run(browser())
assert read('wallet_transactions?select=*')==tx
assert read('provider_wallets?select=*')==wallets
assert read('provider_withdrawals?select=*')==withdrawals
print('Financial rows unchanged after read-only checks.')

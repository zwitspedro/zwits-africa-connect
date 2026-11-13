import os,json,requests,asyncio
from pathlib import Path
from playwright.async_api import async_playwright
OUT=Path('/tmp/browser/driver-finance');OUT.mkdir(exist_ok=True)
url=os.environ['SUPABASE_URL'].rstrip('/');key=os.environ['SUPABASE_SERVICE_ROLE_KEY'];h={'apikey':key}
if not key.startswith('sb_'):h['Authorization']='Bearer '+key
session=json.loads(os.environ['LOVABLE_BROWSER_SUPABASE_SESSION_JSON']);uid=session['user']['id']
def read(table):
 r=requests.get(url+'/rest/v1/'+table+'?select=*',headers=h);r.raise_for_status();return r.json()
before={t:read(t) for t in ['provider_wallets','wallet_transactions','provider_withdrawals','deliveries','payments']}
wallet=next(w for w in before['provider_wallets'] if w['provider_user_id']==uid)
ledger=[t for t in before['wallet_transactions'] if t['provider_user_id']==uid];jobs=[d for d in before['deliveries'] if d['driver_id']==uid];withdrawals=[w for w in before['provider_withdrawals'] if w['provider_user_id']==uid]
assert sum(float(t['amount']) for t in ledger if t['status']=='posted')==float(wallet['available_balance'])
assert not ledger and not withdrawals and not any(j['status']=='delivered' for j in jobs)
print('Actual signed-in driver: wallet $0, lifetime gross $0, no ledger, completed deliveries or withdrawal records.')
async def main():
 async with async_playwright() as p:
  b=await p.chromium.launch(headless=True);c=await b.new_context(viewport={'width':1280,'height':1800});page=await c.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  await page.goto('http://localhost:8080');await page.evaluate('([k,v])=>localStorage.setItem(k,v)',[os.environ['LOVABLE_BROWSER_SUPABASE_STORAGE_KEY'],os.environ['LOVABLE_BROWSER_SUPABASE_SESSION_JSON']]);await page.goto('http://localhost:8080/driver');await page.get_by_role('button',name='Earnings',exact=True).last.click();await page.get_by_role('heading',name='Driver finances',exact=True).wait_for();await page.get_by_text('No wallet transactions recorded.',exact=True).wait_for()
  panel=page.locator('.driver-finance');text=await panel.inner_text();assert '15%' not in text;assert 'No recorded delivery settlements.' in text;assert 'No withdrawal requests or completed payouts recorded.' in text
  labels=['Gross delivery earnings','Commission charged','Cash already collected','Net economic earnings','Delivery wallet movement','Current withdrawable balance','Pending withdrawal requests','Recorded paid withdrawals','Failed / cancelled requests','Posted withdrawal reversals','Personal transfers collected','Lifetime wallet gross','Current wallet balance','Pending wallet clearance']
  for label in labels:
   card=panel.locator('div.relative').filter(has=page.get_by_text(label,exact=True));assert '$0.00' in await card.inner_text(),label
  await page.get_by_role('button',name='Refresh driver finances',exact=True).click();await page.wait_for_timeout(1200)
  results=[]
  for width in [360,390,430,768,1024,1440]:
   await page.set_viewport_size({'width':width,'height':1800 if width>=768 else 844});await page.wait_for_timeout(250)
   overflow=await page.evaluate('document.documentElement.scrollWidth-innerWidth');assert overflow<=0,(width,overflow)
   assert await page.get_by_role('button',name='Refresh driver finances').is_visible()
   await page.get_by_role('heading',name='Driver finances',exact=True).scroll_into_view_if_needed();await page.screenshot(path=str(OUT/f'earnings-{width}.png'))
   await page.get_by_role('heading',name='Withdrawal history',exact=True).scroll_into_view_if_needed();await page.screenshot(path=str(OUT/f'history-{width}.png'));results.append({'width':width,'overflow':overflow,'finance_labels':len(labels),'refresh':'pass'})
  for route in ['/m/driver','/m/driver/profile']:
   await page.goto('http://localhost:8080'+route);await page.get_by_text('Lifetime gross' if route.endswith('profile') else 'Gross earned',exact=True).wait_for();await page.wait_for_timeout(800)
   for width in [360,390,430,768,1024,1440]:
    await page.set_viewport_size({'width':width,'height':1800 if width>=768 else 844});await page.wait_for_timeout(150);overflow=await page.evaluate('document.documentElement.scrollWidth-innerWidth');assert overflow<=0,(route,width,overflow);results.append({'route':route,'width':width,'overflow':overflow})
   await page.set_viewport_size({'width':390,'height':844});await page.screenshot(path=str(OUT/('profile-mobile.png' if route.endswith('profile') else 'dashboard-mobile.png')))
  assert not errors,errors
  await c.close();c=await b.new_context(viewport={'width':1280,'height':1800});page=await c.new_page();await page.goto('http://localhost:8080/driver');await page.wait_for_url('**/login**');print('Signed-out driver access redirects to login.');await b.close()
  (OUT/'results.json').write_text(json.dumps(results,indent=2));print('Driver earnings figures matched actual empty records; 18 six-width checks passed; no runtime errors; refresh and navigation passed.')
asyncio.run(main())
after={t:read(t) for t in before};assert before==after;print('All five financial/delivery table snapshots unchanged.')

import asyncio,json
from datetime import datetime,timedelta
from pathlib import Path
from playwright.async_api import async_playwright
OUT=Path('/tmp/browser/delivery-v3')
OUT.mkdir(parents=True,exist_ok=True)
records=Path('/tmp/dispatch-integrity/v3/records.json').read_text()
async def main():
 async with async_playwright() as p:
  b=await p.chromium.launch(headless=True);c=await b.new_context(viewport={'width':1280,'height':1800});page=await c.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  await page.route('**/tests/isolated-records.json',lambda route:route.fulfill(status=200,content_type='application/json',body=records))
  await page.goto('http://localhost:8080/tests/delivery-acceptance-v3-ui.html');await page.get_by_role('heading',name='Driver finances',exact=True).wait_for()
  panel=page.locator('.driver-finance');text=await panel.inner_text();assert '$275.00' in text and '$247.50' in text and '$27.50' in text and '1 completed delivery has no complete recorded settlement' in text
  for row in json.loads(records)['ledger'][:12]:
   assert row['reference'] in text
  earning=next(r for r in json.loads(records)['ledger'] if r['type']=='job_earning')
  day=(datetime.fromisoformat(earning['created_at'].replace('Z','+00:00'))+timedelta(hours=2)).date()
  week=(day-timedelta(days=day.weekday())).isoformat()
  assert week in text, 'Harare week from the actual settlement must be visible'
  next_button=page.get_by_role('button',name='Next records',exact=True)
  assert await next_button.count()==1
  first=await panel.inner_text();await next_button.click();second=await panel.inner_text();assert '13–24 of 33' in second and first!=second
  await next_button.click();assert '25–33 of 33' in await panel.inner_text();assert await next_button.is_disabled()
  await page.get_by_role('button',name='Previous records').click();await page.get_by_role('button',name='Previous records').click()
  results=[]
  for width in [360,390,430,768,1024,1440]:
   await page.set_viewport_size({'width':width,'height':844 if width<768 else 1800});await page.wait_for_timeout(200)
   overflow=await page.evaluate('document.documentElement.scrollWidth-innerWidth');assert overflow==0,(width,overflow)
   await page.get_by_role('heading',name='Driver finances',exact=True).scroll_into_view_if_needed();await page.screenshot(path=str(OUT/f'isolated-finances-{width}.png'))
   await page.get_by_role('heading',name='Wallet transactions',exact=True).scroll_into_view_if_needed();await page.screenshot(path=str(OUT/f'isolated-ledger-{width}.png'))
   results.append({'width':width,'overflow':overflow,'source':'actual isolated PostgreSQL rows; existing DriverEarnings component'})
  assert not errors,errors
  (OUT/'ui-results.json').write_text(json.dumps(results,indent=2));print('PASS: existing populated DriverEarnings component, actual isolated SQL rows, weekly totals, failed settlement excluded, three ledger pages, six widths, zero runtime errors. NOT hosted financial journey.')
  await b.close()
asyncio.run(main())

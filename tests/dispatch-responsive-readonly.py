import asyncio,json,os,re
from pathlib import Path
from playwright.async_api import async_playwright
OUT=Path('/tmp/browser/dispatch-responsive')
OUT.mkdir(parents=True,exist_ok=True)
async def safe_dialog(page,name,w):
 d=page.get_by_role('dialog').last
 await d.wait_for();await page.wait_for_timeout(400)
 assert await d.evaluate('(e)=>e.scrollWidth<=e.clientWidth+1'),name+' dialog overflow'
 close=d.get_by_role('button',name='Close dialog');await close.click()
async def main():
 async with async_playwright() as p:
  b=await p.chromium.launch(headless=True);c=await b.new_context(viewport={'width':1280,'height':1800});page=await c.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  cookies=json.loads(os.environ.get('LOVABLE_BROWSER_SUPABASE_COOKIES_JSON') or '[]')
  if cookies:await c.add_cookies([{**v,'url':'http://localhost:8080'} for v in cookies])
  await page.goto('http://localhost:8080');await page.evaluate('([k,v])=>localStorage.setItem(k,v)',[os.environ['LOVABLE_BROWSER_SUPABASE_STORAGE_KEY'],os.environ['LOVABLE_BROWSER_SUPABASE_SESSION_JSON']])
  results=[]
  for w in [360,390,430,768,1024,1440]:
   await page.set_viewport_size({'width':w,'height':844 if w<768 else 900});await page.goto('http://localhost:8080/admin/dispatch');await page.get_by_role('heading',name='Dispatch Control Centre').wait_for()
   if w<640:
    await page.get_by_role('button',name='More overview').click();assert await page.get_by_role('button',name='Less overview').is_visible();await page.get_by_role('button',name='Less overview').click()
    await page.get_by_role('button',name='Filters',exact=True).click();assert await page.get_by_label('Created from',exact=True).is_visible();await page.get_by_role('button',name='Filters',exact=True).click()
   checks=page.get_by_role('checkbox');await checks.first.wait_for();assert await checks.first.locator('..').evaluate('(e)=>e.clientWidth>=44&&e.clientHeight>=44');await checks.first.check()
   await page.get_by_role('button',name='Bulk Assign (1)').click();await page.get_by_role('heading',name='Bulk Assignment Review').wait_for();await page.get_by_label('Bulk assignment reason').fill('Read-only layout inspection; no offer sent');await safe_dialog(page,'bulk',w)
   await page.get_by_role('button',name='Actions (1)',exact=True).click();await page.get_by_role('heading',name='Review batch actions').wait_for();await safe_dialog(page,'batch',w)
   await page.get_by_role('button',name='Clear selection',exact=True).click()
   job=page.locator('article').filter(has=page.get_by_role('button')).first;await job.get_by_role('button').first.click();await page.get_by_role('heading',name='Operational control',exact=True).wait_for()
   await page.get_by_role('button',name='Internal note',exact=True).click();await page.get_by_label('Recorded reason',exact=True).fill('No changes submitted');await safe_dialog(page,'note',w)
   assign=page.get_by_role('button',name='Assign / reassign offer',exact=True)
   assignment=False
   if await assign.count():
    await assign.click();await page.get_by_label('Eligible provider or driver').wait_for();await safe_dialog(page,'assignment',w);assignment=True
   await page.get_by_role('link',name='Full investigation',exact=True).click();await page.get_by_role('heading',name=re.compile('booking investigation',re.I)).wait_for();assert await page.locator('nav[aria-label="Admin sections"]').count()>0
   assert not await page.evaluate('document.documentElement.scrollWidth>innerWidth')
   await page.goto('http://localhost:8080/admin/dispatch?layout=calendar');await page.get_by_label('Insights driver').wait_for();await page.wait_for_timeout(800)
   panel=page.locator('section').filter(has=page.get_by_label('Insights driver')).last;await panel.scroll_into_view_if_needed();await page.screenshot(path=str(OUT/f'calendar-{w}.png'))
   await page.goto('http://localhost:8080/admin/dispatch?layout=performance');await page.get_by_text('Balance matches ledger',exact=False).wait_for();await page.get_by_role('heading',name='Driver financial history').scroll_into_view_if_needed();await page.screenshot(path=str(OUT/f'financial-{w}.png'));assert not await page.evaluate('document.documentElement.scrollWidth>innerWidth')
   await page.goto('http://localhost:8080/admin/dispatch?layout=map');await page.get_by_role('button',name='Zoom in').first.wait_for();await page.get_by_role('button',name='Zoom in').first.click();assert await page.get_by_role('button',name='Zoom in').first.evaluate('(e)=>e.clientHeight>=44');await page.get_by_label('Filtered job locations').scroll_into_view_if_needed();await page.screenshot(path=str(OUT/f'map-{w}.png'))
   await page.goto('http://localhost:8080/admin/dispatch-drivers');await page.get_by_role('heading',name='Driver operations').wait_for();link=page.locator('main article a').first;await link.click();await page.get_by_role('heading',name='Verification applications').wait_for();assert not await page.evaluate('document.documentElement.scrollWidth>innerWidth')
   if w<1024:
    await page.get_by_role('button',name='Open admin navigation').click();await page.get_by_role('navigation',name='Admin sections').get_by_role('link',name='Dispatch',exact=True).click();await page.get_by_role('heading',name='Dispatch Control Centre').wait_for()
   await page.goto('http://localhost:8080/admin/dispatch?view=unassigned');await page.get_by_role('heading',name='Dispatch Control Centre').wait_for();await page.locator('main article').first.get_by_role('button').first.click();await page.get_by_role('heading',name='Operational control',exact=True).wait_for();await page.get_by_role('button',name='Assign / reassign offer',exact=True).click();await page.get_by_label('Eligible provider or driver').wait_for();await page.get_by_role('dialog').last.screenshot(path=str(OUT/f'assignment-{w}.png'));await safe_dialog(page,'assignment',w);assignment=True
   results.append({'width':w,'navigation':True,'bulk_form':True,'batch_form':True,'job_note_form':True,'assignment_form':assignment,'calendar':True,'wallet':True,'map_zoom':True,'driver_detail':True})
  assert not errors,errors
  OUT.joinpath('controls.json').write_text(json.dumps(results,indent=2));print(json.dumps(results));await b.close()
asyncio.run(main())

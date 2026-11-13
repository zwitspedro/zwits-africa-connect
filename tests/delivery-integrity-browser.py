import os,json,uuid,asyncio,requests
from pathlib import Path
from PIL import Image
from playwright.async_api import async_playwright
url=os.environ['SUPABASE_URL'].rstrip('/');key=os.environ['SUPABASE_SERVICE_ROLE_KEY'];pub=os.environ['SUPABASE_PUBLISHABLE_KEY'];h={'apikey':key,'Content-Type':'application/json','Prefer':'return=representation'}
if not key.startswith('sb_'):h['Authorization']='Bearer '+key
users=[];jobs=[];paths=[]
def api(path,data=None,method='POST',headers=h,ok=True):
 r=requests.request(method,url+path,headers=headers,json=data)
 if ok:r.raise_for_status()
 return r.json() if r.content else None
before={t:api('/rest/v1/'+t+'?select=*',method='GET') for t in ['wallet_transactions','provider_wallets','payments','bookings']}
def user(role):
 pw=uuid.uuid4().hex+'Aa1!';email='integrity-'+uuid.uuid4().hex+'@example.com'
 u=api('/auth/v1/admin/users',{'email':email,'password':pw,'email_confirm':True});users.append(u['id']);api('/rest/v1/user_roles',{'user_id':u['id'],'role':role},ok=False)
 s=api('/auth/v1/token?grant_type=password',{'email':email,'password':pw},headers={'apikey':pub,'Content-Type':'application/json'});return u['id'],s
async def main(driver,session,j):
 Image.new('RGB',(600,400),(30,130,70)).save('/tmp/browser/delivery-integrity/proof.jpg')
 async with async_playwright() as p:
  b=await p.chromium.launch(headless=True);c=await b.new_context(viewport={'width':1280,'height':1800});page=await c.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  await page.goto('http://localhost:8080');await page.evaluate('([k,v])=>localStorage.setItem(k,v)',[os.environ['LOVABLE_BROWSER_SUPABASE_STORAGE_KEY'],json.dumps(session)])
  await page.goto('http://localhost:8080/driver');await page.get_by_role('button',name='Confirm pickup',exact=True).click();await page.get_by_label('Proof of delivery photo').wait_for()
  assert await page.get_by_role('button',name='Mark delivered',exact=True).is_disabled();print('No-proof completion disabled')
  await page.set_input_files('input[aria-label="Proof of delivery photo"]','/tmp/browser/delivery-integrity/proof.jpg');await page.get_by_role('button',name='Mark delivered',exact=True).wait_for();await page.wait_for_timeout(1800)
  row=api('/rest/v1/deliveries?id=eq.'+j,method='GET')[0];assert row['status']=='picked_up'
  await page.screenshot(path='/tmp/browser/delivery-integrity/proof-upload.png');await page.get_by_role('button',name='Mark delivered',exact=True).click();await page.get_by_text('Delivery completed',exact=True).wait_for();row=api('/rest/v1/deliveries?id=eq.'+j,method='GET')[0];assert row['status']=='delivered' and row['proof_photo_url'].startswith(driver+'/'+j+'/delivery-proof-');paths.append(row['proof_photo_url']);print('Browser pickup, scoped private upload, completion and readback passed')
  await page.get_by_role('button',name='Earnings',exact=True).click();await page.get_by_role('button',name='Confirm cash received',exact=True).wait_for();await page.screenshot(path='/tmp/browser/delivery-integrity/receipt-control.png')
  # Deliberate mismatch avoids posting immutable test money on the hosted database.
  api('/rest/v1/payments',{'delivery_id':j,'customer_id':users[0],'amount':1,'payment_method':'cash','status':'pending'})
  page.on('dialog',lambda d:d.accept());await page.get_by_role('button',name='Confirm cash received',exact=True).click();await page.get_by_text('Payment mismatch; contact support',exact=True).wait_for();assert api('/rest/v1/deliveries?id=eq.'+j,method='GET')[0]['payment_status']!='paid';print('Browser receipt rejection preserves unpaid state')
  await page.screenshot(path='/tmp/browser/delivery-integrity/receipt-denied.png');await page.set_viewport_size({'width':390,'height':844});await page.screenshot(path='/tmp/browser/delivery-integrity/mobile.png');await page.wait_for_timeout(1500);print('mobile overflow',await page.evaluate('document.documentElement.scrollWidth-innerWidth'));print('runtime errors',len(errors));assert not errors;await b.close()
try:
 customer,cs=user('customer');driver,ds=user('driver');api('/rest/v1/driver_profiles',{'user_id':driver,'full_name':'ISOLATED INTEGRITY TEST','city':'Harare','available':False})
 j=api('/rest/v1/deliveries',{'customer_id':customer,'driver_id':driver,'status':'accepted','price':25,'service_tier':'express_bike','parcel_size':'small','payment_method':'cash','payment_status':'pending','pickup_address':'ISOLATED SECURITY TEST','dropoff_address':'ISOLATED SECURITY TEST'})[0]['id'];jobs.append(j)
 asyncio.run(main(driver,ds,j))
finally:
 for jid in jobs:
  for table,col in [('payments','delivery_id'),('delivery_events','delivery_id'),('delivery_offers','delivery_id'),('admin_audit_log','subject_id')]:api('/rest/v1/'+table+'?'+col+'=eq.'+jid,method='DELETE')
  api('/rest/v1/notifications?link=like.*'+jid+'*',method='DELETE');api('/rest/v1/deliveries?id=eq.'+jid,method='DELETE')
 for uid in users:
  # Storage paths are discovered even if the browser fails before completing.
  objects=api('/storage/v1/object/list/job-photos',{'prefix':uid,'limit':100})
  for folder in objects or []:
   if folder.get('id') is None:
    prefix=uid+'/'+folder['name'];photos=api('/storage/v1/object/list/job-photos',{'prefix':prefix,'limit':100});paths.extend(prefix+'/'+x['name'] for x in photos or [])
  owned=list(set(p for p in paths if p.startswith(uid+'/')))
  if owned:api('/storage/v1/object/job-photos',{'prefixes':owned},method='DELETE')
  api('/rest/v1/notifications?user_id=eq.'+uid,method='DELETE');api('/rest/v1/driver_profiles?user_id=eq.'+uid,method='DELETE');api('/auth/v1/admin/users/'+uid,method='DELETE')
 after={t:api('/rest/v1/'+t+'?select=*',method='GET') for t in before};assert {t:sorted(v,key=lambda x:json.dumps(x,sort_keys=True)) for t,v in before.items()}=={t:sorted(v,key=lambda x:json.dumps(x,sort_keys=True)) for t,v in after.items()};print('Disposable hosted fixtures removed; genuine payments, bookings, wallets and ledger unchanged')

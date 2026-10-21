// Run with PLAYWRIGHT_PATH and optional CHROMIUM_MODULE; BROWSER=webkit uses WebKit.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const pw=require(process.env.PLAYWRIGHT_PATH||'playwright');
(async()=>{
 const root=path.resolve(__dirname,'..');let served=process.env.BASELINE_DIR||root,revision='';
 const prefix=process.env.PUBLISH==='1'?'/publish/':'/';
 const server=http.createServer((req,res)=>{
  let p=decodeURIComponent(req.url.split('?')[0]);if(p.endsWith('/'))p+='index.html';
  try{res.setHeader('Cache-Control','no-store');res.setHeader('Content-Type',({'.js':'text/javascript','.html':'text/html','.css':'text/css','.webmanifest':'application/manifest+json','.svg':'image/svg+xml','.png':'image/png'}[path.extname(p)]||'application/octet-stream'));let content=fs.readFileSync(path.join(served,p));if(p.endsWith('/sw.js')&&revision)content=content.toString().replace(/const VERSION='[^']+'/ ,"const VERSION='audit"+revision+"'");res.end(content);}catch{res.writeHead(404).end();}
 });await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 let browser;
 try{
  let options={headless:true};
  if(process.env.CHROMIUM_MODULE){const adapter=require(process.env.CHROMIUM_MODULE);options={...options,executablePath:await adapter.executablePath(),args:adapter.args};}
  browser=await pw[process.env.BROWSER||'chromium'].launch(options);
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('crash',()=>console.error('BROWSER PAGE CRASH'));page.on('close',()=>console.log('Browser page closed'));page.setDefaultTimeout(15000);
  const url='http://127.0.0.1:'+server.address().port+prefix;
  const title=async()=>{await page.locator('#launchScreen').waitFor({state:'visible'});};
  const home=async()=>{await page.locator('#launchScreen').waitFor({state:'hidden'});await page.locator('#homeSummary').waitFor();assert.equal(await page.locator('#settingsForm').count(),0);};
  await page.goto(url);await title();await page.locator('#launchStart').click();await home();
  await page.evaluate(async()=>{await navigator.serviceWorker.ready;});
  await page.waitForFunction(()=>!!navigator.serviceWorker.controller);
  // Seed isolated test data only; no production origin is accessed.
  await page.evaluate(async()=>{const db=await import('./db.js');const {makeSimpleEntry}=await import('./simple-ledger.js');const d=await db.load();d.simpleEntries=[makeSimpleEntry({date:'2026-10-20',stake:1000,status:'settled',payout:1700},'navigation-fixture')];await db.save(d);});
  await page.reload();await home();
  const snapshot=()=>page.evaluate(async()=>JSON.stringify(await(await import('./db.js')).load()));
  const before=await snapshot();
  if(process.env.BASELINE_DIR){
   served=root;
   // A complete new release waits, while the old installed release is still running.
   await page.evaluate(async()=>{const reg=await navigator.serviceWorker.getRegistration();await reg.update();});
   await page.waitForFunction(async()=>!!(await navigator.serviceWorker.getRegistration()).waiting);
   await page.locator('#settingsButton').click();await page.locator('#returnToTitle').click();await title();
   await page.locator('#launchUpdate').click();
   await page.waitForFunction(()=>document.querySelector('#launchStart')?.tagName==='BUTTON'&&!document.querySelector('#launchStart').disabled);
   await title();await page.locator('#launchStart').click();await home();
   console.log('PASS legacy cache -> new release -> title -> Home');
  }
  for(let i=0;i<4;i++){
   await page.locator('#settingsButton').click();await page.locator('#settingsForm').waitFor();
   await page.locator('#returnToTitle').click();await title();
   assert.equal(await page.locator('#settingsForm').count(),0);
   await page.locator('#launchStart').click();await home();
  }
  console.log('PASS initial title, Start and four Settings -> Title -> Home cycles');
  await page.locator('#settingsButton').click();await page.locator('#motion').click();
  page.once('dialog',d=>d.dismiss());await page.locator('#returnToTitle').click();
  await page.waitForFunction(()=>location.hash==='#settings');assert.equal(await page.locator('#launchScreen').isVisible(),false);assert.equal(await page.locator('#settingsForm').count(),1);
  page.once('dialog',d=>d.accept());await page.locator('#returnToTitle').click();await title();
  await page.locator('#launchStart').click();await home();
  console.log('PASS unsaved Settings cancel/accept without overlay mismatch');
  for(const route of ['history','analysis','growth','quick','calendar']){
   await page.evaluate(route=>location.hash=route,route);await page.waitForTimeout(100);
   assert.equal(await page.locator('#app > .error').count(),0,route);
  }
  await page.evaluate(()=>location.hash='settings');await page.locator('#returnToTitle').click();await title();
  await page.locator('#launchUpdate').click();await page.waitForFunction(()=>document.querySelector('#launchUpdateStatus').textContent.includes('確認が完了'));await title();
  revision='-test-update';
  await page.evaluate(async()=>{await(await navigator.serviceWorker.getRegistration()).update();});
  await page.waitForFunction(async()=>!!(await navigator.serviceWorker.getRegistration()).waiting);
  let reloads=0;const count=request=>{if(request.isNavigationRequest()&&request.frame()===page.mainFrame())reloads++;};page.on('request',count);
  try{await Promise.all([page.waitForEvent('load'),page.locator('#launchUpdate').click()]);}catch(error){console.error('Update diagnostics',await page.evaluate(async()=>{const r=await navigator.serviceWorker.getRegistration();return {status:document.querySelector('#launchUpdateStatus').textContent,online:navigator.onLine,hash:location.hash,controller:navigator.serviceWorker.controller?.state,waiting:r?.waiting?.state,installing:r?.installing?.state,active:r?.active?.state};}));throw error;}
  await page.waitForFunction(async()=>{const keys=await caches.keys();return keys.some(k=>k.endsWith('audit-test-update'))&&!document.querySelector('#launchStart').disabled;});
  await title();await page.locator('#launchStart').click();await home();
  page.off('request',count);assert.equal(reloads,1);
  await page.locator('#settingsButton').click();await page.locator('#returnToTitle').click();
  await page.reload();await title();await page.locator('#launchStart').click();await home();
  await page.reload();await home();
  console.log('PASS no-update check, title reload and started-session reload');
  await context.setOffline(true);await page.reload();await home();
  await page.locator('#settingsButton').click();await page.locator('#returnToTitle').click();await title();
  await page.locator('#launchUpdate').click();await page.waitForFunction(()=>document.querySelector('#launchUpdateStatus').textContent.includes('通信状態'));await title();
  await page.locator('#launchStart').click();await home();assert.equal(await snapshot(),before);
  await context.setOffline(false);await page.reload();await home();assert.equal(await snapshot(),before);
  console.log('PASS offline reload, update failure, reconnect and exact ledger preservation');
  const fresh=await browser.newContext();const newPage=await fresh.newPage();await newPage.goto(url+'#settings');await newPage.locator('#launchScreen').waitFor({state:'visible'});await fresh.close();
  assert.deepEqual(errors,[]);console.log('PASS fresh session with stale Settings URL; no browser errors');
 }finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
})().catch(e=>{console.error(e);process.exitCode=1});

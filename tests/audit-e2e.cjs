// Isolated local origin only. Run BROWSER=webkit for desktop WebKit, not physical iOS.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const pw=require(process.env.PLAYWRIGHT_PATH||'playwright');
(async()=>{
 const root=path.resolve(__dirname,'..'),prefix=process.env.PUBLISH==='1'?'/publish/':'/';
 const server=http.createServer((req,res)=>{let p=decodeURIComponent(req.url.split('?')[0]);if(p.endsWith('/'))p+='index.html';try{res.setHeader('Content-Type',({'.js':'text/javascript','.html':'text/html','.css':'text/css','.webmanifest':'application/manifest+json','.svg':'image/svg+xml','.png':'image/png'}[path.extname(p)]||'application/octet-stream'));res.end(fs.readFileSync(path.join(root,p)));}catch{res.writeHead(404).end();}});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser;
 try{
  let options={headless:true};if(process.env.CHROMIUM_MODULE){const c=require(process.env.CHROMIUM_MODULE);options={...options,executablePath:await c.executablePath(),args:c.args};}
  browser=await pw[process.env.BROWSER||'chromium'].launch(options);
  const ctx=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,locale:'ja-JP'}),page=await ctx.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());page.setDefaultTimeout(10000);
  const url='http://127.0.0.1:'+server.address().port+prefix;
  await page.goto(url);await page.locator('#launchStart').waitFor();for(const width of [320,390,440]){await page.setViewportSize({width,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'title overflow');}await page.setViewportSize({width:390,height:844});await page.locator('#launchStart').click();await page.locator('#homeSummary').waitFor();
  const go=async hash=>{await page.evaluate(h=>location.hash=h,hash);await page.waitForFunction(h=>location.hash==='#'+h,hash);await page.waitForTimeout(100);assert.equal(await page.locator('#app > .error').count(),0,hash);};
  const snapshot=()=>page.evaluate(async()=>JSON.stringify(await(await import('./db.js')).load()));
  const swipe=async(points,target='#app h1')=>page.evaluate(({points,target})=>{
   const el=document.querySelector(target)||document.querySelector('#app');
   const touch=([x,y])=>new Touch({identifier:1,target:el,clientX:x,clientY:y});
   el.dispatchEvent(new TouchEvent('touchstart',{bubbles:true,touches:[touch(points[0])]}));
   for(const p of points.slice(1,-1))el.dispatchEvent(new TouchEvent('touchmove',{bubbles:true,touches:[touch(p)]}));
   el.dispatchEvent(new TouchEvent('touchend',{bubbles:true,touches:[],changedTouches:[touch(points.at(-1))]}));
  },{points,target});
  await swipe([[280,100],[100,100]],'#homeSummary h2');await page.locator('#simpleEntryForm').waitFor();
  await page.locator('#simpleStake').fill('1000');await page.locator('#simplePayout').fill('1500');await page.locator('#simpleRefund').fill('100');
  await page.locator('nav a[href="#quick"]').click();assert.equal(await page.locator('#simpleStake').inputValue(),'1000');
  await swipe([[280,100],[100,100]]);assert.equal(await page.evaluate(()=>location.hash),'#quick');
  await page.locator('#simpleSave').click();await page.locator('#historySearch').waitFor();
  let quick=await page.evaluate(async()=> (await(await import('./db.js')).load()).simpleEntries[0]);assert.equal(quick.payout+quick.refund-quick.stake,600);
  await go('quick-edit/'+quick.id);await page.locator('#simplePayout').fill('1600');await page.locator('#simpleSave').click();await page.locator('#historySearch').waitFor();
  await page.locator('#historySearch').fill('絶対に一致しない検索語');await page.waitForFunction(()=>document.querySelector('#historyList').textContent.includes('該当'));assert.match(await page.locator('#historyList').innerText(),/該当/);
  await go('entry');await page.locator('#number').selectOption('8');await page.locator('#openPurchaseSheet').click();await page.locator('#type').selectOption('単勝');await page.locator('#numbers').fill('1');await page.locator('#stake').fill('100');await page.locator('#addLine').click();
  await page.locator('#entryForm').evaluate(el=>el.requestSubmit());await page.locator('#historySearch').waitFor();
  const ticket=await page.evaluate(async()=> (await(await import('./db.js')).load()).tickets[0]);assert.ok(ticket);
  await go('edit/'+ticket.id);await page.locator('#memo').fill('監査テスト');await page.locator('#entryForm').evaluate(el=>el.requestSubmit());await page.locator('#historySearch').waitFor();
  assert.equal(await page.evaluate(async id=>(await(await import('./db.js')).load()).tickets.find(t=>t.id===id).memo,ticket.id),'監査テスト');
  console.log('PASS swipe, dirty/same-tab protection, simple and detailed create/edit');
  const before=await snapshot();
  await go('settings');await page.locator('#import').setInputFiles({name:'backup.json',mimeType:'application/json',buffer:Buffer.from(before)});await page.locator('#restore').waitFor();
  assert.match(await page.locator('#restorePreview').innerText(),/1件の簡易記録/);
  await page.locator('#restoreAgree').check();await page.locator('#restore').click();await page.locator('#homeSummary').waitFor();assert.equal(await snapshot(),before);
  await go('settings');const download=page.waitForEvent('download');await page.locator('#export').click();const file=await download;const exported=JSON.parse(fs.readFileSync(await file.path(),'utf8'));assert.deepEqual(exported,JSON.parse(before));
  const csvDownload=page.waitForEvent('download');await page.locator('#exportCsv').click();const csv=await csvDownload;assert.match(fs.readFileSync(await csv.path(),'utf8'),/記録済み（簡易）/);
  await page.locator('#import').setInputFiles({name:'broken.json',mimeType:'application/json',buffer:Buffer.from('{invalid')});await page.waitForTimeout(100);assert.equal(await snapshot(),before);
  // Use the real IndexedDB transaction to assert optimistic concurrency and failed write atomicity.
  await page.evaluate(async()=>{
   const db=await import('./db.js'),s=await db.loadWithRevision();await db.save(s.data,{expectedRevision:s.revision});
   let conflict=false;try{await db.save(s.data,{expectedRevision:s.revision});}catch(e){conflict=e.code==='STALE_LEDGER';}if(!conflict)throw Error('conflict not detected');
   const proto=IDBObjectStore.prototype,original=proto.put;
   proto.put=function(value,key){if(key==='mainRevision')throw new DOMException('quota test','QuotaExceededError');return original.call(this,value,key);};
   const next=structuredClone(s.data);next.settings.name='must rollback';
   try{let rejected=false;try{await db.save(next);}catch{rejected=true;}if(!rejected)throw Error('save not rejected');}finally{proto.put=original;}
   if((await db.load()).settings.name!==s.data.settings.name)throw Error('partial write persisted');
  });
  await page.reload();await page.locator('#settingsForm').waitFor();
  console.log('PASS exact JSON restore/export, CSV, malformed restore, concurrent writes and atomic quota rollback');
  for(const route of ['home','quick','entry','history','calendar','day/'+quick.date,'analysis','growth','settings']){
   await go(route);
   if(process.env.SCREENSHOTS){fs.mkdirSync(process.env.SCREENSHOTS,{recursive:true});await page.screenshot({path:path.join(process.env.SCREENSHOTS,route.split('/')[0]+'.png'),fullPage:true});}
   for(const width of [320,390,440]){await page.setViewportSize({width,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'overflow '+route+' '+width);}
  }
  await go('history');await swipe([[280,100],[270,170],[100,100]]);assert.equal(await page.evaluate(()=>location.hash),'#history');
  await swipe([[10,100],[200,100]]);assert.equal(await page.evaluate(()=>location.hash),'#history');
  await swipe([[280,100],[100,100]]);await page.locator('.analysis-essential-card').waitFor();
  await go('detail/'+ticket.id);await page.locator('#delete').click();await page.locator('#historySearch').waitFor();
  await go('quick-edit/'+quick.id);await page.locator('#simpleDelete').click();await page.locator('#historySearch').waitFor();
  const deleted=JSON.parse(await snapshot());assert.equal(deleted.tickets.length,0);assert.equal(deleted.lines.length,0);assert.equal(deleted.races.length,0);assert.equal(deleted.simpleEntries.length,0);
  await page.evaluate(async()=>navigator.serviceWorker.ready);await page.waitForFunction(()=>!!navigator.serviceWorker.controller);
  await ctx.setOffline(true);await page.reload();await page.locator('#historySearch').waitFor();await go('quick');await page.locator('#simpleStake').fill('200');await page.locator('#simpleSave').click();await page.locator('#historySearch').waitFor();
  assert.equal(JSON.parse(await snapshot()).simpleEntries[0].stake,200);await ctx.setOffline(false);
  assert.deepEqual(errors,[]);console.log('PASS all 10 screen layouts at 320/390/440, vertical/edge swipe rejection, both delete flows, offline reload/save; no JS errors');
 }finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
})().catch(e=>{console.error(e);process.exitCode=1});

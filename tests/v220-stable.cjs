const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
(async()=>{
 const root=path.resolve(__dirname,'..'),prefix=process.env.PUBLISH==='1'?'/publish/':'/';
 const server=http.createServer((req,res)=>{
  let p=decodeURIComponent(req.url.split('?')[0]);if(p.endsWith('/'))p+='index.html';
  try{res.setHeader('Content-Type',({'.js':'text/javascript','.html':'text/html','.css':'text/css','.svg':'image/svg+xml','.webmanifest':'application/manifest+json'}[path.extname(p)]||'application/octet-stream'));res.end(fs.readFileSync(path.join(root,p)));}
  catch{res.writeHead(404).end();}
 }).listen(8235,'127.0.0.1');
 let browser;
 try{
  const adapter=require(process.env.CHROMIUM_MODULE);
  browser=await chromium.launch({headless:true,executablePath:await adapter.executablePath(),args:adapter.args.filter(x=>x!=='--disable-web-security'&&x!=='--allow-running-insecure-content')});
  const context=await browser.newContext({viewport:{width:390,height:844}}),page=await context.newPage();
  const errors=[],dialogs=[];
  let refusalCount=2;
  page.on('pageerror',err=>errors.push(err.message));
  page.on('dialog',async dialog=>{
   dialogs.push(dialog.message());
   if(dialog.message().includes('入力済みの払戻・返還金を消して結果待ちに戻しますか？')&&refusalCount>0){
    refusalCount--;await dialog.dismiss();
   }else await dialog.accept();
  });
  page.setDefaultTimeout(20000);
  await page.goto('http://127.0.0.1:8235'+prefix);await page.waitForSelector('#homeQuickEntry');
  await page.locator('#homeQuickEntry').click();await page.waitForSelector('#simpleEntryForm');
  await page.locator('#simpleDate').fill('2026-10-18');
  await page.locator('#simpleStake').fill('1500');
  await page.locator('#simpleResultSection summary').click();
  await page.locator('#simpleMarkMiss').click();
  await page.locator('#simplePayout').fill('2000');
  await page.locator('#simpleSave').click();
  await page.waitForFunction(()=>location.hash==='#history');
  const before=await page.evaluate(async()=>(await(await import('./db.js')).load()).simpleEntries);
  assert.equal(before.length,1);assert.equal(before[0].payout,2000);assert.equal(before[0].status,'settled');
  await page.locator('#historyList a[href^="#quick-edit/"]').click();
  await page.waitForSelector('#simpleEntryForm');
  await page.locator('#simplePayout').fill('2400');
  await page.locator('#simpleMarkPending').click();
  assert.equal(await page.locator('#simpleStatus').inputValue(),'settled','shortcut cancellation must retain status');
  assert.equal(await page.locator('#simplePayout').inputValue(),'2400','shortcut cancellation must retain payout');
  await page.locator('#simpleStatus').selectOption('pending');
  assert.equal(await page.locator('#simpleStatus').inputValue(),'settled','selector cancellation must roll back');
  assert.equal(await page.locator('#simplePayout').inputValue(),'2400');
  assert.equal(await page.locator('#simplePayoutFields').isVisible(),true);
  assert.deepEqual(await page.evaluate(async()=>(await(await import('./db.js')).load()).simpleEntries),before,'refused edits do not touch accounting');
  await page.locator('#simpleStatus').selectOption('pending');
  assert.equal(await page.locator('#simpleStatus').inputValue(),'pending');
  assert.equal(await page.locator('#simplePayout').inputValue(),'0');
  assert.equal(await page.locator('#simpleRefund').inputValue(),'0');
  assert.equal(await page.locator('#simplePayoutFields').isVisible(),false);
  assert.match(await page.locator('#simpleReview').innerText(),/未入力/);
  await page.locator('#simpleSave').click();await page.waitForFunction(()=>location.hash==='#history');
  let saved=await page.evaluate(async()=>(await(await import('./db.js')).load()).simpleEntries);
  assert.equal(saved.length,1);assert.equal(saved[0].id,before[0].id);
  assert.equal(saved[0].payout,0);assert.equal(saved[0].status,'pending');
  await page.evaluate(()=>location.hash='day/2026-10-18');
  await page.waitForSelector('a[href^="#quick-edit/"]');
  await page.locator('a[href^="#quick-edit/"]').click();await page.waitForSelector('#simpleEntryForm');
  await page.locator('#simpleDate').fill('2026-10-19');
  await page.locator('#simpleResultSection summary').click();
  await page.locator('#simpleMarkMiss').click();
  await page.locator('#simpleSave').click();
  await page.waitForFunction(()=>location.hash==='#day/2026-10-19');
  saved=await page.evaluate(async()=>(await(await import('./db.js')).load()).simpleEntries);
  assert.equal(saved.length,1,'date change updates rather than duplicating original');
  assert.equal(saved[0].id,before[0].id);
  assert.equal(saved[0].date,'2026-10-19');assert.equal(saved[0].status,'settled');assert.equal(saved[0].payout,0);
  const schema=await page.evaluate(async()=>{
   const data=await(await import('./db.js')).load();
   return {version:data.schemaVersion,valid:(await import('./core.js')).validateData(data).schemaVersion};
  });
  assert.deepEqual(schema,{version:1,valid:1},'same schema for old JSON backups');
  assert.equal(dialogs.filter(x=>x.includes('入力済みの払戻・返還金を消して結果待ち')).length,3);
  await page.reload();await page.waitForSelector('.day-summary');
  await page.evaluate(()=>location.hash='history');await page.waitForSelector('#historyCount');
  assert.match(await page.locator('#historyCount').innerText(),/かんたん支出 1件/);
  for(const width of [320,390,440]){
   await page.setViewportSize({width,height:844});
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'layout overflow '+width);
  }
  await page.waitForFunction(()=>navigator.serviceWorker.controller!==null);
  await context.setOffline(true);await page.reload();await page.waitForSelector('#historyCount');
  assert.equal(await page.evaluate(async()=>(await(await import('./db.js')).load()).simpleEntries[0].date),'2026-10-19');
  await context.setOffline(false);
  assert.deepEqual(errors,[]);
  console.log('PASS v2.2.0 stable: cancel or approve payout reset via shortcut/select, date-changing edit, schema, reload, offline and widths');
 }finally{if(browser)await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exit(1);});

const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
(async()=>{
 const root=path.resolve(__dirname,'..'),prefix=process.env.PUBLISH==='1'?'/publish/':'/',passes=[];
 const server=http.createServer((req,res)=>{let p=decodeURIComponent(req.url.split('?')[0]);if(p.endsWith('/'))p+='index.html';try{res.setHeader('Content-Type',({'.js':'text/javascript','.html':'text/html','.css':'text/css','.svg':'image/svg+xml'}[path.extname(p)]||'application/octet-stream'));res.end(fs.readFileSync(path.join(root,p)));}catch{res.writeHead(404).end();}}).listen(8014,'127.0.0.1');
 let browser;
 try{
  const c=require(process.env.CHROMIUM_MODULE);
  browser=await chromium.launch({headless:true,executablePath:await c.executablePath(),args:c.args.filter(x=>x!=='--disable-web-security'&&x!=='--allow-running-insecure-content')});
  const ctx=await browser.newContext({viewport:{width:390,height:844}}),page=await ctx.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(15000);
  const pass=async(label,fn)=>{await fn();passes.push(label);console.log('PASS '+label);};
  const nav=async hash=>{await page.evaluate(h=>location.hash=h,hash);await page.waitForTimeout(100);};
  await page.addInitScript(()=>{window.__UMALOG_ENTRY_CLASSIC__=true;});await page.goto('http://127.0.0.1:8014'+prefix);await page.waitForSelector('.hero');
  await pass('dev12 home and empty-day link',async()=>{
   assert.equal(await page.locator('a[href^="#day/"]').count(),1);
   await nav('day/2026-10-17');assert.match(await page.locator('#app').innerText(),/この日の記録はありません/);
   await page.locator('a[href="#entry-date/2026-10-17"]').click();await page.waitForSelector('#entryForm');
   assert.equal(await page.locator('#date').inputValue(),'2026-10-17');
  });
  await pass('dev12 save-and-continue carries date and venue, clears race number',async()=>{
   await page.locator('#venue').selectOption('東京');await page.locator('#number').selectOption('8');
   await page.locator('#type').selectOption('単勝');await page.locator('#numbers').fill('1');await page.locator('#stake').fill('200');await page.locator('#addLine').click();
   await page.locator('[data-entry-outcome="0"]').selectOption('miss');await page.locator('#saveNextRace').check();
   await page.locator('#entryForm button[type=submit]').click();await page.waitForFunction(()=>location.hash.startsWith('#entry-next/'));
   await page.waitForSelector('#entryForm');assert.equal(await page.locator('#date').inputValue(),'2026-10-17');
   assert.equal(await page.locator('#venue').inputValue(),'東京');assert.equal(await page.locator('#number').inputValue(),'');
  });
  await pass('dev12 existing combo warns and requires explicit duplicate purchase approval',async()=>{
   await page.locator('#number').selectOption('8');await page.locator('#type').selectOption('単勝');
   await page.locator('#numbers').fill('1');await page.locator('#stake').fill('200');await page.locator('#addLine').click();
   await page.locator('[data-entry-outcome="0"]').selectOption('hit');await page.locator('[data-entry-receipt="0"]').fill('700');
   assert.match(await page.locator('#existingDuplicateReview').innerText(),/登録済みの買い目/);
   await page.locator('#entryForm button[type=submit]').click();assert.match(await page.locator('#notice').innerText(),/重複を確認/);
   assert.equal(await page.evaluate(async()=>(await (await import('./db.js')).load()).tickets.length),1);
   await page.locator('#existingDuplicatesConfirmed').check();
   await page.locator('#entryForm button[type=submit]').click();await page.waitForSelector('#historyList');
   const d=await page.evaluate(async()=>(await (await import('./db.js')).load()).tickets.length);assert.equal(d,2);
  });
  await pass('dev12 consolidated day preserves receipts and cross-linked records',async()=>{
   await nav('day/2026-10-17');await page.waitForSelector('.day-summary');
   assert.match(await page.locator('.day-summary').innerText(),/購入/);
   assert.match(await page.locator('.day-summary').innerText(),/\+300円/);
   assert.equal(await page.locator('.day-ticket').count(),2);
   await page.locator('.day-next').first().click();await page.waitForSelector('#entryForm');
   assert.equal(await page.locator('#number').inputValue(),'');
  });
  await pass('dev13 analytics show consistent daily insights and cumulative movement',async()=>{
   await nav('analysis');await page.waitForSelector('.analysis-insights');
   const panel=await page.locator('.analysis-insights').innerText();
   assert.match(panel,/プラスの日/);assert.match(panel,/2026-10-17/);
   await page.locator('.analysis-insights summary').click();
   assert.match(await page.locator('.daily-trend').innerText(),/\+300円/);
  });
  await pass('dev14 cosmetic milestones and touch-safe mobile layout',async()=>{
   await nav('growth');await page.locator('.growth-optional > summary').click();await page.waitForSelector('#growthRewards');
   assert.equal(await page.locator('.reward-item').count(),5);
   const before=await page.evaluate(async()=>{const d=await (await import('./db.js')).load();return {races:d.races,lines:d.lines,tickets:d.tickets};});
   for(const width of [320,390,440]){await page.setViewportSize({width,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),String(width));}
   await page.locator('#care').click();await page.waitForFunction(()=>!document.querySelector('#app').hasAttribute('aria-busy'));
   const after=await page.evaluate(async()=>{const d=await (await import('./db.js')).load();return {races:d.races,lines:d.lines,tickets:d.tickets};});
   assert.deepEqual(after,before);
  });
  assert.deepEqual(errors,[]);console.log('ALL '+passes.length+' DEV14 UI CHECKS PASSED');
 }finally{if(browser)await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exit(1);});

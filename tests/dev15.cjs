const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
(async()=>{
 const root=path.resolve(__dirname,'..'),prefix=process.env.PUBLISH==='1'?'/publish/':'/',passed=[];
 const server=http.createServer((req,res)=>{let p=decodeURIComponent(req.url.split('?')[0]);if(p.endsWith('/'))p+='index.html';try{res.setHeader('Content-Type',({'.js':'text/javascript','.html':'text/html','.css':'text/css','.svg':'image/svg+xml'}[path.extname(p)]||'application/octet-stream'));res.end(fs.readFileSync(path.join(root,p)));}catch{res.writeHead(404).end();}}).listen(8015,'127.0.0.1');
 let browser;
 try{
  const c=require(process.env.CHROMIUM_MODULE);
  browser=await chromium.launch({headless:true,executablePath:await c.executablePath(),args:c.args.filter(x=>x!=='--disable-web-security'&&x!=='--allow-running-insecure-content')});
  const ctx=await browser.newContext({viewport:{width:390,height:844}}),page=await ctx.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(15000);
  const pass=async(name,fn)=>{await fn();passed.push(name);console.log('PASS '+name);};
  const nav=async hash=>{await page.evaluate(h=>location.hash=h,hash);await page.waitForSelector('#entryForm');};
  await page.goto('http://127.0.0.1:8015'+prefix);await page.waitForSelector('.hero');
  await nav('entry');
  await pass('ledger-first entry dashboard and hidden mobile sheets',async()=>{
   assert.ok(await page.locator('#entryQuickDashboard').isVisible());
   assert.equal(await page.locator('#entryPurchasePanel').isVisible(),false);
   assert.equal(await page.locator('#entryOutcomePanel').isVisible(),false);
   await page.locator('#openPurchaseSheet').click();
   assert.equal(await page.locator('#entryPurchasePanel').isVisible(),true);
   assert.equal(await page.locator('#entryPurchasePanel').getAttribute('aria-modal'),'true');
   await page.locator('#numbers').fill('1 2');
   await page.locator('.entry-sheet-head .sheet-close').click();
   assert.equal(await page.locator('#entryPurchasePanel').isVisible(),false);
   await page.locator('#openPurchaseSheet').click();
   assert.equal(await page.locator('#numbers').inputValue(),'1 2');
  });
  await pass('purchase three wide lines and preserve values across sheets',async()=>{
   await page.locator('#date').fill('2026-10-17');await page.locator('#venue').selectOption('東京');await page.locator('#number').selectOption('8');
   await page.locator('#type').selectOption('ワイド');
   for(const bet of ['1 2','1 3','2 3']){
    if(!(await page.locator('#entryPurchasePanel').isVisible()))await page.locator('#openPurchaseSheet').click();
    await page.locator('#numbers').fill(bet);await page.locator('#stake').fill('100');
    await page.locator('#addLine').click();assert.equal(await page.locator('#entryPurchasePanel').isVisible(),false);
   }
   assert.match(await page.locator('#quickLineTitle').innerText(),/3点/);
   assert.match(await page.locator('#quickStatus').innerText(),/結果未入力 3点/);
  });
  await pass('multi-hit wide receipts are separate, pending misses require confirmation',async()=>{
   await page.locator('#openOutcomeSheet').click();
   assert.ok(await page.locator('#entryOutcomePanel').isVisible());
   await page.locator('[data-fast-hit="0"]').click();await page.locator('[data-fast-payout="0"]').fill('480');
   await page.locator('[data-fast-hit="1"]').click();await page.locator('[data-fast-payout="1"]').fill('760');
   assert.match(await page.locator('.fast-outcome-header').innerText(),/的中 2点/);
   await page.locator('#fastConfirm').click();assert.match(await page.locator('#fastConfirmWarning').innerText(),/未入力の1点だけ/);
   await page.locator('#fastApplyMiss').click();
   assert.match(await page.locator('.fast-outcome-header').innerText(),/未入力 0点/);
   await page.locator('#finishOutcomeSheet').click();
   assert.equal(await page.locator('#entryOutcomePanel').isVisible(),false);
   assert.match(await page.locator('#quickSnapshot').innerText(),/1,240円/);
   assert.match(await page.locator('#quickSnapshot').innerText(),/\+940円/);
   const unsaved=await page.evaluate(async()=>(await (await import('./db.js')).load()).lines.length);
   assert.equal(unsaved,0);
  });
  await pass('save atomically with exact per-line actual payouts and no pending',async()=>{
   await page.locator('#entryForm button[type=submit]').click();await page.waitForSelector('#historyList');
   const d=await page.evaluate(async()=>(await (await import('./db.js')).load()));
   assert.equal(d.lines.length,3);
   assert.deepEqual(d.lines.map(x=>[x.status,x.payout,x.refund]),[['settled',480,0],['settled',760,0],['settled',0,0]]);
  });
  await pass('refund and zero-hit cases keep accounting distinct',async()=>{
   await nav('entry-date/2026-10-17');await page.locator('#venue').selectOption('京都');await page.locator('#number').selectOption('9');
   await page.locator('#openPurchaseSheet').click();await page.locator('#type').selectOption('複勝');await page.locator('#numbers').fill('5');await page.locator('#addLine').click();
   await page.locator('#openOutcomeSheet').click();await page.locator('[data-fast-refund="0"]').click();await page.locator('#finishOutcomeSheet').click();
   await page.locator('#entryForm button[type=submit]').click();await page.waitForSelector('#historyList');
   const d=await page.evaluate(async()=>(await (await import('./db.js')).load()));
   assert.equal(d.lines.length,4);assert.deepEqual([d.lines[3].status,d.lines[3].refund],['void',100]);
  });
  await pass('small mobile widths and keyboard escape retain draft safely',async()=>{
   await nav('entry');for(const width of [320,390,440]){await page.setViewportSize({width,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),String(width));}
   await page.locator('#openPurchaseSheet').click();await page.locator('#numbers').fill('5 6');await page.keyboard.press('Escape');assert.equal(await page.locator('#entryPurchasePanel').isVisible(),false);
   await page.locator('#openPurchaseSheet').click();assert.equal(await page.locator('#numbers').inputValue(),'5 6');
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  });
  assert.deepEqual(errors,[]);console.log('ALL '+passed.length+' DEV15 FAST SHEET CHECKS PASSED');
 }finally{if(browser)await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exit(1);});

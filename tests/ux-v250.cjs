const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
(async()=>{
 const root=path.resolve(__dirname,'..'),prefix=process.env.PUBLISH==='1'?'/publish/':'/';
 const server=http.createServer((req,res)=>{
  let p=decodeURIComponent(req.url.split('?')[0]);if(p.endsWith('/'))p+='index.html';
  try{res.setHeader('Content-Type',({'.js':'text/javascript','.html':'text/html','.css':'text/css','.svg':'image/svg+xml'}[path.extname(p)]||'application/octet-stream'));res.end(fs.readFileSync(path.join(root,p)));}
  catch{res.writeHead(404).end();}
 }).listen(8250,'127.0.0.1');
 let browser;
 try{
  const adapter=require(process.env.CHROMIUM_MODULE);
  browser=await chromium.launch({headless:true,executablePath:await adapter.executablePath(),args:adapter.args.filter(x=>x!=='--disable-web-security'&&x!=='--allow-running-insecure-content')});
  const context=await browser.newContext({viewport:{width:390,height:844}}),page=await context.newPage(),errors=[];
  page.on('pageerror',error=>errors.push(error.message));page.on('dialog',d=>d.accept());page.setDefaultTimeout(18000);
  await page.goto('http://127.0.0.1:8250'+prefix);await page.waitForSelector('#homeQuickEntry');
  await page.evaluate(async()=>{
   const db=await import('./db.js'),{makeSimpleEntry}=await import('./simple-ledger.js'),d=await db.load();
   d.simpleEntries=[
    makeSimpleEntry({date:'2026-10-21',stake:1000},'cash-a'),
    makeSimpleEntry({date:'2026-10-20',stake:500,payout:700},'cash-b')
   ];await db.save(d);
  });
  await page.reload();await page.waitForSelector('#homeQuickEntry');
  assert.match(await page.locator('#homeSummary .home-profit').innerText(),/[-−]800円/);
  assert.equal(await page.locator('#homeCalendar .ledger-pending-mark').count(),0);
  assert.equal(await page.locator('#historyPendingShortcut').count(),0);
  assert.doesNotMatch(await page.locator('#homeSummary').innerText(),/結果待ち|未確定/);
  await page.locator('#homeQuickEntry').click();await page.waitForSelector('#simpleEntryForm');
  assert.equal(await page.locator('#simpleStatus').count(),0);
  assert.equal(await page.locator('#simpleMarkPending').count(),0);
  await page.locator('#simpleStake').fill('1000');
  await page.locator('#simpleSave').click();
  await page.waitForFunction(()=>location.hash==='#history');
  const before=await page.evaluate(async()=>{
   const d=await(await import('./db.js')).load();
   return d.simpleEntries.map(x=>({id:x.id,stake:x.stake,payout:x.payout,status:x.status}));
  });
  assert.equal(before.length,3);
  assert.ok(before.every(x=>x.status==='settled'));
  const bought=before.find(x=>x.stake===1000&&x.id!=='cash-a');
  assert.equal(bought.payout,0);
  assert.equal(await page.locator('#historyPendingShortcut').count(),0);
  assert.doesNotMatch(await page.locator('#historyList').innerText(),/結果待ち|未入力/);
  const matched=page.locator('#historyList .simple-history-row').filter({has:page.locator('a[href="#quick-result/cash-a"]')});
  assert.equal(await matched.count(),1);
  assert.match(await matched.locator('.simple-history-amount').innerText(),/[-−]1,000円/);
  await matched.locator('a[href="#quick-result/cash-a"]').click();
  await page.waitForSelector('#quickResultForm');
  await page.locator('#quickResultPayout').fill('1600');
  await page.locator('#quickResultSave').click();
  await page.waitForFunction(()=>location.hash==='#history');
  const after=await page.evaluate(async()=>{
   const d=await(await import('./db.js')).load();
   return d.simpleEntries.map(x=>({id:x.id,stake:x.stake,payout:x.payout,status:x.status}));
  });
  assert.equal(after.find(x=>x.id==='cash-a').stake,1000);
  assert.equal(after.find(x=>x.id==='cash-a').payout,1600);
  assert.deepEqual(after.map(x=>x.id).sort(),before.map(x=>x.id).sort());
  assert.match(await page.locator('#historyList .simple-history-row').filter({has:page.locator('a[href="#quick-result/cash-a"]')}).innerText(),/\+600円/);
  await page.evaluate(()=>location.hash='home');await page.waitForSelector('#homeCalendar');
  for(const width of [320,390,440]){
   await page.setViewportSize({width,height:844});
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'mobile horizontal overflow '+width);
  }
  assert.deepEqual(errors,[]);
  console.log('PASS v2.5.0 cash flow: immediate spend, simple input, editable returns, no pending UI, mobile widths');
 }finally{if(browser)await browser.close();server.close();}
})().catch(error=>{console.error(error);process.exit(1);});
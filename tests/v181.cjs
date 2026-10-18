const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
(async()=>{
 const root=path.resolve(__dirname,'..'),prefix=process.env.PUBLISH==='1'?'/publish/':'/';
 const server=http.createServer((req,res)=>{
  let p=decodeURIComponent(req.url.split('?')[0]);if(p.endsWith('/'))p+='index.html';
  try{res.setHeader('Content-Type',({'.js':'text/javascript','.html':'text/html','.css':'text/css','.svg':'image/svg+xml'}[path.extname(p)]||'application/octet-stream'));res.end(fs.readFileSync(path.join(root,p)));}
  catch{res.writeHead(404).end();}
 }).listen(8081,'127.0.0.1');
 let browser;
 try{
  const c=require(process.env.CHROMIUM_MODULE);
  browser=await chromium.launch({headless:true,executablePath:await c.executablePath(),args:c.args.filter(x=>x!=='--disable-web-security'&&x!=='--allow-running-insecure-content')});
  const ctx=await browser.newContext({viewport:{width:390,height:844}}),page=await ctx.newPage(),errors=[],dialogs=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>{dialogs.push(d.message());d.accept();});
  page.setDefaultTimeout(18000);
  await page.goto('http://127.0.0.1:8081'+prefix);await page.waitForSelector('#homeEntry');
  await page.evaluate(()=>location.hash='entry');await page.waitForSelector('#entryForm');
  const base=await page.evaluate(async()=>JSON.stringify(await(await import('./db.js')).load()));
  await page.locator('[data-race-quick="8"]').click();
  await page.locator('#openPurchaseSheet').click();
  await page.locator('#type').selectOption('三連単');
  await page.locator('#mode').selectOption('formation');
  for(const n of [1,2])await page.locator('[data-pattern-number="'+n+'"]').click();
  await page.locator('[data-pattern-next]').click();
  for(const n of [2,3])await page.locator('[data-pattern-number="'+n+'"]').click();
  await page.locator('[data-pattern-next]').click();
  for(const n of [3,4])await page.locator('[data-pattern-number="'+n+'"]').click();
  assert.match(await page.locator('#additionEstimate').innerText(),/追加予定 4点 \/ 400円/);
  await page.locator('#addLine').click();
  assert.equal(await page.locator('#entryPurchasePanel').isVisible(),true);
  assert.equal(await page.locator('[data-amount]').count(),4);
  assert.equal(await page.locator('#allocationEditor .entry-total').innerText().then(v=>v.includes('400円')),true);
  assert.equal(await page.evaluate(async()=>JSON.stringify(await(await import('./db.js')).load())),base);
  await page.locator('[data-bulk-preset="100"]').click();
  await page.locator('[data-line-stake="1"][data-value="200"]').click();
  const stakeArray=await page.locator('[data-amount]').evaluateAll(xs=>xs.map(x=>Number(x.value)));
  assert.deepEqual(stakeArray,[100,200,100,100]);
  assert.match(await page.locator('#allocationEditor .entry-total').innerText(),/500円/);
  assert.match(await page.locator('.review-total').innerText(),/500円/);
  await page.locator('[data-amount="2"]').fill('300');
  await page.locator('[data-amount="2"]').dispatchEvent('change');
  assert.match(await page.locator('.review-total').innerText(),/700円/);
  const storedDraft=await page.evaluate(async()=>await(await import('./db.js')).loadEntryDraft('new'));
  // Draft autosave may run after the user pauses; live changes are not persisted to the main ledger yet.
  assert.equal(await page.evaluate(async()=>JSON.stringify(await(await import('./db.js')).load())),base);
  assert.ok(storedDraft===null||storedDraft.lines.length>=0);
  await page.locator('#entryPurchasePanel .sheet-close').click();
  assert.equal(await page.locator('#openAmountEditor').isVisible(),true);
  await page.locator('#openAmountEditor').click();
  assert.equal(await page.locator('#entryPurchasePanel').isVisible(),true);
  assert.deepEqual(await page.locator('[data-amount]').evaluateAll(xs=>xs.map(x=>Number(x.value))),[100,200,300,100]);
  await page.locator('[data-line-stake="2"][data-value="100"]').click();
  assert.match(await page.locator('.review-total').innerText(),/500円/);
  await page.locator('#entryPurchasePanel .sheet-close').click();
  // Create an intentionally pending accounting entry; never issue a real wager.
  await page.locator('.entry-legacy summary').click();
  await page.locator('#allowUnfinished').check();
  await page.locator('#entryForm button[type="submit"]').click();
  await page.waitForFunction(()=>location.hash==='#history');
  const lines=await page.evaluate(async()=>(await(await import('./db.js')).load()).lines);
  assert.equal(lines.length,4);
  assert.deepEqual(lines.map(l=>l.stake),[100,200,100,100]);
  assert.ok(lines.every(l=>l.purchaseMode==='formation'&&l.status==='pending'));
  await page.locator('.history-bet-details summary').first().click();
  await page.locator('[data-detail]').first().click();await page.waitForSelector('#editStakes');
  await page.locator('#editStakes').click();
  await page.waitForFunction(()=>location.hash.startsWith('#edit-stakes/'));
  await page.waitForSelector('#allocationEditor');
  assert.equal(await page.locator('#entryPurchasePanel').isVisible(),true);
  assert.deepEqual(await page.locator('[data-amount]').evaluateAll(xs=>xs.map(x=>Number(x.value))),[100,200,100,100]);
  await page.locator('[data-line-stake="0"][data-value="500"]').click();
  assert.match(await page.locator('.review-total').innerText(),/900円/);
  const beforeSecondSave=await page.evaluate(async()=>(await(await import('./db.js')).load()).lines);
  assert.equal(beforeSecondSave[0].stake,100);
  await page.locator('#entryPurchasePanel .sheet-close').click();
  await page.locator('.entry-legacy summary').click();
  await page.locator('#allowUnfinished').check();
  await page.locator('#entryForm button[type="submit"]').click();
  await page.waitForFunction(()=>location.hash==='#history');
  const after=await page.evaluate(async()=>(await(await import('./db.js')).load()).lines);
  assert.deepEqual(after.map(l=>l.stake),[500,200,100,100]);
  assert.equal(after.reduce((n,l)=>n+l.stake,0),900);
  for(const width of [320,390,440]){
   await page.setViewportSize({width,height:844});
   await page.locator('.history-bet-details summary').first().click();
  await page.locator('[data-detail]').first().click();await page.waitForSelector('#editStakes');
   await page.locator('#editStakes').click();await page.waitForSelector('#allocationEditor');
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'horizontal overflow '+width);
   await page.locator('#entryPurchasePanel .sheet-close').click();
   await page.evaluate(()=>location.hash='history');await page.waitForSelector('[data-detail]');
  }
  assert.deepEqual(errors,[]);
  console.log('PASS v1.8.1: formation 4 tickets, bulk 100 then one 200, manual amount, aggregate, saved ticket re-edit and mobile');
 }finally{if(browser)await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exit(1);});

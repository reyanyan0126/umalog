const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
(async()=>{
 const root=path.resolve(__dirname,'..'),prefix=process.env.PUBLISH==='1'?'/publish/':'/',passed=[];
 const server=http.createServer((q,r)=>{let p=q.url.split('?')[0];if(p.endsWith('/'))p+='index.html';try{r.setHeader('Content-Type',({'.js':'text/javascript','.html':'text/html','.css':'text/css','.svg':'image/svg+xml'}[path.extname(p)]||'application/octet-stream'));r.end(fs.readFileSync(path.join(root,p)));}catch{r.writeHead(404).end();}}).listen(8011,'127.0.0.1');
 let browser;
 try{
  const c=require(process.env.CHROMIUM_MODULE);
  browser=await chromium.launch({headless:true,executablePath:await c.executablePath(),args:c.args.filter(x=>x!=='--disable-web-security'&&x!=='--allow-running-insecure-content')});
  const ctx=await browser.newContext({viewport:{width:390,height:844}}),page=await ctx.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(15000);
  const pass=async(name,fn)=>{await fn();passed.push(name);console.log('PASS '+name);};
  await page.goto('http://127.0.0.1:8011'+prefix);await page.waitForSelector('.hero');
  await page.evaluate(()=>location.hash='entry');await page.waitForSelector('#entryForm');
  await pass('new entries cannot become silent unconfirmed ledger data',async()=>{
   await page.locator('#date').fill('2026-10-17');
   await page.locator('#number').selectOption('11');
   await page.locator('#type').selectOption('単勝');
   await page.locator('#numbers').fill('1');await page.locator('#stake').fill('200');
   await page.locator('#addLine').click();
   await page.locator('#entryForm button[type=submit]').click();
   assert.match(await page.locator('#notice').innerText(),/すべての買い目の結果/);
   assert.equal(await page.evaluate(async()=>(await (await import('./db.js')).load()).lines.length),0);
  });
  await pass('mixed hit, miss and full refund settle atomically at initial registration',async()=>{
   await page.locator('[data-entry-outcome="0"]').selectOption('hit');
   await page.locator('#entryForm button[type=submit]').click();
   assert.match(await page.locator('#notice').innerText(),/1円以上/);
   await page.locator('[data-entry-receipt="0"]').fill('840');
   await page.locator('#type').selectOption('複勝');await page.locator('#numbers').fill('3');await page.locator('#stake').fill('300');await page.locator('#addLine').click();
   await page.locator('#type').selectOption('枠連');await page.locator('#numbers').fill('2 3');await page.locator('#stake').fill('100');await page.locator('#addLine').click();
   await page.locator('#entryAllMiss').click();
   assert.equal(await page.locator('[data-entry-outcome="0"]').inputValue(),'hit');
   assert.equal(await page.locator('[data-entry-outcome="1"]').inputValue(),'miss');
   await page.locator('[data-entry-outcome="2"]').selectOption('refund');
   assert.match(await page.locator('#entryResultSummary').innerText(),/収支 \+340円/);
   const before=await page.evaluate(async()=>JSON.stringify(await (await import('./db.js')).load()));
   assert.equal(JSON.parse(before).lines.length,0);
   await page.locator('#entryForm button[type=submit]').click();await page.waitForSelector('#historyList');
   const d=await page.evaluate(async()=>(await (await import('./db.js')).load()));
   assert.equal(d.tickets.length,3);assert.equal(d.lines.length,3);
   assert.deepEqual(d.lines.map(l=>[l.status,l.stake,l.payout,l.refund]),[['settled',200,840,0],['settled',300,0,0],['void',100,0,100]]);
   const s=await page.evaluate(async()=>{const {load}=await import('./db.js'),{aggregate}=await import('./core.js');return aggregate(await load());});
   assert.equal(s.profit,340);assert.equal(s.pendingCount,0);assert.equal(s.purchase,600);
  });
  await pass('edit confirmed outcome, without damaging other ticket results',async()=>{
   await page.locator('.history-item').filter({hasText:'単勝'}).locator('[data-detail]').click();await page.waitForSelector('#edit');
   await page.locator('#edit').click();await page.waitForSelector('#entryResults');
   assert.equal(await page.locator('[data-entry-outcome="0"]').inputValue(),'hit');
   await page.locator('[data-entry-receipt="0"]').fill('920');
   assert.match(await page.locator('#entryResultSummary').innerText(),/収支 \+720円/);
   await page.locator('#entryForm button[type=submit]').click();await page.waitForSelector('#historyList');
   const d=await page.evaluate(async()=>(await (await import('./db.js')).load()));
   assert.equal(d.lines.find(l=>l.numbers.length===1&&l.numbers[0]===1).payout,920);
   assert.equal(d.lines.find(l=>l.status==='void').refund,100);
  });
  await pass('small viewports and 200 percent text preserve horizontal layout',async()=>{
   await page.evaluate(()=>location.hash='entry');await page.waitForSelector('#entryForm');
   await page.locator('#type').selectOption('単勝');await page.locator('#numbers').fill('2');await page.locator('#addLine').click();
   for(const width of [320,390,440]){await page.setViewportSize({width,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),String(width));}
   await page.addStyleTag({content:'html{font-size:200%!important}'});
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  });
  assert.deepEqual(errors,[]);console.log('ALL '+passed.length+' DEV11 CHECKS PASSED');
 }finally{if(browser)await browser.close();server.close();}
})().catch(error=>{console.error(error);process.exit(1);});

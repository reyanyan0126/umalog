const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
(async()=>{
 const root=path.resolve(__dirname,'..'),prefix=process.env.PUBLISH==='1'?'/publish/':'/',passed=[];
 const server=http.createServer((req,res)=>{let p=decodeURIComponent(req.url.split('?')[0]);if(p.endsWith('/'))p+='index.html';try{res.setHeader('Content-Type',({'.js':'text/javascript','.html':'text/html','.css':'text/css','.svg':'image/svg+xml'}[path.extname(p)]||'application/octet-stream'));res.end(fs.readFileSync(path.join(root,p)));}catch{res.writeHead(404).end();}}).listen(8030,'127.0.0.1');
 let browser;
 try{
  const portable=require(process.env.CHROMIUM_MODULE);
  browser=await chromium.launch({headless:true,executablePath:await portable.executablePath(),args:portable.args.filter(x=>x!=='--disable-web-security'&&x!=='--allow-running-insecure-content')});
  const ctx=await browser.newContext({viewport:{width:390,height:844}}),page=await ctx.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());page.setDefaultTimeout(12000);
  const go=async route=>{await page.evaluate(h=>location.hash=h,route);await page.waitForTimeout(150);};
  const pass=async(label,fn)=>{await fn();passed.push(label);console.log('PASS '+label);};
  await page.goto('http://127.0.0.1:8030'+prefix);await page.waitForSelector('#homeSummary');
  await pass('dev22 home only monthly net plus one entry action; no budget, racing cards or ratios',async()=>{
   assert.equal(await page.locator('.home-minimal').count(),1);
   assert.equal(await page.locator('#homeEntry').count(),1);
   assert.equal(await page.locator('#homeBudget').count(),0);
   assert.equal(await page.locator('#gradedHome').count(),0);
   assert.equal(await page.locator('#homeYearly').count(),0);
   assert.equal(await page.locator('.home-minimal .metrics').count(),0);
   assert.match(await page.locator('.home-minimal').innerText(),/今月の収支/);
   assert.equal(await page.locator('nav a').count(),4);
  });
  await page.evaluate(async()=>{
   const {save}=await import('./db.js'),{emptyData}=await import('./core.js'),d=emptyData();
   d.races=[{id:'r1',date:'2026-10-18',venue:'東京',number:8,name:'サンプルレース'}];
   d.tickets=[{id:'t1',raceId:'r1',type:'ワイド',kind:'reported',memo:'振り返りメモ',createdAt:'2026-10-18T00:00:00Z'},{id:'t2',raceId:'r1',type:'単勝',kind:'reported',memo:'記録',createdAt:'2026-10-18T00:03:00Z'}];
   d.lines=[{id:'l1',ticketId:'t1',numbers:[1,2],stake:100,status:'settled',payout:550,refund:0,purchaseMode:'normal'},{id:'l2',ticketId:'t1',numbers:[1,3],stake:200,status:'pending',payout:0,refund:0,purchaseMode:'normal'},{id:'l3',ticketId:'t2',numbers:[4],stake:100,status:'settled',payout:0,refund:0,purchaseMode:'normal'}];
   await save(d);
  });
  await page.reload();await page.waitForSelector('#homeSummary');
  await pass('dev22 home uses confirmed accounting and flags excluded pending stakes',async()=>{
   const txt=await page.locator('#homeSummary').innerText();
   assert.match(txt,/\+350円/);assert.match(txt,/200円/);assert.match(txt,/550円/);assert.match(txt,/結果待ち 1点・件/);
   assert.equal(await page.locator('#homeEntry').getAttribute('href'),'#entry');
  });
  await pass('dev23 quick type control synchronizes with existing bet engine and 8 supported types',async()=>{
   await go('entry');await page.waitForSelector('#entryForm');
   await page.locator('#openPurchaseSheet').click();
   assert.equal(await page.locator('[data-bet-fast]').count(),8);
   await page.locator('[data-bet-fast="三連単"]').click();
   assert.equal(await page.locator('#type').inputValue(),'三連単');
   assert.equal(await page.locator('[data-bet-fast="三連単"]').getAttribute('aria-pressed'),'true');
   await page.locator('#type').selectOption('単勝');
   assert.equal(await page.locator('[data-bet-fast="単勝"]').getAttribute('aria-pressed'),'true');
  });
  await pass('dev24 history grouped per race; search purchase memo',async()=>{
   await go('history');await page.waitForSelector('.history-race');
   assert.equal(await page.locator('.history-race').count(),1);
   await page.locator('#historySearch').fill('振り返り');
   assert.equal(await page.locator('.history-race').count(),1);
   await page.locator('#historySearch').fill('ありえない');
   assert.equal(await page.locator('.history-race').count(),0);
  });
  await pass('dev25 calendar metric toggle displays purchase including pending and receipts separately',async()=>{
   await go('calendar');await page.waitForSelector('#calendarMetric');
   await page.locator('#month').fill('2026-10');await page.locator('#month').dispatchEvent('change');
   const day=page.locator('[data-date="2026-10-18"]');
   assert.match(await day.getAttribute('aria-label'),/確定収支/);
   await page.locator('#calendarMetric').selectOption('purchase');assert.match(await day.getAttribute('aria-label'),/購入額/);
   assert.match(await day.getAttribute('aria-label'),/400円/);
   await page.locator('#calendarMetric').selectOption('receipt');assert.match(await day.getAttribute('aria-label'),/払戻・返還/);
   assert.match(await day.getAttribute('aria-label'),/550円/);
  });
  await pass('dev26-27 analytical matrix and scoped navigation do not alter ledger',async()=>{
   await go('analysis');await page.waitForSelector('#analysisMatrix');await page.locator('#analysisAdvanced > summary').click();
   assert.ok(await page.locator('[data-analysis-jump]').count()>=4,'original analysis sections remain');
   assert.equal(await page.locator('[data-analysis-jump="analysisCategoryCompare"]').count(),1);
   assert.equal(await page.locator('[data-analysis-jump="analysisCompare"]').count(),1);
   await page.locator('[data-analysis-jump="analysisMatrix"]').click();
   assert.equal(await page.locator('#analysisMatrix details').evaluate(e=>e.open),true);
   assert.match(await page.locator('#analysisMatrix').innerText(),/東京/);
   assert.match(await page.locator('#analysisMatrix').innerText(),/ワイド/);
   assert.match(await page.locator('#analysisMatrix').innerText(),/\+450円/);
   assert.equal(await page.evaluate(()=>location.hash),'#analysis');
   assert.equal(await page.locator('.budget-widget').count(),1);
  });
  await pass('dev28 growing mascot stays primary and optional rewards are collapsed',async()=>{
   await go('growth');await page.waitForSelector('#petCare');
   assert.ok(await page.locator('.nursery').getAttribute('data-season'));
   assert.equal(await page.locator('.growth-optional').count(),1);
   assert.equal(await page.locator('.growth-optional').evaluate(e=>e.open),false);
   assert.equal(await page.locator('#growthRewards .reward-item').count(),5);
   await page.locator('.growth-optional summary').click();
   assert.equal(await page.locator('.growth-optional').evaluate(e=>e.open),true);
  });
  await pass('dev29-30 responsive all six screens preserve no horizontal overflow',async()=>{
   for(const width of [320,390,440]){await page.setViewportSize({width,height:844});for(const route of ['home','entry','history','calendar','analysis','growth','settings']){await go(route);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),route+' '+width);}}
   const count=await page.evaluate(async()=>(await (await import('./db.js')).load()).lines.length);assert.equal(count,3);
  });
  assert.deepEqual(errors,[]);console.log('ALL '+passed.length+' DEV22-30 SCREEN CHECKS PASSED');
 }finally{if(browser)await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exit(1);});

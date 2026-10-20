const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
(async()=>{
 const root=path.resolve(__dirname,'..'),prefix=process.env.PUBLISH==='1'?'/publish/':'/';
 const server=http.createServer((req,res)=>{
  let p=decodeURIComponent(req.url.split('?')[0]);if(p.endsWith('/'))p+='index.html';
  try{res.setHeader('Content-Type',({'.js':'text/javascript','.html':'text/html','.css':'text/css'}[path.extname(p)]||'application/octet-stream'));res.end(fs.readFileSync(path.join(root,p)));}
  catch{res.writeHead(404).end();}
 }).listen(8244,'127.0.0.1');
 let browser;
 try{
  const adapter=require(process.env.CHROMIUM_MODULE);
  browser=await chromium.launch({headless:true,executablePath:await adapter.executablePath(),args:adapter.args.filter(x=>x!=='--disable-web-security'&&x!=='--allow-running-insecure-content')});
  const ctx=await browser.newContext({viewport:{width:390,height:844}}),page=await ctx.newPage(),errors=[];
  page.on('pageerror',err=>errors.push(err.message));page.on('dialog',d=>d.accept());page.setDefaultTimeout(18000);
  await page.goto('http://127.0.0.1:8244'+prefix);await page.waitForSelector('#homeQuickEntry');
  await page.evaluate(async()=>{
   const db=await import('./db.js'),{makeSimpleEntry}=await import('./simple-ledger.js'),d=await db.load();
   d.simpleEntries=[
    makeSimpleEntry({date:'2026-10-20',stake:1000,venue:'札幌',status:'pending'},'u241-a'),
    makeSimpleEntry({date:'2026-10-19',stake:500,venue:'東京',status:'pending'},'u241-b'),
    makeSimpleEntry({date:'2026-10-18',stake:300,status:'pending'},'u241-c')
   ];
   d.races.push({id:'u241-race',date:'2026-10-17',venue:'東京',number:11,name:'結果待ちレース'});
   for(const [id,type,n] of [['u241-t1','単勝',1],['u241-t2','複勝',2]]){
    d.tickets.push({id,raceId:'u241-race',type,kind:'reported',memo:'',createdAt:'2026-10-17T12:00:00Z'});
    d.lines.push({id:'l-'+id,ticketId:id,numbers:[n],stake:100,status:'pending',payout:0,refund:0});
   }
   await db.save(d);
  });
  await page.reload();await page.waitForSelector('#homeQuickEntry');
  await page.evaluate(()=>location.hash='history');await page.waitForSelector('#historySearch');
  await page.locator('#historySearch').fill('札幌');
  assert.equal(await page.locator('#historySearchClear').isVisible(),true);
  assert.equal(await page.locator('#historyList .simple-history-row').count(),1);
  await page.locator('#historySearchClear').click();
  assert.equal(await page.locator('#historySearch').inputValue(),'');
  assert.equal(await page.locator('#historySearchClear').isVisible(),false);
  assert.equal(await page.locator('#historyList .simple-history-row').count(),3);
  assert.equal(await page.locator('[data-pending-race="u241-race"]').count(),1);
  await page.locator('[data-pending-race="u241-race"]').click();
  assert.equal(await page.locator('.history-race .history-bet-details').evaluate(el=>el.open),true);
  await page.evaluate(()=>location.hash='history-pending');await page.waitForSelector('#historyPendingShortcut');
  assert.equal(await page.locator('#historyPendingShortcut').getAttribute('aria-pressed'),'true');
  await page.locator('a[href="#quick-result/u241-a"]').click();
  await page.waitForSelector('#quickResultForm');
  assert.equal(await page.locator('#simpleEntryForm').count(),0);
  assert.equal(await page.locator('#quickResultPayout').inputValue(),'');
  assert.equal(await page.locator('#quickResultForm #quickResultMiss').isVisible(),true);
  assert.match(await page.locator('.quick-result-overview').innerText(),/1,000円/);
  const savedBefore=await page.evaluate(async()=>JSON.stringify(await(await import('./db.js')).load()));
  await page.locator('#quickResultPayout').fill('2200');
  assert.match(await page.locator('#quickResultNet').innerText(),/1,200円/);
  assert.equal(await page.evaluate(async()=>JSON.stringify(await(await import('./db.js')).load())),savedBefore,'preview must not mutate data');
  await page.locator('#quickResultSave').click();await page.waitForFunction(()=>location.hash==='#history-pending');
  assert.equal(await page.locator('a[href="#quick-result/u241-a"]').count(),0,'settled entry is not pending');
  await page.locator('a[href="#quick-result/u241-b"]').click();await page.waitForSelector('#quickResultForm');
  await page.locator('#quickResultRefundDetails summary').click();
  await page.locator('#quickResultPayout').fill('0');
  await page.locator('#quickResultRefund').fill('500');
  assert.match(await page.locator('#quickResultNet').innerText(),/0円/);
  await page.locator('#quickResultSave').click();await page.waitForFunction(()=>location.hash==='#history-pending');
  await page.locator('a[href="#quick-result/u241-c"]').click();await page.waitForSelector('#quickResultForm');
  await page.locator('#quickResultMiss').click();await page.waitForFunction(()=>location.hash==='#history-pending');
  const result=await page.evaluate(async()=>{
   const d=await(await import('./db.js')).load();
   return {quick:d.simpleEntries.map(x=>({id:x.id,stake:x.stake,payout:x.payout,refund:x.refund,status:x.status})),detailed:d.lines.map(x=>({id:x.id,status:x.status,stake:x.stake}))};
  });
  assert.deepEqual(result.quick,[
   {id:'u241-a',stake:1000,payout:2200,refund:0,status:'settled'},
   {id:'u241-b',stake:500,payout:0,refund:500,status:'settled'},
   {id:'u241-c',stake:300,payout:0,refund:0,status:'settled'}
  ]);
  assert.equal(result.detailed.length,2);
  assert.ok(result.detailed.every(x=>x.status==='pending'&&x.stake===100),'detailed bets untouched');
  await page.evaluate(()=>location.hash='history');await page.waitForSelector('#historyList');
  const profitRows=await page.locator('#historyList .simple-history-row').evaluateAll(nodes=>nodes.map(el=>({
   date:el.dataset.historyDate,display:el.querySelector('.simple-history-amount')?.innerText,receipts:el.querySelector('.simple-history-receipts')?.innerText
  })));
  assert.equal(profitRows.length,3);
  assert.match(profitRows[0].display,/収支 [+＋]1,200円/);
  assert.match(profitRows[0].receipts,/2,200円/);
  assert.match(profitRows[1].display,/収支 [+＋]?0円/);
  assert.match(profitRows[1].receipts,/500円/);
  assert.match(profitRows[2].display,/収支 [-−]300円/);
  assert.match(profitRows[2].receipts,/0円/);
  await page.evaluate(()=>location.hash='quick-result/u241-a');await page.waitForSelector('#quickResultForm');
  assert.equal(await page.locator('#quickResultPayout').inputValue(),'2200','settled deeplink reveals recorded payout');
  for(const width of [320,390,440]){
   await page.setViewportSize({width,height:844});
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'result screen horizontal overflow '+width);
   assert.ok(await page.locator('#quickResultSave').evaluate(el=>el.getBoundingClientRect().height>=44),'tap target '+width);
  }
  assert.deepEqual(errors,[]);
  console.log('PASS UX v2.4.1: dedicated result entry, refund-only and losing bets, race pending CTA, search reset, data protection, mobile widths');
 }finally{if(browser)await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exit(1);});
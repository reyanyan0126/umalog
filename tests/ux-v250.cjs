const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
(async()=>{
 const root=path.resolve(__dirname,'..'),prefix=process.env.PUBLISH==='1'?'/publish/':'/';
 const server=http.createServer((req,res)=>{let p=decodeURIComponent(req.url.split('?')[0]);if(p.endsWith('/'))p+='index.html';try{res.setHeader('Content-Type',({'.js':'text/javascript','.html':'text/html','.css':'text/css','.svg':'image/svg+xml'}[path.extname(p)]||'application/octet-stream'));res.end(fs.readFileSync(path.join(root,p)));}catch{res.writeHead(404).end();}}).listen(8250,'127.0.0.1');
 let browser;
 try{
  const adapter=require(process.env.CHROMIUM_MODULE);
  browser=await chromium.launch({headless:true,executablePath:await adapter.executablePath(),args:adapter.args.filter(x=>x!=='--disable-web-security'&&x!=='--allow-running-insecure-content')});
  const ctx=await browser.newContext({viewport:{width:390,height:844}}),page=await ctx.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());page.setDefaultTimeout(20000);
  await page.goto('http://127.0.0.1:8250'+prefix);await page.waitForSelector('#homeQuickEntry');
  const original=await page.evaluate(async()=>{
   const db=await import('./db.js'),{makeSimpleEntry}=await import('./simple-ledger.js'),d=await db.load();
   d.simpleEntries=[
    makeSimpleEntry({date:'2026-10-20',stake:1000,status:'pending'},'old-no-payout'),
    makeSimpleEntry({date:'2026-10-19',stake:500,status:'settled',payout:700},'old-with-payout')
   ];
   d.races.push({id:'cash-race',date:'2026-10-18',venue:'札幌',number:11,name:'従来レース'});
   d.tickets.push({id:'cash-ticket',raceId:'cash-race',type:'単勝',kind:'reported',memo:'',createdAt:'2026-10-18T10:00:00Z'});
   d.lines.push({id:'cash-line',ticketId:'cash-ticket',numbers:[1],stake:200,status:'pending',payout:0,refund:0});
   await db.save(d);return JSON.stringify(await db.load());
  });
  await page.reload();await page.waitForSelector('#homeQuickEntry');
  assert.match(await page.locator('#homeSummary .home-profit').innerText(),/[-−]1,000円/);
  assert.match(await page.locator('#homeSummary').innerText(),/購入額.*1,700円/s);
  assert.equal(await page.locator('#homeCalendar .ledger-pending-mark').count(),0,'no pending markers');
  assert.doesNotMatch(await page.locator('#homeSummary').innerText(),/結果待ち/);
  assert.match(await page.locator('#homeCalendar [data-date="2026-10-20"]').innerText(),/[-−]1千|[-−]1,000/);
  await page.evaluate(()=>location.hash='history');await page.waitForSelector('#historyList');
  assert.equal(await page.locator('#historyPendingShortcut').count(),0,'pending shortcut removed');
  assert.match(await page.locator('#historyList').innerText(),/収支 [-−]1,000円/);
  assert.doesNotMatch(await page.locator('#historyList').innerText(),/結果待ち/);
  const beforeSave=await page.evaluate(async()=>JSON.stringify(await(await import('./db.js')).load()));
  assert.equal(beforeSave,original,'legacy data not migrated or changed on read');
  await page.evaluate(()=>location.hash='quick');await page.waitForSelector('#simpleEntryForm');
  assert.equal(await page.locator('#simpleStatus').count(),0,'no pending selector');
  assert.equal(await page.locator('#simpleMarkPending').count(),0,'no pending control');
  await page.locator('#simpleDate').fill('2026-10-20');
  await page.locator('#simpleStake').fill('300');
  assert.match(await page.locator('#simpleReview').innerText(),/収支 [-−]300円/);
  await page.locator('#simpleSave').click();await page.waitForFunction(()=>location.hash==='#history');
  const newData=await page.evaluate(async()=> (await(await import('./db.js')).load()).simpleEntries);
  assert.equal(newData.length,3);
  assert.equal(newData[2].status,'settled');
  assert.equal(newData[2].payout,0);
  assert.equal(newData[0].status,'pending','historic raw row kept for backup compatibility');
  await page.evaluate(()=>location.hash='quick-result/old-no-payout');await page.waitForSelector('#quickResultForm');
  assert.equal(await page.locator('#quickResultPayout').inputValue(),'0');
  await page.locator('#quickResultPayout').fill('1200');
  assert.match(await page.locator('#quickResultNet').innerText(),/\+200円/);
  await page.locator('#quickResultSave').click();await page.waitForFunction(()=>location.hash==='#history');
  await page.evaluate(()=>location.hash='home');await page.waitForSelector('#homeQuickEntry');
  assert.match(await page.locator('#homeSummary .home-profit').innerText(),/[-−]100円/);
  await page.evaluate(()=>location.hash='analysis');await page.waitForSelector('#analysisOverview');
  assert.match(await page.locator('#analysisOverview').innerText(),/[-−]100円/);
  assert.doesNotMatch(await page.locator('#analysisOverview').innerText(),/結果待ち/);
  for(const hash of ['home','history','quick','analysis']){
   await page.evaluate(h=>location.hash=h,hash);
   await page.waitForSelector(hash==='home'?'#homeQuickEntry':hash==='history'?'#historyList':hash==='quick'?'#simpleEntryForm':'#analysisOverview');
   for(const width of [320,390,440]){
    await page.setViewportSize({width,height:844});
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'overflow '+hash+' '+width);
   }
  }
  assert.deepEqual(errors,[]);
  console.log('PASS 2.5.0 cash accounting, no pending UX, non-mutating legacy read, zero-payout default, payout updates, mobile');
 }finally{if(browser)await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exit(1);});
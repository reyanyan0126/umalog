const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
(async()=>{
 const root=path.resolve(__dirname,'..'),prefix=process.env.PUBLISH==='1'?'/publish/':'/';
 const server=http.createServer((req,res)=>{
  let p=decodeURIComponent(req.url.split('?')[0]);if(p.endsWith('/'))p+='index.html';
  try{res.setHeader('Content-Type',({'.js':'text/javascript','.html':'text/html','.css':'text/css','.svg':'image/svg+xml'}[path.extname(p)]||'application/octet-stream'));res.end(fs.readFileSync(path.join(root,p)));}
  catch{res.writeHead(404).end();}
 }).listen(8245,'127.0.0.1');
 let browser;
 try{
  const a=require(process.env.CHROMIUM_MODULE);
  browser=await chromium.launch({headless:true,executablePath:await a.executablePath(),args:a.args.filter(x=>x!=='--disable-web-security'&&x!=='--allow-running-insecure-content')});
  const context=await browser.newContext({viewport:{width:390,height:844}}),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());page.setDefaultTimeout(18000);
  await page.goto('http://127.0.0.1:8245'+prefix);await page.waitForSelector('#homeQuickEntry');
  const original=await page.evaluate(async()=>{
   const db=await import('./db.js'),{makeSimpleEntry}=await import('./simple-ledger.js'),d=await db.load();
   d.simpleEntries=[
    makeSimpleEntry({date:'2026-10-20',stake:1000,status:'settled',payout:2500},'u243-positive'),
    makeSimpleEntry({date:'2026-10-19',stake:700,status:'settled',payout:0},'u243-negative'),
    makeSimpleEntry({date:'2026-10-18',stake:200,status:'pending'},'u243-pending')
   ];
   await db.save(d);return JSON.stringify(await db.load());
  });
  await page.reload();await page.waitForSelector('#homeQuickEntry');
  assert.match(await page.locator('#homeSummary .home-profit').getAttribute('aria-label'),/今月の確定収支：\+800円/,'spoken home summary includes amount');
  assert.match(await page.locator('#homeSummary .home-profit').innerText(),/\+800円/);
  await page.evaluate(()=>location.hash='history');await page.waitForSelector('#historyList');
  const rows=page.locator('#historyList .simple-history-row');
  assert.equal(await rows.count(),3);
  assert.match(await rows.nth(0).locator('.simple-history-amount').innerText(),/収支 \+1,500円/);
  assert.equal(await rows.nth(0).locator('.simple-history-amount span.positive').count(),1);
  assert.match(await rows.nth(1).locator('.simple-history-amount').innerText(),/収支 [-−]700円/);
  assert.equal(await rows.nth(1).locator('.simple-history-amount span.negative').count(),1);
  assert.match(await rows.nth(2).locator('.simple-history-amount').innerText(),/結果待ち/);
  await page.locator('a[href="#quick-result/u243-pending"]').click();
  await page.waitForSelector('#quickResultForm');
  assert.match(await page.locator('.quick-result-summary').innerText(),/購入額（変更なし）/);
  assert.equal(await page.locator('.quick-result-head a').getAttribute('href'),'#history-pending');
  const payout=page.locator('#quickResultPayout');
  await payout.fill('300');
  assert.match(await page.locator('#quickResultNet').innerText(),/\+100円/);
  assert.equal(await page.locator('#quickResultNet.quick-result-net-positive').count(),1);
  await payout.fill('0');
  assert.match(await page.locator('#quickResultNet').innerText(),/[-−]200円/);
  assert.equal(await page.locator('#quickResultNet.quick-result-net-negative').count(),1);
  assert.equal(await page.evaluate(async()=>JSON.stringify(await(await import('./db.js')).load())),original,'preview does not save');
  await page.locator('#quickResultMiss').click();
  await page.waitForFunction(()=>location.hash==='#history-pending');
  await page.evaluate(()=>location.hash='quick-result/u243-pending');
  await page.waitForSelector('#quickResultForm');
  assert.equal(await page.locator('.quick-result-head a').getAttribute('href'),'#history','settled entries return to full history');
  await page.locator('#quickResultPayout').fill('400');
  await page.locator('#quickResultSave').click();
  await page.waitForFunction(()=>location.hash==='#history');
  const state=await page.evaluate(async()=>{
   const d=await(await import('./db.js')).load();
   return d.simpleEntries.map(x=>({id:x.id,stake:x.stake,payout:x.payout,refund:x.refund,status:x.status}));
  });
  assert.deepEqual(state,[
   {id:'u243-positive',stake:1000,payout:2500,refund:0,status:'settled'},
   {id:'u243-negative',stake:700,payout:0,refund:0,status:'settled'},
   {id:'u243-pending',stake:200,payout:400,refund:0,status:'settled'}
  ]);
  for(const route of ['home','history','quick-result/u243-pending']){
   await page.evaluate(hash=>location.hash=hash,route);
   await page.waitForFunction(route=>location.hash==='#'+route,route);
   await page.waitForSelector(route==='home'?'#homeQuickEntry':route==='history'?'#historyList':'#quickResultForm');
   for(const width of [320,390,440]){
    await page.setViewportSize({width,height:844});
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),route+' horizontal overflow '+width);
   }
  }
  await page.evaluate(()=>location.hash='history');await page.waitForSelector('#historyList');
  await page.setViewportSize({width:390,height:844});
  await page.addStyleTag({content:'html{font-size:200%!important}'});
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'history 200% text overflow');
  assert.deepEqual(errors,[]);
  console.log('PASS v2.4.3: accessible finance label, signed profit, result-preview classes, safe saves, full-history back, mobile widths and text zoom');
 }finally{if(browser)await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exit(1);});
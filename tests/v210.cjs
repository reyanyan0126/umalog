const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
(async()=>{
 const root=path.resolve(__dirname,'..'),prefix=process.env.PUBLISH==='1'?'/publish/':'/';
 const server=http.createServer((req,res)=>{
  let p=decodeURIComponent(req.url.split('?')[0]);if(p.endsWith('/'))p+='index.html';
  try{res.setHeader('Content-Type',({'.js':'text/javascript','.html':'text/html','.css':'text/css','.svg':'image/svg+xml'}[path.extname(p)]||'application/octet-stream'));res.end(fs.readFileSync(path.join(root,p)));}
  catch{res.writeHead(404).end();}
 }).listen(8210,'127.0.0.1');
 let browser;
 try{
  const a=require(process.env.CHROMIUM_MODULE);
  browser=await chromium.launch({headless:true,executablePath:await a.executablePath(),args:a.args.filter(x=>x!=='--disable-web-security'&&x!=='--allow-running-insecure-content')});
  const context=await browser.newContext({viewport:{width:390,height:844}}),page=await context.newPage(),errors=[],dialogs=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>{dialogs.push(d.message());d.accept();});page.setDefaultTimeout(18000);
  const nav=async route=>{await page.evaluate(r=>location.hash=r,route);await page.waitForTimeout(120);};
  await page.goto('http://127.0.0.1:8210'+prefix);await page.waitForSelector('#homeEntry');
  assert.equal(await page.locator('#homeQuickEntry').isVisible(),true);
  const legacy=await page.evaluate(async()=>JSON.stringify(await(await import('./db.js')).load()));
  await page.locator('#homeQuickEntry').click();await page.waitForSelector('#simpleEntryForm');
  assert.equal(await page.locator('#simpleDate').inputValue().then(v=>/^\d{4}-\d\d-\d\d$/.test(v)),true);
  await page.locator('#simpleDate').fill('2026-10-19');
  await page.locator('#simpleStake').fill('1500');
  assert.match(await page.locator('#simpleReview').innerText(),/1,500円/);
  assert.equal(await page.evaluate(async()=>JSON.stringify(await(await import('./db.js')).load())),legacy);
  await page.locator('#simpleSave').click();
  await page.waitForFunction(()=>location.hash==='#history');
  let saved=await page.evaluate(async()=>(await(await import('./db.js')).load()));
  assert.equal(saved.simpleEntries.length,1);assert.equal(saved.simpleEntries[0].stake,1500);
  assert.equal(saved.simpleEntries[0].status,'pending');
  assert.equal(saved.lines.length,0);
  assert.match(await page.locator('#historyFinanceOverview').innerText(),/1,500円/);
  assert.match(await page.locator('#historyFinanceOverview').innerText(),/結果待ち/);
  await page.locator('#quickHistorySection a[href^="#quick-edit"]').click();await page.waitForSelector('#simpleEntryForm');
  await page.locator('.simple-optional summary').click();
  await page.locator('#simpleVenue').selectOption('札幌');
  await page.locator('#simpleNumber').selectOption('11');
  await page.locator('#simpleType').selectOption('ワイド');
  await page.locator('#simpleName').fill('詳細入力なしの記録');
  await page.locator('#simpleResultSection summary').click();
  await page.locator('#simpleStatus').selectOption('settled');
  await page.locator('#simplePayout').fill('3000');
  await page.locator('#simpleSave').click();await page.waitForFunction(()=>location.hash==='#history');
  saved=await page.evaluate(async()=>(await(await import('./db.js')).load()));
  assert.equal(saved.simpleEntries.length,1);
  assert.equal(saved.simpleEntries[0].venue,'札幌');
  assert.equal(saved.simpleEntries[0].type,'ワイド');
  assert.equal(saved.simpleEntries[0].payout,3000);
  assert.match(await page.locator('#historyFinanceOverview').innerText(),/3,000円/);
  assert.match(await page.locator('#historyFinanceOverview').innerText(),/1,500円/);
  await nav('analysis');await page.waitForSelector('#analysisBasics');
  assert.match(await page.locator('#analysisBasics').innerText(),/総支出/);
  assert.match(await page.locator('#analysisBasics').innerText(),/1,500円/);
  assert.match(await page.locator('#analysisBasics').innerText(),/券種判明 1/);
  await nav('calendar');await page.waitForSelector('#ledgerCalendar');
  await page.locator('#month').fill('2026-10');await page.locator('#month').dispatchEvent('change');
  await page.locator('[data-date="2026-10-19"]').click();
  assert.match(await page.locator('#ledgerDayDetail').innerText(),/かんたん支出/);
  await nav('history');await page.waitForSelector('#quickHistorySection');
  await page.locator('#quickHistorySection a[href^="#quick-edit"]').click();await page.waitForSelector('#simpleDelete');
  await page.locator('#simpleDelete').click();await page.waitForFunction(()=>location.hash==='#history');
  saved=await page.evaluate(async()=>(await(await import('./db.js')).load()));
  assert.equal(saved.simpleEntries.length,0);
  assert.equal(saved.lines.length,0);
  await nav('quick');await page.waitForSelector('#simpleEntryForm');
  for(const width of [320,390,440]){
   await page.setViewportSize({width,height:844});
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'quick overflow '+width);
  }
  assert.deepEqual(errors,[]);
  assert.equal(dialogs.filter(t=>t.includes('支出として記録')).length,0,'explicit save does not require a second confirmation');
  console.log('PASS v2.1.0: amount-only -> history -> enrich -> settle -> inclusive analysis/calendar -> delete, legacy data and iPhone widths');
 }finally{if(browser)await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exit(1);});

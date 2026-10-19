const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
(async()=>{
 const root=path.resolve(__dirname,'..'),prefix=process.env.PUBLISH==='1'?'/publish/':'/';
 const server=http.createServer((req,res)=>{
  let p=decodeURIComponent(req.url.split('?')[0]);if(p.endsWith('/'))p+='index.html';
  try{res.setHeader('Content-Type',({'.js':'text/javascript','.html':'text/html','.css':'text/css','.svg':'image/svg+xml'}[path.extname(p)]||'application/octet-stream'));res.end(fs.readFileSync(path.join(root,p)));}
  catch{res.writeHead(404).end();}
 }).listen(8240,'127.0.0.1');
 let browser;
 try{
  const cfg=require(process.env.CHROMIUM_MODULE);
  browser=await chromium.launch({headless:true,executablePath:await cfg.executablePath(),args:cfg.args.filter(x=>x!=='--disable-web-security'&&x!=='--allow-running-insecure-content')});
  const context=await browser.newContext({viewport:{width:390,height:844}}),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());page.setDefaultTimeout(20000);
  await page.goto('http://127.0.0.1:8240'+prefix);await page.waitForSelector('#homeCalendar #ledgerCalendar');
  const original=await page.evaluate(async()=>{
   const {load,save}=await import('./db.js'),{makeSimpleEntry}=await import('./simple-ledger.js'),d=await load();
   d.simpleEntries=[makeSimpleEntry({date:'2026-10-18',stake:1200,venue:'東京',type:'単勝',status:'settled',payout:2000,refund:0,number:null,name:'',memo:''},'calendar-sample')];
   await save(d);return JSON.stringify(await load());
  });
  await page.reload();await page.waitForSelector('#homeCalendar #ledgerCalendar');
  assert.deepEqual(await page.locator('nav a').evaluateAll(links=>links.map(x=>[x.getAttribute('href'),x.innerText.trim()])),[['#home','ホーム'],['#quick','記録'],['#history','履歴'],['#analysis','分析']]);
  assert.equal(await page.locator('#homeSummary .home-minimal-totals .metric').count(),2);
  assert.equal(await page.locator('#homeQuickEntry').getAttribute('href'),'#quick');
  assert.equal(await page.locator('#homeEntry').getAttribute('href'),'#entry');
  assert.equal(await page.locator('a[href="#growth"]').count(),1);
  await page.locator('#month').fill('2026-10');await page.locator('#month').dispatchEvent('change');
  await page.waitForSelector('#homeCalendar [data-date="2026-10-18"]');
  assert.match(await page.locator('#homeCalendar [data-date="2026-10-18"]').getAttribute('aria-label'),/800円/);
  await page.locator('#homeCalendar [data-date="2026-10-18"]').click();
  assert.equal(await page.locator('#homeCalendar .ledger-detail a[href="#quick-date/2026-10-18"]').count(),1,'dated quick entry');
  assert.equal(await page.locator('#homeCalendar .ledger-detail a[href="#entry-date/2026-10-18"]').count(),1,'advanced registration still available');
  assert.equal(await page.locator('#homeCalendar .ledger-detail a[href="#day/2026-10-18"]').count(),1,'daily ledger still available');
  await page.locator('#homeCalendar .ledger-detail a[href="#quick-date/2026-10-18"]').click();
  await page.waitForSelector('#simpleEntryForm');
  assert.equal(await page.locator('#simpleDate').inputValue(),'2026-10-18');
  assert.equal((await page.locator('nav a[aria-current="page"]').getAttribute('href')),'#quick');
  await page.evaluate(()=>location.hash='home');await page.waitForSelector('#homeCalendar #ledgerCalendar');
  await page.locator('#monthPrev').click();
  assert.equal(await page.locator('#month').inputValue(),'2026-09');
  await page.locator('#monthNext').click();
  assert.equal(await page.locator('#month').inputValue(),'2026-10');
  await page.locator('#calendarMetric').selectOption('purchase');
  assert.match(await page.locator('#homeCalendar [data-date="2026-10-18"]').getAttribute('aria-label'),/購入額 [+＋]?1,200円/);
  await page.locator('#calendarMetric').selectOption('profit');
  await page.evaluate(()=>location.hash='calendar');await page.waitForSelector('h1');
  assert.equal(await page.locator('h1').first().innerText(),'収支カレンダー','legacy calendar deep links remain');
  await page.evaluate(()=>location.hash='growth');await page.waitForSelector('.nursery');
  await page.evaluate(()=>location.hash='home');await page.waitForSelector('#homeCalendar #ledgerCalendar');
  assert.equal(await page.evaluate(async()=>JSON.stringify(await(await import('./db.js')).load())),original,'UI navigation does not modify ledger');
  for(const width of [320,390,440]){
   await page.setViewportSize({width,height:844});
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'horizontal home overflow '+width);
   const count=await page.locator('#homeCalendar .ledger-day').count();assert.ok(count>=28&&count<=31);
   assert.equal(await page.locator('nav a').count(),4);
  }
  assert.deepEqual(errors,[]);
  console.log('PASS simplified home and calendar: 4-tab dock, full calendar, dated quick entry, monthly navigation, deep links, iPhone widths and storage');
 }finally{if(browser)await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exit(1);});

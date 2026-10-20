const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
(async()=>{
 const root=path.resolve(__dirname,'..'),prefix=process.env.PUBLISH==='1'?'/publish/':'/';
 const server=http.createServer((req,res)=>{
  let p=decodeURIComponent(req.url.split('?')[0]);if(p.endsWith('/'))p+='index.html';
  try{res.setHeader('Content-Type',({'.js':'text/javascript','.html':'text/html','.css':'text/css','.svg':'image/svg+xml'}[path.extname(p)]||'application/octet-stream'));res.end(fs.readFileSync(path.join(root,p)));}
  catch{res.writeHead(404).end();}
 }).listen(8241,'127.0.0.1');
 let browser;
 try{
  const adapter=require(process.env.CHROMIUM_MODULE);
  browser=await chromium.launch({headless:true,executablePath:await adapter.executablePath(),args:adapter.args.filter(x=>x!=='--disable-web-security'&&x!=='--allow-running-insecure-content')});
  const context=await browser.newContext({viewport:{width:390,height:844}}),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(18000);
  await page.goto('http://127.0.0.1:8241'+prefix);await page.waitForSelector('#homeQuickEntry');
  await page.evaluate(async()=>{
   const {load,save}=await import('./db.js'),{makeSimpleEntry}=await import('./simple-ledger.js');
   const d=await load();
   d.simpleEntries=[
    makeSimpleEntry({date:'2026-10-19',stake:1000,status:'settled',payout:2500,refund:0},'ux4-settled'),
    makeSimpleEntry({date:'2026-10-19',stake:500,status:'pending'},'ux4-pending')
   ];
   await save(d);
  });
  await page.reload();await page.waitForSelector('#homeQuickEntry');
  await page.evaluate(()=>location.hash='analysis');await page.waitForSelector('#analysisOverview');
  assert.equal(await page.locator('#analysisAdvanced').evaluate(e=>e.open),false);
  assert.equal(await page.locator('#analysisQuickPeriod').isVisible(),true);
  assert.equal(await page.locator('#analysisAllTime').getAttribute('aria-pressed'),'true');
  await page.locator('#analysisCurrentMonth').click();
  assert.equal(await page.locator('#analysisRange').inputValue(),'month');
  assert.equal(await page.locator('#analysisCurrentMonth').getAttribute('aria-pressed'),'true');
  assert.match(await page.locator('#analysisScopeLabel').innerText(),/2026-10/);
  await page.locator('#analysisAllTime').click();
  assert.equal(await page.locator('#analysisRange').inputValue(),'all');
  assert.equal(await page.locator('#analysisAllTime').getAttribute('aria-pressed'),'true');
  assert.equal(await page.locator('#analysisOverview').isVisible(),true);
  assert.equal(await page.locator('#analysisSimpleMonthly').isVisible(),true);
  assert.match(await page.locator('#analysisOverview').innerText(),/1,500円/);
  assert.match(await page.locator('#analysisOverview').innerText(),/250\.0％/);
  assert.match(await page.locator('#analysisOverview').innerText(),/結果待ち/);
  assert.equal(await page.locator('[data-summary-month="2026-10"]').count(),1);
  assert.equal(await page.locator('#analysisCategoryCompare').isVisible(),false);
  await page.locator('#analysisAdvanced > summary').click();
  assert.equal(await page.locator('#analysisCategoryCompare').isVisible(),true);
  await page.locator('#analysisRange').selectOption('month');
  assert.equal(await page.locator('#analysisAdvanced').evaluate(e=>e.open),true,'advanced disclosure stays open after rerender');
  assert.match(await page.locator('#analysisBasics').innerText(),/総支出/);
  assert.equal(await page.locator('#analysisSimpleMonthly').isVisible(),true);
  for(const width of [320,390,440]){
   await page.setViewportSize({width,height:844});
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'analysis overflow '+width);
  }
  const stored=await page.evaluate(async()=>{const d=await(await import('./db.js')).load();return {simple:d.simpleEntries.length,version:d.schemaVersion};});
  assert.deepEqual(stored,{simple:2,version:1});assert.deepEqual(errors,[]);
  console.log('PASS ux4: essential profitability, recovery rate, monthly trend, disclosure persistence, data safety and widths');
 }finally{if(browser)await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exit(1);});

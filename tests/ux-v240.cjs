const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
(async()=>{
 const root=path.resolve(__dirname,'..'),prefix=process.env.PUBLISH==='1'?'/publish/':'/';
 const server=http.createServer((req,res)=>{
  let p=decodeURIComponent(req.url.split('?')[0]);if(p.endsWith('/'))p+='index.html';
  try{res.setHeader('Content-Type',({'.js':'text/javascript','.html':'text/html','.css':'text/css','.svg':'image/svg+xml'}[path.extname(p)]||'application/octet-stream'));res.end(fs.readFileSync(path.join(root,p)));}
  catch{res.writeHead(404).end();}
 }).listen(8243,'127.0.0.1');
 let browser;
 try{
  const adapter=require(process.env.CHROMIUM_MODULE);
  browser=await chromium.launch({headless:true,executablePath:await adapter.executablePath(),args:adapter.args.filter(x=>x!=='--disable-web-security'&&x!=='--allow-running-insecure-content')});
  const context=await browser.newContext({viewport:{width:390,height:844}}),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(20000);
  await page.goto('http://127.0.0.1:8243'+prefix);await page.waitForSelector('#homeQuickEntry');
  await page.evaluate(async()=>{
   const db=await import('./db.js'),{makeSimpleEntry}=await import('./simple-ledger.js'),data=await db.load();
   data.simpleEntries=[
    makeSimpleEntry({date:'2026-10-20',stake:1000,status:'pending',venue:'東京',type:'単勝'},'v240-pending'),
    makeSimpleEntry({date:'2026-10-18',stake:500,status:'settled',payout:600,refund:0},'v240-settled')
   ];
   await db.save(data);
  });
  await page.reload();await page.waitForSelector('#homeQuickEntry');
  assert.equal(await page.locator('#homeSummary a[href="#history-pending"]').count(),1);
  await page.locator('#homeSummary a[href="#history-pending"]').click();
  await page.waitForSelector('#historyPendingShortcut');
  assert.equal(await page.locator('#sf').inputValue(),'pending');
  assert.equal(await page.locator('#historyList .simple-history-row').count(),1);
  assert.equal(await page.locator('#historyActiveFilters').isVisible(),true);
  assert.equal(await page.locator('#historyPendingShortcut').getAttribute('aria-pressed'),'true');
  await page.locator('a[href="#quick-result/v240-pending"]').click();
  await page.waitForSelector('#quickResultForm');
  assert.equal(await page.locator('#simpleEntryForm').count(),0,'dedicated result screen hides editing complexity');
  assert.equal(await page.locator('#quickResultPayout').isVisible(),true);
  assert.equal(await page.locator('#quickResultPayout').inputValue(),'');
  assert.equal(await page.locator('#quickResultSave').innerText(),'結果を確定して保存');
  await page.locator('#quickResultSave').click();
  assert.equal(new URL(page.url()).hash,'#quick-result/v240-pending','empty payout must not settle');
  assert.equal((await page.evaluate(async()=> (await(await import('./db.js')).load()).simpleEntries[0].status)),'pending');
  await page.locator('#quickResultPayout').fill('2500');
  assert.match(await page.locator('#quickResultNet').innerText(),/1,500円/);
  await page.locator('#quickResultSave').click();
  await page.waitForFunction(()=>location.hash==='#history-pending');
  assert.equal(await page.locator('#historyList .simple-history-row').count(),0);
  const stored=await page.evaluate(async()=>{
   const d=await(await import('./db.js')).load();
   return d.simpleEntries.map(x=>({id:x.id,stake:x.stake,status:x.status,payout:x.payout,refund:x.refund}));
  });
  assert.deepEqual(stored,[
   {id:'v240-pending',stake:1000,status:'settled',payout:2500,refund:0},
   {id:'v240-settled',stake:500,status:'settled',payout:600,refund:0}
  ],'no lost purchase amounts or unrelated records');
  await page.evaluate(()=>location.hash='analysis');await page.waitForSelector('#analysisQuickPeriod');
  assert.equal(await page.locator('#analysisAllTime').getAttribute('aria-pressed'),'true');
  await page.locator('#analysisCurrentMonth').click();
  assert.equal(await page.locator('#analysisRange').inputValue(),'month');
  assert.match(await page.locator('#analysisScopeLabel').innerText(),/2026-10/);
  await page.locator('#analysisAllTime').click();
  assert.equal(await page.locator('#analysisRange').inputValue(),'all');
  await page.evaluate(()=>location.hash='home');await page.waitForSelector('#homeQuickEntry');
  for(const width of [320,390,440]){
   await page.setViewportSize({width,height:844});
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'mobile horizontal scroll '+width);
   assert.ok(await page.locator('#homeQuickEntry').evaluate(el=>el.getBoundingClientRect().height>=44));
  }
  await page.setViewportSize({width:320,height:844});
  await page.addStyleTag({content:'html{font-size:200%!important}'});
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'200% text should not overflow');
  await page.emulateMedia({reducedMotion:'reduce'});
  assert.deepEqual(errors,[]);
  console.log('PASS v2.4.0: one-tap pending shortcut, protected settlement, fast month/all analysis, small-screen/touch/reduced-motion/200%-text source and publish');
 }finally{if(browser)await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exit(1);});
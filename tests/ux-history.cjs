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
  const adapter=require(process.env.CHROMIUM_MODULE);
  browser=await chromium.launch({headless:true,executablePath:await adapter.executablePath(),args:adapter.args.filter(x=>x!=='--disable-web-security'&&x!=='--allow-running-insecure-content')});
  const context=await browser.newContext({viewport:{width:390,height:844}}),page=await context.newPage(),errors=[];
  page.on('pageerror',err=>errors.push(err.message));page.setDefaultTimeout(18000);
  await page.goto('http://127.0.0.1:8240'+prefix);await page.waitForSelector('#homeQuickEntry');
  await page.evaluate(async()=>{
   const db=await import('./db.js'),{makeSimpleEntry}=await import('./simple-ledger.js');
   const data=await db.load();
   data.races.push({id:'ux3-race',date:'2026-10-18',venue:'東京',number:11,name:'時系列テスト'});
   data.tickets.push({id:'ux3-ticket',raceId:'ux3-race',type:'単勝',kind:'reported',memo:'',createdAt:'2026-10-18T10:00:00Z'});
   data.lines.push({id:'ux3-line',ticketId:'ux3-ticket',numbers:[1],stake:500,status:'settled',payout:1000,refund:0});
   data.simpleEntries=[
    makeSimpleEntry({date:'2026-10-19',stake:1200,status:'pending'},'ux3-new'),
    makeSimpleEntry({date:'2026-10-17',stake:2000,status:'settled',payout:0,refund:0},'ux3-old')
   ];
   await db.save(data);
  });
  await page.goto('http://127.0.0.1:8240'+prefix+'#history');await page.waitForSelector('#historyCount');
  const entries=page.locator('#historyList > [data-history-kind]');
  assert.deepEqual(await entries.evaluateAll(nodes=>nodes.map(n=>[n.dataset.historyDate,n.dataset.historyKind])),
   [['2026-10-19','quick'],['2026-10-18','race'],['2026-10-17','quick']]);
  assert.equal(await page.locator('#quickHistorySection').count(),0,'no independent quick list');
  assert.equal(await page.locator('#historyAdvancedFilters').getAttribute('open'),null);
  assert.equal(await page.locator('#historyClearFilters').count(),1);
  assert.equal(await page.locator('#historyPendingShortcut').count(),1);
  assert.equal(await page.locator('.history-finance-details').getAttribute('open'),null);
  assert.equal(await page.locator('#historySearch').isVisible(),true);
  assert.equal(await entries.nth(0).locator('a[href^="#quick-edit/"]').count(),1);
  assert.equal(await entries.nth(1).locator('.history-bet-details').count(),1);
  assert.equal(await page.locator('#historyCount').innerText().then(x=>x.includes('3件の記録')),true);
  await page.locator('#historySearch').fill('時系列テスト');
  assert.deepEqual(await entries.evaluateAll(nodes=>nodes.map(n=>n.dataset.historyDate)),['2026-10-18']);
  await page.locator('#historySearch').fill('');
  await page.locator('#historyAdvancedFilters summary').click();
  await page.locator('#sf').selectOption('pending');
  assert.deepEqual(await entries.evaluateAll(nodes=>nodes.map(n=>n.dataset.historyDate)),['2026-10-19']);
  await page.locator('#sf').selectOption('');
  await page.locator('#vf').selectOption('東京');
  assert.deepEqual(await entries.evaluateAll(nodes=>nodes.map(n=>n.dataset.historyDate)),['2026-10-18']);
  await page.locator('#historyClearFilters').click();
  assert.equal(await entries.count(),3);
  await page.locator('.history-finance-details summary').click();
  assert.match(await page.locator('#historyFinanceOverview').innerText(),/3,700円/);
  assert.match(await page.locator('#historyFinanceOverview').innerText(),/結果待ち/);
  for(const width of [320,390,440]){
   await page.setViewportSize({width,height:844});
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'history overflow '+width);
  }
  const stored=await page.evaluate(async()=>{const d=await(await import('./db.js')).load();return {simple:d.simpleEntries.length,detail:d.lines.length,version:d.schemaVersion};});
  assert.deepEqual(stored,{simple:2,detail:1,version:1});
  assert.deepEqual(errors,[]);
  console.log('PASS ux3: unified chronology, filter across entry kinds, edit links, finance and iPhone widths');
 }finally{if(browser)await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exit(1);});

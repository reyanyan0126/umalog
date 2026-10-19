const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
(async()=>{
 const root=path.resolve(__dirname,'..'),prefix=process.env.PUBLISH==='1'?'/publish/':'/';
 const server=http.createServer((req,res)=>{
  let p=decodeURIComponent(req.url.split('?')[0]);if(p.endsWith('/'))p+='index.html';
  try{res.setHeader('Content-Type',({'.js':'text/javascript','.html':'text/html','.css':'text/css','.svg':'image/svg+xml'}[path.extname(p)]||'application/octet-stream'));res.end(fs.readFileSync(path.join(root,p)));}
  catch{res.writeHead(404).end();}
 }).listen(8222,'127.0.0.1');
 let browser;
 try{
  const a=require(process.env.CHROMIUM_MODULE);
  browser=await chromium.launch({headless:true,executablePath:await a.executablePath(),args:a.args.filter(x=>x!=='--disable-web-security'&&x!=='--allow-running-insecure-content')});
  const context=await browser.newContext({viewport:{width:390,height:844}}),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());page.setDefaultTimeout(18000);
  await page.goto('http://127.0.0.1:8222'+prefix);await page.waitForSelector('#homeQuickEntry');
  const original=await page.evaluate(async()=>{
   const {load,save}=await import('./db.js'),{makeSimpleEntry}=await import('./simple-ledger.js');
   const data=await load();
   data.races.push({id:'race-oct',date:'2026-10-05',venue:'東京',number:11,name:'秋レース'},{id:'race-sep',date:'2026-09-20',venue:'札幌',number:10,name:'九月レース'});
   data.tickets.push({id:'ticket-oct',raceId:'race-oct',type:'単勝',kind:'reported',memo:'秋の購入',createdAt:'2026-10-05T01:00:00Z'},{id:'ticket-sep',raceId:'race-sep',type:'ワイド',kind:'reported',memo:'九月の購入',createdAt:'2026-09-20T01:00:00Z'});
   data.lines.push({id:'line-oct',ticketId:'ticket-oct',numbers:[1],stake:500,status:'settled',payout:1000,refund:0},{id:'line-sep',ticketId:'ticket-sep',numbers:[1,2],stake:100,status:'settled',payout:0,refund:0});
   data.simpleEntries=[
    ...Array.from({length:111},(_,i)=>makeSimpleEntry({date:'2026-10-05',stake:100,venue:'東京',number:null,type:'単勝',name:i===0?'対象メモ':'',memo:'',status:i%2===0?'pending':'settled',payout:0,refund:0},'oct-'+i)),
    ...Array.from({length:20},(_,i)=>makeSimpleEntry({date:'2026-09-20',stake:100,venue:'札幌',number:null,type:'ワイド',name:'',memo:'',status:'pending',payout:0,refund:0},'sep-'+i))
   ];
   await save(data);return JSON.stringify(await load());
  });
  await page.reload();await page.waitForSelector('#homeQuickEntry');
  await page.evaluate(()=>location.hash='history');await page.waitForSelector('#historyCount');
  await page.locator('#historyAdvancedFilters summary').click();
  await page.locator('.history-finance-details summary').click();
  assert.match(await page.locator('#historyCount').innerText(),/詳細 2レース・かんたん支出 131件/);
  assert.equal(await page.locator('#historyList .simple-history-row').count(),49);
  assert.equal(await page.locator('#historyMore').isVisible(),true);
  assert.match(await page.locator('#historyFinanceOverview').innerText(),/13,700円/);
  await page.locator('#historyMore').click();
  await page.locator('#historyMore').click();
  assert.equal(await page.locator('#historyList .simple-history-row').count(),131);
  assert.equal(await page.locator('#historyMore').isVisible(),false);
  await page.locator('#historyFrom').fill('2026-10-01');await page.locator('#historyFrom').dispatchEvent('change');
  await page.locator('#historyTo').fill('2026-10-31');await page.locator('#historyTo').dispatchEvent('change');
  assert.match(await page.locator('#historyCount').innerText(),/詳細 1レース・かんたん支出 111件/);
  assert.equal(await page.locator('#historyList .simple-history-row').count(),49,'filter resets combined pagination');
  assert.match(await page.locator('#historyFinanceOverview').innerText(),/11,600円/);
  assert.equal(await page.locator('#historyList .history-race').count(),1);
  await page.locator('#historyTo').fill('2026-09-01');await page.locator('#historyTo').dispatchEvent('change');
  assert.match(await page.locator('#historyPeriodWarning').innerText(),/開始日が終了日より後/);
  assert.match(await page.locator('#historyCount').innerText(),/詳細 0レース・かんたん支出 0件/);
  await page.locator('#historyClearPeriod').click();
  assert.equal(await page.locator('#historyFrom').inputValue(),'');
  assert.equal(await page.locator('#historyTo').inputValue(),'');
  assert.match(await page.locator('#historyCount').innerText(),/かんたん支出 131件/);
  await page.locator('#historySearch').fill('対象メモ');
  assert.match(await page.locator('#historyCount').innerText(),/詳細 0レース・かんたん支出 1件/);
  await page.locator('#historyClearFilters').click();
  assert.equal(await page.locator('#historySearch').inputValue(),'');
  await page.locator('#historyThisMonth').click();
  assert.match(await page.locator('#historyFrom').inputValue(),/^\d{4}-\d\d-01$/);
  assert.match(await page.locator('#historyTo').inputValue(),/^\d{4}-\d\d-\d\d$/);
  await page.locator('#historyClearFilters').click();
  assert.match(await page.locator('#historyCount').innerText(),/詳細 2レース・かんたん支出 131件/);
  for(const width of [320,390,440]){
   await page.setViewportSize({width,height:844});
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'history horizontal overflow '+width);
  }
  assert.equal(await page.evaluate(async()=>JSON.stringify(await(await import('./db.js')).load())),original,'filter/pagination are read-only');
  assert.deepEqual(errors,[]);
  console.log('PASS v2.2.0-dev.2: combined chronology and >100 shared pagination, totals, date/search filtering, reset, iPhone widths and original data');
 }finally{if(browser)await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exit(1);});

const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
(async()=>{
 const root=path.resolve(__dirname,'..'),prefix=process.env.PUBLISH==='1'?'/publish/':'/',passed=[];
 const server=http.createServer((req,res)=>{let p=decodeURIComponent(req.url.split('?')[0]);if(p.endsWith('/'))p+='index.html';try{res.setHeader('Content-Type',({'.js':'text/javascript','.html':'text/html','.css':'text/css','.svg':'image/svg+xml'}[path.extname(p)]||'application/octet-stream'));res.end(fs.readFileSync(path.join(root,p)));}catch{res.writeHead(404).end();}}).listen(8018,'127.0.0.1');
 let browser;
 try{
  const c=require(process.env.CHROMIUM_MODULE);
  browser=await chromium.launch({headless:true,executablePath:await c.executablePath(),args:c.args.filter(x=>x!=='--disable-web-security'&&x!=='--allow-running-insecure-content')});
  const context=await browser.newContext({viewport:{width:390,height:844},acceptDownloads:true}),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(15000);
  const pass=async(label,fn)=>{await fn();passed.push(label);console.log('PASS '+label);};
  const nav=async hash=>{await page.evaluate(h=>location.hash=h,hash);await page.waitForTimeout(200);};
  const loadData=()=>page.evaluate(async()=>{const d=await import('./db.js');return d.load();});
  await page.goto('http://127.0.0.1:8018'+prefix);await page.waitForSelector('.hero');
  await page.evaluate(async()=>{
   const {save}=await import('./db.js'),{emptyData}=await import('./core.js');
   const d=emptyData();d.races=[{id:'r1',date:'2026-10-17',venue:'東京',number:8,name:'テスト記録'},{id:'r2',date:'2026-10-18',venue:'京都',number:9,name:'別の記録'}];
   const createdAt='2026-10-17T09:00:00Z';
   d.tickets=[{id:'t1',raceId:'r1',type:'ワイド',kind:'reported',memo:'',createdAt},{id:'t2',raceId:'r1',type:'複勝',kind:'reported',memo:'',createdAt},{id:'t3',raceId:'r2',type:'単勝',kind:'reported',memo:'',createdAt}];
   d.lines=[{id:'l1',ticketId:'t1',numbers:[1,2],stake:100,status:'settled',payout:300,refund:0,purchaseMode:'normal'},{id:'l2',ticketId:'t1',numbers:[1,3],stake:100,status:'settled',payout:0,refund:0,purchaseMode:'normal'},{id:'l3',ticketId:'t2',numbers:[5],stake:100,status:'void',payout:0,refund:100,purchaseMode:'normal'},{id:'l4',ticketId:'t3',numbers:[3],stake:100,status:'pending',payout:0,refund:0,purchaseMode:'normal'}];
   await save(d);
  });
  await page.reload();await page.waitForSelector('.hero');
  await pass('dev16 history groups same race tickets and filters without merging',async()=>{
   await nav('history');await page.waitForSelector('.history-race');
   assert.equal(await page.locator('.history-race').count(),2);
   assert.match(await page.locator('.history-race').last().innerText(),/2券種/);
   await page.locator('#tf').selectOption('複勝');assert.equal(await page.locator('.history-race').count(),1);
   await page.locator('#tf').selectOption('');assert.equal(await page.locator('.history-race').count(),2);
  });
  await pass('dev16 edit one line via modal with review, leave sibling purchase unchanged',async()=>{
   await page.locator('.history-race').last().locator('.history-bet-details > summary').click();
   await page.locator('.history-race').last().locator('.history-ticket').first().locator('details summary').click();
   await page.locator('[data-quick-edit="l1"]').click();await page.waitForSelector('dialog[open]');
   await page.locator('#correctStake').fill('200');await page.locator('#correctMode').selectOption('hit');await page.locator('#correctPayout').fill('750');
   await page.locator('#correctionReview').click();assert.equal(await page.locator('#correctionConfirm').isVisible(),true);
   await page.locator('#correctionSave').click();await page.waitForSelector('dialog[open]',{state:'detached'});
   const d=await loadData();assert.deepEqual([d.lines[0].stake,d.lines[0].payout],[200,750]);
   assert.deepEqual([d.lines[1].stake,d.lines[1].payout],[100,0]);assert.equal(d.lines[2].refund,100);
  });
  await pass('dev16 daily figures reflect saved correction with no double counting',async()=>{
   await nav('day/2026-10-17');await page.waitForSelector('.day-summary');
   const s=await page.locator('.day-summary').innerText();assert.match(s,/400円/);assert.match(s,/750円/);assert.match(s,/\+450円/);
   await page.locator('.day-ticket-edit summary').first().click();await page.locator('[data-quick-edit="l1"]').click();
   await page.locator('#correctStake').fill('0');await page.locator('#correctionReview').click();
   assert.match(await page.locator('#correctionPreview').innerText(),/100円単位/);
   assert.equal(await page.locator('#correctionConfirm').isVisible(),false);
   await page.locator('#correctStake').fill('200');await page.locator('#correctionClose').click();
   await page.waitForSelector('dialog[open]',{state:'detached'});
   assert.equal((await loadData()).lines[0].stake,200);
  });
  await pass('dev17 budget settings show overspend and persist after reload',async()=>{
   await nav('settings');await page.waitForSelector('#budgetForm');
   await page.locator('#budgetMonth').fill('2026-10');await page.locator('#budgetMonth').dispatchEvent('change');
   await page.locator('#budgetAmount').fill('300');await page.locator('#budgetForm button[type=submit]').click();
   await page.waitForFunction(()=>document.querySelector('#budgetAmount')?.value==='300');
   assert.equal((await loadData()).settings.monthlyBudgets['2026-10'],300);
   await nav('analysis');assert.match(await page.locator('.budget-widget').innerText(),/予算を超えています/);
   await page.reload();await page.waitForSelector('.analysis-filter-panel');
   assert.match(await page.locator('.budget-widget').innerText(),/予算を超えています/);
  });
  await pass('dev17 monthly reflection, dev16 real CSV export, dev18 mobile layout',async()=>{
   await nav('analysis');await page.waitForSelector('.month-review');assert.match(await page.locator('.month-review').innerText(),/2026-10/);
   await nav('settings');
   const [download]=await Promise.all([page.waitForEvent('download'),page.locator('#exportCsv').click()]);
   assert.ok(download.suggestedFilename().endsWith('.csv'));
   const content=fs.readFileSync(await download.path(),'utf8');assert.ok(content.startsWith('\uFEFF'));assert.ok(content.includes('"750"'));
   await nav('history');
   for(const width of [320,390,440]){await page.setViewportSize({width,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),String(width));}
  });
  assert.deepEqual(errors,[]);console.log('ALL '+passed.length+' DEV16-18 CHECKS PASSED');
 }finally{if(browser)await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exit(1);});

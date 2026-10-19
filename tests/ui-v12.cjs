const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium,webkit}=require(process.env.PLAYWRIGHT_PATH||'playwright');
(async()=>{const root=path.resolve(__dirname,'..'),prefix=process.env.PUBLISH==='1'?'/publish/':'/',results=[];const server=http.createServer((req,res)=>{try{let p=decodeURIComponent(req.url.split('?')[0]);if(p.endsWith('/'))p+='index.html';const f=path.join(root,p);res.setHeader('Content-Type',({'.js':'text/javascript','.css':'text/css','.html':'text/html','.svg':'image/svg+xml','.png':'image/png'}[path.extname(f)]||'application/json'));res.end(fs.readFileSync(f));}catch{res.writeHead(404).end();}}).listen(8006,'127.0.0.1');let browser;
try{const launch={headless:true};if(process.env.CHROMIUM_MODULE&&!process.env.WEBKIT){const c=require(process.env.CHROMIUM_MODULE);launch.executablePath=await c.executablePath();launch.args=c.args.filter(x=>x!=='--disable-web-security'&&x!=='--allow-running-insecure-content');}browser=await (process.env.WEBKIT?webkit:chromium).launch(launch);const ctx=await browser.newContext({viewport:{width:390,height:844},acceptDownloads:true}),page=await ctx.newPage();page.setDefaultTimeout(10000);page.on('dialog',d=>d.accept());const errors=[];page.on('pageerror',e=>errors.push(e.message));const nav=async r=>{await page.evaluate(r=>location.hash=r,r);await page.waitForTimeout(80);};const pass=async(name,fn)=>{await fn();results.push(name);console.log('PASS '+name);};
await page.addInitScript(()=>{window.__UMALOG_ENTRY_CLASSIC__=true;});await page.goto('http://127.0.0.1:8006'+prefix);await page.waitForSelector('.hero');
await pass('minimal home, legible four-icon dock and character-hosted tips',async()=>{
 await nav('home');
 assert.equal(await page.locator('.hero').count(),1);
 assert.equal(await page.locator('#gradedSoon > li').count(),3);
 assert.equal(await page.locator('.graded-soon-link').count(),3);
 assert.equal(await page.locator('.primary-entry').count(),0);
 assert.equal(await page.locator('.recent-history').count(),0);
 assert.equal(await page.locator('#tipsOpen').count(),0);
 assert.equal(await page.locator('.home-extra').count(),0);
 assert.equal(await page.locator('nav svg.dock-icon').count(),4);
 assert.equal(await page.locator('nav a span').first().innerText(),'ホーム');
 assert.ok(await page.locator('.graded-soon-link').first().evaluate(e=>e.getBoundingClientRect().height>=44));
 await nav('growth');
 assert.equal(await page.locator('#petCare').count(),1);
 assert.equal(await page.locator('#petTips').count(),1);
 await page.locator('#petTips').click();
 assert.match(await page.locator('#tipsTitle').innerText(),/豆知識/);
 assert.ok(await page.locator('#tipBody').innerText());
 await page.locator('#tipsClose').click();
 assert.equal(await page.locator('#petTips').evaluate(e=>document.activeElement===e),true);
 await nav('settings');assert.equal(await page.locator('#raceInfoPanel').count(),1);assert.equal(await page.locator('#calendarManager').count(),1);
 await nav('home');
});
await pass('four-tab navigation, calendar deep link, back navigation and retained selection',async()=>{assert.equal(await page.locator('nav a').count(),4);assert.equal(await page.locator('#ledgerCalendar').count(),0);await nav('calendar');await page.waitForSelector('#ledgerCalendar');assert.equal(await page.locator('nav a[aria-current]').getAttribute('href'),'#home');await page.locator('#month').fill('2026-10');await page.locator('#month').dispatchEvent('change');await page.locator('[data-date="2026-10-18"]').click();await nav('history');await page.goBack();await page.waitForSelector('#ledgerDayDetail');assert.match(await page.locator('#ledgerDayDetail h3').innerText(),/2026-10-18/);});
await pass('month/list switch, complete titles, exact accounting and date-entry link',async()=>{await page.locator('.view-toggle button').nth(1).click();assert.equal(await page.locator('.ledger-grid').isVisible(),false);assert.match(await page.locator('#ledgerList').innerText(),/東京ハイジャンプ/);assert.match(await page.locator('#ledgerList').innerText(),/秋華賞/);await page.locator('#ledgerDayDetail a[href^="#entry-date/"]').click();await page.waitForSelector('#entryForm');assert.equal(await page.locator('#date').inputValue(),'2026-10-18');assert.equal(await page.locator('#number').inputValue(),'');assert.equal(await page.locator('nav a[aria-current]').getAttribute('href'),'#quick');});
await pass('320/390/440px and 200% text: four navigation targets, no page overflow',async()=>{for(const width of [320,390,440]){await page.setViewportSize({width,height:900});for(const route of ['home','calendar','entry','history','analysis','growth','settings']){await nav(route);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),route+' '+width);assert.ok(await page.locator('nav a').evaluateAll(els=>els.every(e=>{const r=e.getBoundingClientRect();return r.width>=44&&r.height>=44;})));}}await page.addStyleTag({content:'html{font-size:200%!important}'});await page.setViewportSize({width:320,height:900});for(const route of ['home','calendar','entry','history','analysis','growth','settings']){await nav(route);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),route+' 200%');}assert.doesNotMatch(await page.locator('meta[name=viewport]').getAttribute('content'),/user-scalable=no|maximum-scale=1/);});
await pass('all-screen touch policy preserves pinch; amount edit retains input and focus',async()=>{for(const route of ['home','calendar','entry','history','analysis','growth','settings']){await nav(route);assert.equal(await page.locator('main').evaluate(e=>getComputedStyle(e).touchAction),'manipulation');}await nav('entry');await page.locator('#type').selectOption('単勝');await page.locator('#numbers').fill('1');await page.locator('#addLine').click();const input=page.locator('[data-amount]').first();await input.fill('500');await input.focus();await input.evaluate(e=>window.originalAmountInput=e);await input.dispatchEvent('change');assert.ok(await input.evaluate(e=>e===window.originalAmountInput&&e===document.activeElement));assert.match(await page.locator('.entry-total').innerText(),/500/);await page.locator('#raceName').fill('検索検証レース');await page.locator('#allowUnfinished').evaluate(e=>e.checked=true);await page.locator('#entryForm button[type=submit]').click();await page.waitForSelector('[data-detail]');assert.match(await page.locator('#historyList').innerText(),/未入力/);await page.locator('#historySearch').fill('検索検証');assert.equal(await page.locator('[data-detail]').count(),1);await page.locator('#historySearch').fill('存在しない検索');assert.equal(await page.locator('[data-detail]').count(),0);assert.match(await page.locator('#historyList').innerText(),/該当/);});
await pass('home defaults to annual ledger and switches to monthly without changing records',async()=>{await nav('home');assert.equal(await page.locator('#homeYearly').getAttribute('aria-pressed'),'true');assert.match(await page.locator('#homeSummary').innerText(),/年間の確定収支/);await page.locator('#homeMonthly').click();assert.match(await page.locator('#homeSummary').innerText(),/月間の確定収支/);assert.equal(await page.locator('#month').isVisible(),true);await page.locator('#homeYearly').click();assert.equal(await page.locator('#homeYearInput').isVisible(),true);assert.match(await page.locator('#homeSummary').innerText(),/年間の確定収支/);});
await pass('ledger-only ticket entry and breakdown filters respect pending state and historical records',async()=>{
 await nav('entry');
 assert.equal(await page.locator('#kind').count(),0);
 assert.match(await page.locator('#entryForm').innerText(),/買い目を入力/);
 await nav('analysis');
 assert.equal(await page.locator('#analysisRange').inputValue(),'all');
 assert.equal(await page.locator('#analysisType').isVisible(),true);
 await page.locator('#analysisType').selectOption('ワイド');
 assert.match(await page.locator('#app').innerText(),/まだ集計できる記録がありません/);
 await page.locator('#analysisType').selectOption('単勝');
 assert.match(await page.locator('#app').innerText(),/未入力 1点/);
 await page.locator('#analysisVenue').selectOption('京都');
 assert.match(await page.locator('#app').innerText(),/まだ集計できる記録がありません/);
 await page.locator('#analysisVenue').selectOption('東京');
 await page.locator('#analysisRange').selectOption('year');
 await page.locator('#analysisYear').fill('2025');await page.locator('#analysisYear').dispatchEvent('change');
 assert.match(await page.locator('#app').innerText(),/まだ集計できる記録がありません/);
 await page.locator('#analysisYear').fill('2026');await page.locator('#analysisYear').dispatchEvent('change');
 await page.locator('#analysisRange').selectOption('month');
 await page.locator('#analysisMonth').fill('2026-10');await page.locator('#analysisMonth').dispatchEvent('change');
 assert.match(await page.locator('#racingStyle').innerText(),/2026-10・東京・単勝/);
 assert.ok(await page.locator('#analysisMonth').isVisible());
 await page.locator('#analysisRange').selectOption('all');
});

await pass('JRA-style number tap: BOX expands 5 horses, ordered trifecta saves and pays',async()=>{
 await nav('entry');
 assert.equal(await page.locator('.number-pad-choice').count(),18);
 await page.locator('#type').selectOption('三連複');
 await page.locator('#mode').selectOption('box');
 for(const n of [1,2,3,4,5])await page.locator('.number-pad-choice').nth(n-1).click();
 assert.equal(await page.locator('#numbers').inputValue(),'1 2 3 4 5');
 await page.locator('#addLine').click();
 assert.equal(await page.locator('[data-amount]').count(),10);
 assert.match(await page.locator('.entry-total').innerText(),/1,000円/);
 await nav('home');await nav('entry');
 await page.locator('#type').selectOption('三連単');
 await page.locator('#mode').selectOption('normal');
 assert.equal(await page.locator('.number-pad-step').count(),3);
 for(const n of [3,4,5])await page.locator('.number-pad-choice').nth(n-1).click();
 assert.equal(await page.locator('#numbers').inputValue(),'3 4 5');
 await page.locator('#stake').fill('500');
 await page.locator('#addLine').click();
 await page.locator('#date').fill('2026-10-20');
 await page.locator('#number').selectOption('8');
 await page.locator('#raceName').fill('着順登録テスト');
 await page.locator('#allowUnfinished').evaluate(e=>e.checked=true);await page.locator('#entryForm button[type=submit]').click();
 await page.waitForSelector('[data-detail]');
 await page.locator('#historySearch').fill('着順登録テスト');
 assert.equal(await page.locator('[data-detail]').count(),1);
 await page.locator('[data-detail]').click();
 await page.waitForSelector('#settlement');
 await page.locator('#podium1').selectOption('3');
 await page.locator('#podium2').selectOption('4');
 await page.locator('#podium3').selectOption('5');
 await page.locator('[data-choice="0"]').selectOption('hit');
 await page.locator('[data-payout="0"]').fill('3200');
 await page.locator('#settlement button[type=submit]').click();
 await page.waitForSelector('#settlement');
 assert.equal(await page.locator('#podium1').inputValue(),'3');
 const outcome=await page.evaluate(async()=>{const {load}=await import('./db.js');const d=await load();const race=d.races.find(r=>r.name==='着順登録テスト');const ticket=d.tickets.find(t=>t.raceId===race.id);const line=d.lines.find(l=>l.ticketId===ticket.id);return {podium:race.podium,stake:line.stake,payout:line.payout,profit:line.payout+line.refund-line.stake};});
 assert.deepEqual(outcome,{podium:[3,4,5],stake:500,payout:3200,profit:2700});
 await nav('entry');
 await page.locator('#type').selectOption('枠連');
 assert.equal(await page.locator('.number-pad-choice').count(),8);
 await page.locator('.number-pad-choice').first().click();
 await page.locator('.number-pad-choice').first().click();
 assert.equal(await page.locator('#numbers').inputValue(),'1 1');
});
await pass('today badge and universal manipulation touch policy keep pinch accessibility',async()=>{
 const meta=await page.locator('meta[name="viewport"]').getAttribute('content');
 assert.doesNotMatch(meta,/user-scalable=no|maximum-scale=1/);
 for(const route of ['home','entry','history','calendar','analysis','growth','settings']){
  await nav(route);
  for(const sel of ['main','button','input']){
   const item=page.locator(sel).first();if(await item.count())assert.equal(await item.evaluate(e=>getComputedStyle(e).touchAction),'manipulation',route+' '+sel);
  }
 }
});


await pass('formation/flow tap purchase, uneven stakes, bulk edit and saved accounting',async()=>{
 await nav('entry');await page.locator('#type').selectOption('三連単');await page.locator('#mode').selectOption('flow');
 assert.equal(await page.locator('#flowAxisCount').isVisible(),true);
 await page.locator('#flowPosition').selectOption('multi');
 await page.locator('[data-pattern-number="1"]').click();
 for(const n of [2,3,4])await page.locator('[data-pattern-number="'+n+'"]').click();
 assert.match(await page.locator('.pattern-status').innerText(),/18点/);
 await page.locator('#stake').fill('100');await page.locator('#addLine').click();
 assert.equal(await page.locator('[data-amount]').count(),18);
 assert.match(await page.locator('.entry-total').innerText(),/1,800円/);
 await page.locator('[data-amount="0"]').fill('500');await page.locator('[data-amount="0"]').blur();
 await page.locator('[data-amount="1"]').fill('300');await page.locator('[data-amount="1"]').blur();
 assert.match(await page.locator('.entry-total').innerText(),/2,400円/);
 if(!(await page.locator('.bet-bulk').evaluate(el=>el.open)))await page.locator('.bet-bulk > summary').click();
 assert.equal(await page.locator('.bet-bulk #bulkAmount').isVisible(),true);
 await page.locator('#bulkAmount').fill('200');await page.locator('#bulkApply').click();
 assert.match(await page.locator('.entry-total').innerText(),/3,600円/);
 await page.locator('[data-amount="0"]').fill('500');await page.locator('[data-amount="0"]').blur();
 assert.match(await page.locator('.entry-total').innerText(),/3,900円/);
 await page.locator('#raceName').fill('三連単流し・金額別テスト');
 await page.locator('#allowUnfinished').evaluate(e=>e.checked=true);await page.locator('#entryForm button[type=submit]').click();await page.waitForSelector('#historyList');
 const stored=await page.evaluate(async()=>{
  const d=await (await import('./db.js')).load();
  const r=d.races.find(r=>r.name==='三連単流し・金額別テスト'),t=d.tickets.filter(t=>t.raceId===r.id&&t.type==='三連単').at(-1);
  const lines=d.lines.filter(l=>l.ticketId===t.id);
  return {n:lines.length,stake:lines.reduce((n,l)=>n+l.stake,0),different:new Set(lines.map(l=>l.stake)).size};
 });
 assert.deepEqual(stored,{n:18,stake:3900,different:2});
 await nav('entry');await page.locator('#type').selectOption('三連複');
 await page.locator('#mode').selectOption('formation');
 for(const n of [1,2])await page.locator('[data-pattern-number="'+n+'"]').click();
 await page.locator('[data-pattern-tab="1"]').click();
 for(const n of [2,3])await page.locator('[data-pattern-number="'+n+'"]').click();
 await page.locator('[data-pattern-tab="2"]').click();
 for(const n of [3,4])await page.locator('[data-pattern-number="'+n+'"]').click();
 assert.match(await page.locator('.pattern-status').innerText(),/4点/);
 await page.locator('#addLine').click();assert.equal(await page.locator('[data-amount]').count(),4);
 await page.locator('#type').selectOption('枠連');await page.locator('#mode').selectOption('formation');
 await page.locator('[data-pattern-number="1"]').click();await page.locator('[data-pattern-tab="1"]').click();
 await page.locator('[data-pattern-number="1"]').click();
 assert.match(await page.locator('.pattern-status').innerText(),/1点/);
 await page.locator('#addLine').click();assert.equal(await page.locator('[data-amount]').count(),5);
 await page.locator('#raceName').fill('フォーメーションと枠連ゾロ目');
 await page.locator('#allowUnfinished').evaluate(e=>e.checked=true);await page.locator('#entryForm button[type=submit]').click();await page.waitForSelector('#historyList');
 const saved=await page.evaluate(async()=>{
  const d=await (await import('./db.js')).load();(await import('./core.js')).validateData(d);
  const r=d.races.find(r=>r.name==='フォーメーションと枠連ゾロ目'),t=d.tickets.slice(-2).filter(t=>t.raceId===r.id);
  return {types:t.map(x=>x.type).sort(),all:d.lines.filter(l=>t.some(x=>x.id===l.ticketId)).length,frame:d.lines.find(l=>l.numbers.join(',')==='1,1')?.numbers};
 });
 assert.deepEqual(saved,{types:['三連複','枠連'],all:5,frame:[1,1]});
});

await pass('batch payout previews race-wide candidate statuses without touching settled or unknown wagers',async()=>{
 await page.evaluate(async()=>{
  const {load,save}=await import('./db.js');const d=await load();
  d.races.push({id:'batch-r-qa',date:'2026-12-20',venue:'阪神',number:7,name:'一括精算テスト2026'});
  const types=[['batch-t-a','馬連'],['batch-t-b','ワイド'],['batch-t-c','枠連'],['batch-t-d','複勝']];
  for(const [id,type] of types)d.tickets.push({id,raceId:'batch-r-qa',type,kind:'reported',memo:'',createdAt:'2026-10-17T10:00:00Z'});
  const rows=[
   ['batch-l1','batch-t-a',[3,4],'pending',0,'flow'],
   ['batch-l2','batch-t-a',[3,5],'pending',0,'flow'],
   ['batch-l3','batch-t-a',[2,3],'settled',777,'normal'],
   ['batch-l4','batch-t-b',[3,5],'pending',0,'box'],
   ['batch-l5','batch-t-b',[6,8],'pending',0,'box'],
   ['batch-l6','batch-t-c',[1,2],'pending',0,undefined],
   ['batch-l7','batch-t-d',[5],'pending',0,'normal']
  ];
  for(const [id,ticketId,numbers,status,payout,purchaseMode] of rows){
   const row={id,ticketId,numbers,status,payout,refund:0,stake:100};
   if(purchaseMode)row.purchaseMode=purchaseMode;d.lines.push(row);
  }
  await save(d);
 });
 await page.reload();await page.waitForSelector('[data-detail]');
 await nav('history');await page.locator('#historySearch').fill('一括精算テスト2026');
 assert.equal(await page.locator('[data-detail]').count(),4);
 await page.locator('[data-detail]').first().click();await page.waitForSelector('#batchPreview');
 for(const [id,value] of [['#podium1','3'],['#podium2','4'],['#podium3','5']])await page.locator(id).selectOption(value);
 await page.locator('#batchRaceState').selectOption('normal');await page.locator('#batchStarters').selectOption('8');
 await page.locator('#batchPreview').click();
 assert.match(await page.locator('#batchSummary').innerText(),/未入力 6点/);
 assert.match(await page.locator('#batchSummary').innerText(),/的中候補 3点/);
 assert.equal(await page.locator('[data-batch-row]').count(),6);
 assert.equal(await page.locator('[data-batch-choice="4"]').inputValue(),'skip'); // 枠連：枠番は推定できない
 const before=await page.evaluate(async()=>{const d=await (await import('./db.js')).load();return d.lines.filter(x=>x.id.startsWith('batch-l')).map(x=>[x.id,x.status,x.payout]);});
 assert.equal(before.filter(x=>x[1]==='pending').length,6,'a preview must not change data');
 for(const [index,amount] of [[0,'500'],[2,'800'],[5,'1500']])await page.locator('[data-batch-payout="'+index+'"]').fill(amount);
 await page.locator('[data-batch-group="miss"] > summary').click();await page.locator('#batchSelectMisses').click();
 await page.locator('#batchConfirm').check();
 await page.locator('#batchForm button[type=submit]').click();
 await page.waitForFunction(async()=>{const d=await (await import('./db.js')).load();return d.lines.find(x=>x.id==='batch-l1')?.payout===500;});
 const after=await page.evaluate(async()=>{
  const d=await (await import('./db.js')).load();const rows=d.lines.filter(x=>x.id.startsWith('batch-l'));
  return {podium:d.races.find(r=>r.id==='batch-r-qa').podium,rows:rows.map(x=>[x.id,x.status,x.payout]),methods:rows.map(x=>x.purchaseMode||null)};
 });
 assert.deepEqual(after.podium,[3,4,5]);
 assert.deepEqual(after.rows,[
  ['batch-l1','settled',500],['batch-l2','settled',0],['batch-l3','settled',777],
  ['batch-l4','settled',800],['batch-l5','settled',0],['batch-l6','pending',0],
  ['batch-l7','settled',1500]
 ]);
 assert.equal(after.methods[0],'flow');assert.equal(after.methods[5],null);
 await nav('analysis');
 assert.match(await page.locator('#racingStyle').innerText(),/買い方別の購入傾向と成績/);
 assert.match(await page.locator('#racingStyle').innerText(),/旧記録（不明）/);
});
assert.deepEqual(errors,[]);console.log('ALL '+results.length+' V12 CHECKS PASSED');
}finally{if(browser)await browser.close();server.close();}})().catch(e=>{console.error(e);process.exit(1);});

const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
(async()=>{
 const root=path.resolve(__dirname,'..'),prefix=process.env.PUBLISH==='1'?'/publish/':'/',checks=[];
 const server=http.createServer((req,res)=>{let p=decodeURIComponent(req.url.split('?')[0]);if(p.endsWith('/'))p+='index.html';try{res.setHeader('Content-Type',({'.js':'text/javascript','.html':'text/html','.css':'text/css','.svg':'image/svg+xml'}[path.extname(p)]||'application/octet-stream'));res.end(fs.readFileSync(path.join(root,p)));}catch{res.writeHead(404).end();}}).listen(8037,'127.0.0.1');
 let browser;
 try{
  const chrome=require(process.env.CHROMIUM_MODULE);
  browser=await chromium.launch({headless:true,executablePath:await chrome.executablePath(),args:chrome.args.filter(x=>x!=='--disable-web-security'&&x!=='--allow-running-insecure-content')});
  const ctx=await browser.newContext({viewport:{width:390,height:844}}),page=await ctx.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());page.setDefaultTimeout(16000);
  const go=async hash=>{await page.evaluate(h=>location.hash=h,hash);await page.waitForTimeout(220);};
  const pass=async(label,fn)=>{await fn();checks.push(label);console.log('PASS '+label);};
  await page.goto('http://127.0.0.1:8037'+prefix);await page.waitForSelector('#homeEntry');
  await pass('dev37 combine bet-status and bet-type filters without altering stored lines',async()=>{
   await go('entry');await page.locator('[data-race-quick="8"]').click();
   await page.locator('#openPurchaseSheet').click();await page.locator('[data-bet-fast="ワイド"]').click();await page.locator('#numbers').fill('1 2');await page.locator('#addLine').click();
   await page.locator('#openPurchaseSheet').click();await page.locator('[data-bet-fast="単勝"]').click();await page.locator('#numbers').fill('3');await page.locator('#addLine').click();
   await page.locator('#openOutcomeSheet').click();assert.equal(await page.locator('.fast-bet-row').count(),2);
   await page.locator('#fastTypeFilter').selectOption('単勝');assert.equal(await page.locator('.fast-bet-row').count(),1);assert.match(await page.locator('#fastMatchingCount').innerText(),/表示対象 1点/);
   assert.match(await page.locator('.fast-bet-row').innerText(),/単勝 3/);
   await page.locator('[data-fast-hit="1"]').click();await page.locator('[data-fast-payout="1"]').fill('600');
   await page.locator('[data-fast-filter="pending"]').click();assert.equal(await page.locator('.fast-bet-row').count(),0);
   await page.locator('[data-fast-filter="completed"]').click();assert.equal(await page.locator('.fast-bet-row').count(),1);
   await page.locator('#fastTypeFilter').selectOption('');await page.locator('[data-fast-filter="all"]').click();
   assert.equal(await page.locator('[data-fast-payout="1"]').inputValue(),'600');
   assert.equal(await page.locator('.fast-bet-row').count(),2);
  });
  await pass('dev38 advanced partial refund jumps straight to line beyond first 50',async()=>{
   await go('home');
   await page.evaluate(async()=>{
    const db=await import('./db.js'),record={version:1,key:'new',updatedAt:new Date().toISOString(),baseSignature:'',
    race:{date:'2026-10-18',venue:'東京',number:'8',name:'大量買い目の検証'},
    lines:Array.from({length:65},(_,i)=>({id:'draft-'+i,type:'ワイド',numbers:[1,2],stake:100,purchaseMode:'normal',status:'pending',payout:0,refund:0})),
    advanced:{groups:[[],[],[]]},
    fields:{type:'ワイド',mode:'normal',numbers:'1 2',stake:'100',duplicate:'separate',memo:'',saveNextRace:'0',allowUnfinished:'0'}};
    await db.saveEntryDraft('new',record);
   });
   await go('entry');await page.waitForSelector('#recoverEntryDraft');
   await page.locator('#recoverEntryDraft').click();await page.locator('#openOutcomeSheet').click();
   await page.locator('#fastMore').click();
   assert.equal(await page.locator('[data-fast-row="55"]').count(),1);
   await page.locator('[data-fast-advanced="55"]').click();
   assert.equal(await page.locator('#entryDetailedResults').evaluate(x=>x.open),true);
   assert.equal(await page.locator('[data-entry-outcome="55"]').inputValue(),'advanced');
   assert.equal(await page.locator('[data-entry-outcome="0"]').inputValue(),'pending');
  });
  await pass('dev39 saved detail corrections can reach 65th row incrementally',async()=>{
   await page.evaluate(async()=>{
    const db=await import('./db.js'),d=await db.load();
    d.races.push({id:'long-race',date:'2026-10-17',venue:'東京',number:6,name:'大量履歴'});
    d.tickets.push({id:'long-ticket',raceId:'long-race',type:'ワイド',kind:'reported',memo:'',createdAt:'2026-10-17T00:00:00Z'});
    for(let i=0;i<65;i++)d.lines.push({id:'long-'+i,ticketId:'long-ticket',numbers:[1,2],stake:100,purchaseMode:'normal',status:'settled',payout:0,refund:0});
    await db.save(d);
   });
   await page.reload();await page.waitForSelector('#entryForm');await go('detail/long-ticket');
   assert.equal(await page.locator('#detailCorrectionsRows [data-quick-edit]').count(),30);
   await page.locator('#detailMoreCorrections').click();
   assert.equal(await page.locator('#detailCorrectionsRows [data-quick-edit]').count(),60);
   await page.locator('#detailMoreCorrections').click();
   assert.equal(await page.locator('#detailCorrectionsRows [data-quick-edit]').count(),65);
   assert.equal(await page.locator('#detailMoreCorrections').count(),0);
   await page.locator('[data-quick-edit="long-64"]').click();
   assert.equal(await page.locator('#correctionForm').count(),1);
   await page.locator('#correctionClose').click();
  });
  await pass('dev40 preserve simple home, indexing and no mobile overflow',async()=>{
   await go('home');assert.equal(await page.locator('#homeSummary').count(),1);assert.equal(await page.locator('#homeBudget').count(),0);
   await go('history');await page.locator('#historySearch').fill('大量履歴');assert.equal(await page.locator('.history-race').count(),1);
   for(const width of [320,390,440]){await page.setViewportSize({width,height:844});for(const hash of ['home','history','analysis']){await go(hash);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),hash+' '+width);}}
   const snapshot=await page.evaluate(async()=> (await (await import('./db.js')).load()));
   assert.equal(snapshot.lines.length,65);assert.equal(snapshot.schemaVersion,1);
  });
  assert.deepEqual(errors,[]);console.log('ALL '+checks.length+' DEV37-40 CHECKS PASSED');
 }finally{if(browser)await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exit(1);});

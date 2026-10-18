const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
(async()=>{
 const root=path.resolve(__dirname,'..'),prefix=process.env.PUBLISH==='1'?'/publish/':'/';
 const server=http.createServer((req,res)=>{let p=decodeURIComponent(req.url.split('?')[0]);if(p.endsWith('/'))p+='index.html';try{res.setHeader('Content-Type',({'.js':'text/javascript','.html':'text/html','.css':'text/css','.svg':'image/svg+xml'}[path.extname(p)]||'application/octet-stream'));res.end(fs.readFileSync(path.join(root,p)));}catch{res.writeHead(404).end();}}).listen(8040,'127.0.0.1');
 let browser;
 try{
  const c=require(process.env.CHROMIUM_MODULE);
  browser=await chromium.launch({headless:true,executablePath:await c.executablePath(),args:c.args.filter(x=>x!=='--disable-web-security'&&x!=='--allow-running-insecure-content')});
  const ctx=await browser.newContext({viewport:{width:390,height:844}}),page=await ctx.newPage(),errors=[],dialogs=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>{dialogs.push(d.message());d.accept();});
  page.setDefaultTimeout(16000);
  await page.goto('http://127.0.0.1:8040'+prefix);await page.waitForSelector('#homeEntry');
  await page.evaluate(async()=>{
   const db=await import('./db.js'),saved=await db.loadWithRevision(),d=structuredClone(saved.data);
   d.races.push({id:'race-old',date:'2026-10-04',venue:'札幌',number:7,name:'以前の記録'});
   d.tickets.push({id:'ticket-old',raceId:'race-old',type:'ワイド',kind:'reported',memo:'',createdAt:'2026-10-04T05:00:00Z'});
   d.lines.push({id:'line-old1',ticketId:'ticket-old',numbers:[1,2],stake:100,purchaseMode:'box',status:'settled',payout:640,refund:0});
   d.lines.push({id:'line-old2',ticketId:'ticket-old',numbers:[1,3],stake:200,purchaseMode:'normal',status:'settled',payout:0,refund:0});
   await db.save(d,{expectedRevision:saved.revision});
  });
  await page.reload();await page.waitForSelector('#homeEntry');await page.evaluate(()=>location.hash='entry');await page.waitForSelector('#entryForm');
  await page.locator('#openPurchaseSheet').click();
  await page.locator('#recentPurchaseTemplates summary').click();
  assert.equal(await page.locator('[data-reuse-ticket]').count(),1);
  await page.locator('[data-stake-shortcut="500"]').click();
  assert.equal(await page.locator('#stake').inputValue(),'500');
  assert.equal(await page.locator('[data-stake-shortcut="500"]').getAttribute('aria-pressed'),'true');
  await page.locator('[data-reuse-ticket="0"]').click();
  assert.match(await page.locator('#notice').innerText(),/レース番号/);
  assert.match(await page.locator('#draft .entry-total').innerText(),/0点/);
  // The purchase sheet intentionally blocks background controls. Close it before selecting a race.
  await page.locator('#entryPurchasePanel .sheet-close').click();
  await page.locator('[data-race-quick="8"]').click();
  await page.locator('#openPurchaseSheet').click();
  await page.locator('[data-reuse-ticket="0"]').click();
  assert.ok(dialogs.some(s=>s.includes('8R')&&s.includes('払戻結果はコピーしません')));
  assert.match(await page.locator('#quickLineTitle').innerText(),/2点/);
  assert.match(await page.locator('#quickStatus').innerText(),/結果未入力 2点/);
  const before=await page.evaluate(async()=>(await (await import('./db.js')).load()).lines);
  assert.equal(before.length,2);assert.equal(before[0].payout,640);
  await page.locator('#openOutcomeSheet').click();assert.equal(await page.locator('[data-fast-hit]').count(),2);
  await page.locator('#finishOutcomeSheet').click();
  for(const width of [320,390,440]){
   await page.setViewportSize({width,height:844});
   await page.locator('#openPurchaseSheet').click();
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
   await page.locator('#entryPurchasePanel .sheet-close').click();
  }
  const after=await page.evaluate(async()=>(await (await import('./db.js')).load()).lines);
  assert.deepEqual(after,before);assert.deepEqual(errors,[]);
  console.log('PASS v1.4.0 smart entry purchase reuse and amounts, no automatic save, mobile widths');
 }finally{if(browser)await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exit(1);});

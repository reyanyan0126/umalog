const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
(async()=>{
 const root=path.resolve(__dirname,'..'),prefix=process.env.PUBLISH==='1'?'/publish/':'/',errors=[],results=[];
 const server=http.createServer((req,res)=>{try{let p=decodeURIComponent(req.url.split('?')[0]);if(p.endsWith('/'))p+='index.html';const f=path.join(root,p);res.setHeader('Content-Type',({'.js':'text/javascript','.css':'text/css','.html':'text/html','.svg':'image/svg+xml','.png':'image/png'}[path.extname(f)]||'application/json'));res.end(fs.readFileSync(f));}catch{res.writeHead(404).end();}}).listen(8005,'127.0.0.1');
 let browser;
 try{
  const launch={headless:true};
  if(process.env.CHROMIUM_MODULE){const c=require(process.env.CHROMIUM_MODULE);launch.executablePath=await c.executablePath();launch.args=c.args.filter(x=>x!=='--disable-web-security'&&x!=='--allow-running-insecure-content');}
  browser=await chromium.launch(launch);
  const ctx=await browser.newContext({viewport:{width:390,height:844}}),page=await ctx.newPage();
  page.setDefaultTimeout(12000);page.on('pageerror',e=>errors.push(e.message));await page.clock.install({time:new Date('2026-10-17T00:00:00Z')});
  const pass=async(name,fn)=>{await fn();results.push(name);console.log('PASS '+name);};
  await page.goto('http://127.0.0.1:8005'+prefix);await page.waitForSelector('.hero');assert.equal(await page.locator('#ledgerCalendar').count(),0);await page.locator('nav a[href="#calendar"]').click();await page.waitForSelector('#ledgerCalendar');
  await pass('Sunday-first October month, flags and verified racing dates',async()=>{
   assert.equal(await page.locator('.ledger-grid > .ledger-day').count(),31);
   assert.equal(await page.locator('.ledger-grid > .ledger-blank').count(),4);
   assert.match(await page.locator('[data-date="2026-10-17"]').getAttribute('aria-label'),/富士ステークス/);
   assert.equal(await page.locator('.ledger-weekday').first().innerText(),'日');
   assert.equal(await page.locator('.ledger-weekday').last().innerText(),'土');
   assert.equal(await page.locator('.ledger-number').first().evaluate(e=>getComputedStyle(e).alignSelf),'flex-start');
   assert.match(await page.locator('[data-date="2026-10-18"]').innerText(),/⚐2/);
   const compact=await page.locator('[data-date="2026-10-18"]').evaluate(e=>({height:e.getBoundingClientRect().height,min:getComputedStyle(e).minHeight,gap:getComputedStyle(e).rowGap}));
   assert.ok(compact.height<=70,'calendar date cell should be compact: '+JSON.stringify(compact));
   await page.locator('[data-date="2026-10-18"]').click();
   assert.match(await page.locator('#ledgerDayDetail').innerText(),/秋華賞/);
   assert.match(await page.locator('#ledgerDayDetail').innerText(),/東京ハイジャンプ/);
  });
  await pass('official holidays are labelled and shown in Sunday-first view',async()=>{
   await page.locator('#month').fill('2026-09');await page.locator('#month').dispatchEvent('change');
   assert.match(await page.locator('[data-date="2026-09-22"]').getAttribute('aria-label'),/国民の休日/);
   assert.ok(await page.locator('[data-date="2026-09-22"]').evaluate(e=>e.classList.contains('holiday')));
   await page.locator('[data-date="2026-09-22"]').click();assert.match(await page.locator('#ledgerDayDetail h3').innerText(),/国民の休日/);
   await page.locator('#month').fill('2027-03');await page.locator('#month').dispatchEvent('change');
   assert.match(await page.locator('[data-date="2027-03-22"]').getAttribute('aria-label'),/振替休日/);
   await page.locator('#month').fill('2026-10');await page.locator('#month').dispatchEvent('change');
  });
  await pass('calendar graded race opens existing entry route',async()=>{
   await page.locator('[data-date="2026-10-17"]').click();
   const href=await page.locator('#ledgerDayDetail a[href^="#entry/"]').first().getAttribute('href');
   assert.match(href,/jra-2026-fuji/);
  });
  await pass('month control synchronizes February leap years without invented events',async()=>{
   await page.locator('#month').fill('2027-02');await page.locator('#month').dispatchEvent('change');
   assert.equal(await page.locator('.ledger-grid > .ledger-day').count(),28);
   assert.match(await page.locator('[data-date="2027-02-27"]').getAttribute('aria-label'),/オーシャン/);
   await page.locator('[data-date="2027-02-27"]').click();
   assert.match(await page.locator('#ledgerDayDetail').innerText(),/認可前/);
  });
  await pass('synthetic settled/pending/refund dates show exact net without writing ledger',async()=>{
   const old=await page.evaluate(async()=>JSON.stringify(await (await import('./db.js')).load()));
   await page.evaluate(async()=>{
    const {mountLedgerCalendar}=await import('./ledger-calendar.js');
    const host=document.createElement('div');host.id='syntheticLedger';document.querySelector('#app').append(host);
    const d={races:[{id:'r',date:'2026-10-17',venue:'東京',number:11,name:'試験競走'}],tickets:[{id:'t',raceId:'r',type:'単勝'}],lines:[{ticketId:'t',status:'settled',stake:100,payout:500,refund:0},{ticketId:'t',status:'pending',stake:500,payout:0,refund:0},{ticketId:'t',status:'void',stake:100,payout:0,refund:100}]};
    mountLedgerCalendar(host,d,[],'2026-10');
   });
   assert.match(await page.locator('#syntheticLedger [data-date="2026-10-17"]').innerText(),/\+400/);
   assert.match(await page.locator('#syntheticLedger [data-date="2026-10-17"]').innerText(),/待1/);
   assert.equal(await page.locator('#syntheticLedger [data-date="2026-10-17"] .ledger-meta').count(),1);
   assert.match(await page.locator('#syntheticLedger #ledgerDayDetail').innerText(),/確定収支 \+400円/);
   assert.match(await page.locator('#syntheticLedger #ledgerDayDetail').innerText(),/結果待ち 1点・500円/);
   assert.match(await page.locator('#syntheticLedger #ledgerDayDetail a[href^="#detail/"]').first().getAttribute('href'),/#detail\/t/);
   await page.locator('#syntheticLedger').evaluate(e=>e.remove());
   assert.equal(await page.evaluate(async()=>JSON.stringify(await (await import('./db.js')).load())),old);
  });
  await pass('320px enlarged text and offline PWA keep calendar visible',async()=>{
   await page.setViewportSize({width:320,height:740});
   await page.addStyleTag({content:'html{font-size:200%!important}'});
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
   await ctx.setOffline(true);await page.reload();await page.waitForSelector('#ledgerCalendar');
   assert.equal(await page.locator('.ledger-grid > .ledger-day').count(),31);
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
   await ctx.setOffline(false);
  });
  assert.deepEqual(errors,[]);console.log('ALL '+results.length+' LEDGER CALENDAR UI CHECKS PASSED');
 }finally{if(browser)await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exit(1);});

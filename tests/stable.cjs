const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
(async()=>{
 const root=path.resolve(__dirname,'..'),prefix=process.env.PUBLISH==='1'?'/publish/':'/';
 const server=http.createServer((req,res)=>{let p=decodeURIComponent(req.url.split('?')[0]);if(p.endsWith('/'))p+='index.html';try{res.setHeader('Content-Type',({'.js':'text/javascript','.html':'text/html','.css':'text/css','.svg':'image/svg+xml'}[path.extname(p)]||'application/octet-stream'));res.end(fs.readFileSync(path.join(root,p)));}catch{res.writeHead(404).end();}}).listen(8036,'127.0.0.1');
 let browser;const passed=[];
 try{
  const c=require(process.env.CHROMIUM_MODULE);browser=await chromium.launch({headless:true,executablePath:await c.executablePath(),args:c.args.filter(x=>x!=='--disable-web-security'&&x!=='--allow-running-insecure-content')});
  const ctx=await browser.newContext({viewport:{width:390,height:844}}),page=await ctx.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(15000);
  const go=async r=>{await page.evaluate(x=>location.hash=x,r);await page.waitForTimeout(200);};
  const pass=async(label,fn)=>{await fn();passed.push(label);console.log('PASS '+label);};
  const origin='http://127.0.0.1:8036'+prefix;await page.goto(origin);await page.waitForSelector('#homeEntry');
  await pass('stable v1.3 launch remains minimal and offers one recording action',async()=>{
   assert.equal(await page.locator('#homeEntry').count(),1);assert.equal(await page.locator('#homeBudget').count(),0);
   assert.equal(await page.locator('nav a').count(),6);
  });
  await pass('dev31 atomic optimistic concurrency refuses stale tab and preserves first committed value',async()=>{
   const base=await page.evaluate(async()=>{const d=await import('./db.js');return d.loadWithRevision();});
   assert.ok(Number.isSafeInteger(base.revision));
   const twin=await ctx.newPage();await twin.goto(origin);await twin.waitForSelector('#homeEntry');
   const saved=await twin.evaluate(async()=>{const d=await import('./db.js');const snap=await d.loadWithRevision(),next=structuredClone(snap.data);next.settings.name='競合確認・最新版';await d.save(next,{expectedRevision:snap.revision});return snap.revision+1;});
   const stale=await page.evaluate(async old=>{const d=await import('./db.js');const draft=structuredClone(old.data);draft.settings.name='古い画面からの上書き';try{await d.save(draft,{expectedRevision:old.revision});return null;}catch(e){return {message:e.message,code:e.code};}},base);
   assert.equal(stale?.code,'STALE_LEDGER');assert.match(stale.message,/別のタブ/);
   const final=await page.evaluate(async()=>{const d=await import('./db.js');return d.loadWithRevision();});
   assert.equal(final.data.settings.name,'競合確認・最新版');assert.equal(final.revision,saved);
   await twin.close();await page.reload();await page.waitForSelector('#homeEntry');
  });
  await pass('dev32 purchase and result selection filters retain original row identities',async()=>{
   await go('entry');await page.waitForSelector('#entryForm');
   await page.locator('[data-race-quick="8"]').click();await page.locator('#openPurchaseSheet').click();
   await page.locator('#numbers').fill('1 2');await page.locator('#addLine').click();
   await page.locator('#openPurchaseSheet').click();await page.locator('#numbers').fill('1 3');await page.locator('#addLine').click();
   await page.locator('#openOutcomeSheet').click();assert.equal(await page.locator('.fast-bet-row').count(),2);
   await page.locator('[data-fast-hit="0"]').click();await page.locator('[data-fast-payout="0"]').fill('700');
   await page.locator('[data-fast-filter="pending"]').click();assert.equal(await page.locator('.fast-bet-row').count(),1);assert.equal(await page.locator('[data-fast-hit="1"]').count(),1);
   await page.locator('[data-fast-filter="completed"]').click();assert.equal(await page.locator('[data-fast-payout="0"]').inputValue(),'700');
   await page.locator('[data-fast-filter="all"]').click();assert.equal(await page.locator('.fast-bet-row').count(),2);
  });
  await pass('dev34 trend and lazy venue matrix render on request',async()=>{
   await page.reload();await page.waitForSelector('#entryForm');
   await go('analysis');await page.waitForSelector('#analysisMonthlyFacts');
   assert.equal(await page.locator('#analysisMatrixContents table').count(),0);
   assert.match(await page.locator('#analysisMonthlyFacts').innerText(),/購入額と払戻の振り返り/);
   await page.locator('[data-analysis-jump="analysisMatrix"]').click();
   assert.equal(await page.locator('#analysisMatrixContents table').count(),1);
  });
  await pass('dev35 all five unique illustrated horse stages resolve and display',async()=>{
   await go('growth');await page.waitForSelector('#petCare');
   assert.match(await page.locator('.pet').getAttribute('src'),/companion-[0-4]\.svg/);
   assert.ok(await page.locator('#companionSpeech').isVisible());
   const loaded=await page.evaluate(async()=>{
    const imgs=Array.from({length:5},(_,i)=>'./'+(location.pathname.includes('/publish/')?'':'assets/')+'companion-'+i+'.svg');
    return Promise.all(imgs.map(async url=>{const r=await fetch(url);const t=await r.text();return r.ok&&t.includes('<svg')&&t.includes('linearGradient');}));
   });
   assert.deepEqual(loaded,[true,true,true,true,true]);
  });
  await pass('dev36 stable version, no schema migration and mobile layout',async()=>{
   await go('settings');assert.match(await page.locator('#app').innerText(),/v1.6.1 正式版/);
   const saved=await page.evaluate(async()=> (await (await import('./db.js')).load()));assert.equal(saved.schemaVersion,1);
   for(const width of [320,390,440]){await page.setViewportSize({width,height:844});for(const route of ['home','entry','history','calendar','analysis','growth','settings']){await go(route);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),route+' '+width);}}
  });

  await pass('v1.3.2 confirmed backup is marked outdated after a newer ledger save',async()=>{
   await go('settings');await page.waitForSelector('#lastBackupConfirmed');
   await page.evaluate(async()=>{const db=await import('./db.js');await db.confirmBackupStored();});
   await go('home');await go('settings');
   await page.waitForFunction(()=>document.querySelector('#lastBackupConfirmed')?.textContent.includes('その後の記録更新なし'));
   await page.evaluate(async()=>{
    const db=await import('./db.js'),state=await db.loadWithRevision(),latest=structuredClone(state.data);
    latest.settings.name='確認後に更新した帳簿';await db.save(latest,{expectedRevision:state.revision});
   });
   await go('home');await go('settings');
   await page.waitForFunction(()=>document.querySelector('#lastBackupConfirmed')?.textContent.includes('最新のJSONを再保存'));
  });
  assert.deepEqual(errors,[]);console.log('ALL '+passed.length+' STABLE V1.3 CHECKS PASSED');
 }finally{if(browser)await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exit(1);});

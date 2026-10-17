const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
(async()=>{
 const root=path.resolve(__dirname,'..'),prefix=process.env.PUBLISH==='1'?'/publish/':'/',passed=[];
 const server=http.createServer((req,res)=>{let p=decodeURIComponent(req.url.split('?')[0]);if(p.endsWith('/'))p+='index.html';try{res.setHeader('Content-Type',({'.js':'text/javascript','.html':'text/html','.css':'text/css','.svg':'image/svg+xml'}[path.extname(p)]||'application/octet-stream'));res.end(fs.readFileSync(path.join(root,p)));}catch{res.writeHead(404).end();}}).listen(8021,'127.0.0.1');
 let browser;
 try{
  const portable=require(process.env.CHROMIUM_MODULE),launch={headless:true,executablePath:await portable.executablePath(),args:portable.args.filter(x=>x!=='--disable-web-security'&&x!=='--allow-running-insecure-content')};
  browser=await chromium.launch(launch);
  const context=await browser.newContext({viewport:{width:390,height:844},acceptDownloads:true});
  const page=await context.newPage(),errors=[];page.setDefaultTimeout(15000);page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>{console.log('DIALOG '+d.message());d.accept();});
  const go=async hash=>{await page.evaluate(h=>location.hash=h,hash);await page.waitForTimeout(220);};
  const data=()=>page.evaluate(async()=> (await (await import('./db.js')).load()));
  const stored=()=>page.evaluate(async()=> (await (await import('./db.js')).loadEntryDraft('new')));
  const pass=async(name,fn)=>{await fn();passed.push(name);console.log('PASS '+name);};
  await page.goto('http://127.0.0.1:8021'+prefix);await page.waitForSelector('.hero');
  await go('entry');await page.waitForSelector('#entryForm');
  await pass('dev19 explicit race selection with 12 compact tap buttons',async()=>{
   assert.equal(await page.locator('#number').inputValue(),'');
   assert.equal(await page.locator('#raceFastPicks button').count(),12);
   await page.locator('[data-race-quick="8"]').click();
   assert.equal(await page.locator('#number').inputValue(),'8');
   assert.equal(await page.locator('[data-race-quick="8"]').getAttribute('aria-pressed'),'true');
  });
  await pass('dev19 draft autosave keeps receipt and line separate from main',async()=>{
   await page.locator('#date').fill('2026-10-17');await page.locator('#venue').selectOption('東京');
   await page.locator('#openPurchaseSheet').click();await page.locator('#numbers').fill('1 2');await page.locator('#stake').fill('100');
   await page.locator('#addLine').click();await page.locator('#openOutcomeSheet').click();
   await page.locator('[data-fast-hit="0"]').click();await page.locator('[data-fast-payout="0"]').fill('780');
   await page.waitForFunction(()=>document.querySelector('#entryDraftStatus')?.textContent.includes('保存済み'));
   assert.equal((await data()).lines.length,0);
   const draft=await stored();assert.equal(draft.lines.length,1);assert.equal(draft.lines[0].payout,780);
   assert.equal(draft.race.number,'8');
  });
  await pass('dev19 crash/reload offers explicit recovery rather than auto-merging results',async()=>{
   await page.reload();await page.waitForSelector('#recoverEntryDraft');
   assert.equal((await data()).lines.length,0);
   await page.locator('#recoverEntryDraft').click();
   assert.match(await page.locator('#quickLineTitle').innerText(),/1点/);
   assert.match(await page.locator('#quickSnapshot').innerText(),/780円/);
   assert.equal(await page.locator('#number').inputValue(),'8');
   assert.equal(await page.locator('#entryDraftRecovery').isVisible(),false);
   await page.locator('#entryForm button[type=submit]').click();
   await page.waitForSelector('#historyList');
   assert.equal((await data()).lines[0].payout,780);
   assert.equal(await stored(),null);
  });
  await pass('dev19 a second unfinished pattern can be explicitly discarded',async()=>{
   await go('entry');await page.waitForSelector('#entryForm');
   await page.locator('#openPurchaseSheet').click();
   await page.locator('#type').selectOption('三連複');await page.locator('#mode').selectOption('box');
   await page.locator('#numbers').fill('1 2 3 4');await page.locator('#stake').fill('200');
   await page.waitForFunction(()=>document.querySelector('#entryDraftStatus')?.textContent.includes('保存済み'));
   await page.reload();await page.waitForSelector('#discardEntryDraft');
   await page.locator('#discardEntryDraft').click();await page.waitForFunction(()=>document.querySelector('#entryDraftRecovery')?.hidden===true);
   assert.equal(await stored(),null);
  });
  await pass('dev20 clear current-vs-restore comparison and backup summary',async()=>{
   await go('settings');await page.waitForSelector('#backupSummary');
   assert.match(await page.locator('#backupSummary').innerText(),/1点/);
   await page.waitForFunction(()=>document.querySelector('#lastLocalSave')?.textContent.includes('最後に保存した日時'));
   const snapshot=JSON.stringify(await data());
   await page.locator('#import').setInputFiles({name:'check.json',mimeType:'application/json',buffer:Buffer.from(snapshot)});
   await page.waitForSelector('#restorePreview #restore');
   assert.match(await page.locator('#restorePreview').innerText(),/現在：/);
   assert.match(await page.locator('#restorePreview').innerText(),/復元後：/);
  });
  await pass('dev21 monthly home budget follows viewed month',async()=>{
   await page.locator('#budgetMonth').fill('2026-09');await page.locator('#budgetMonth').dispatchEvent('change');
   await page.locator('#budgetAmount').fill('4500');await page.locator('#budgetForm button[type=submit]').click();
   await page.waitForFunction(()=>document.querySelector('#budgetAmount')?.value==='4500');
   await go('home');console.log('HOME DIAGNOSTIC',JSON.stringify(await page.evaluate(()=>({hash:location.hash,preview:document.querySelector('#app')?.innerText.slice(0,400),notice:document.querySelector('#notice')?.innerText}))));await page.locator('#homeMonthly').click();await page.locator('#month').fill('2026-09');await page.locator('#month').dispatchEvent('change');
   assert.match(await page.locator('#homeBudget').innerText(),/2026-09/);assert.match(await page.locator('#homeBudget').innerText(),/4,500円/);
   await page.locator('#month').fill('2026-10');await page.locator('#month').dispatchEvent('change');
   assert.match(await page.locator('#homeBudget').innerText(),/2026-10/);
  });
  await pass('dev21 responsive screen stays within 320,390,440px',async()=>{
   for(const width of [320,390,440]){await page.setViewportSize({width,height:844});for(const route of ['entry','history','settings']){await go(route);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),route+' '+width);}}
  });
  assert.deepEqual(errors,[]);console.log('ALL '+passed.length+' DEV19-21 RC CHECKS PASSED');
 }finally{if(browser)await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exit(1);});

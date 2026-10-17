/* Development-only: PLAYWRIGHT_PATH and CHROMIUM_MODULE may point to local packages.
   Start HTTP server at project parent, then node tests/browser.cjs.
   No testing dependencies are needed to run the app. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const base=process.env.TEST_URL||'http://127.0.0.1:8000/umalog/';
(async()=>{
 const launch={headless:true};if(process.env.CHROMIUM_MODULE){const portable=require(process.env.CHROMIUM_MODULE);launch.executablePath=await portable.executablePath();launch.args=portable.args.filter(x=>x!=='--disable-web-security'&&x!=='--allow-running-insecure-content');}
 const server=!process.env.EXTERNAL_SERVER ? require('node:http').createServer((req,res)=>{const path=require('node:path');let f=path.resolve(__dirname,'../..','.'+decodeURIComponent(req.url.split('?')[0]));if(f.endsWith('/umalog'))f+='/index.html';try{if(fs.statSync(f).isDirectory())f+='/index.html';const ext=path.extname(f);res.setHeader('Content-Type',({'.js':'text/javascript','.html':'text/html','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.webmanifest':'application/manifest+json'}[ext]||'application/octet-stream'));res.end(fs.readFileSync(f));}catch{res.statusCode=404;res.end();}}).listen(8000,'127.0.0.1'):null;
 const browser=await chromium.launch(launch),results=[];
 async function pass(name,fn){await fn();results.push(name);console.log('PASS '+name);}
 const context=await browser.newContext({viewport:{width:430,height:932},isMobile:true,hasTouch:true,acceptDownloads:true});
 if(process.env.QA_FONT_DIR){const path=require('node:path'),dir=process.env.QA_FONT_DIR;let css=fs.readFileSync(path.join(dir,'400.css'),'utf8').replace(/url\(\.\/(.*?)\)/g,(_,f)=>'url(data:font/'+(f.endsWith('woff2')?'woff2':'woff')+';base64,'+fs.readFileSync(path.join(dir,f)).toString('base64')+')');css+='body{font-family:"Noto Sans JP",sans-serif!important}';await context.addInitScript(css=>{document.addEventListener('DOMContentLoaded',()=>{const s=document.createElement('style');s.textContent=css;document.head.append(s);});},css);}
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
 const nav=async(hash)=>{await page.evaluate(h=>location.hash=h,hash);await page.waitForTimeout(120);};
 await page.addInitScript(()=>{window.__UMALOG_ENTRY_CLASSIC__=true;});await page.goto(base);await page.waitForSelector('.hero');await page.waitForFunction(()=>navigator.serviceWorker.controller);
 await pass('12 / 14: empty screens at mobile viewport, no horizontal overflow',async()=>{for(const r of ['home','entry','history','analysis','growth','settings']){await nav(r);assert.ok(!await page.locator('.error').count());assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));}await nav('home');});
 await pass('02: BOX UI generates 10 lines and 1000 yen',async()=>{await nav('entry');await page.locator('#type').selectOption('三連複');await page.locator('#mode').selectOption('box');await page.locator('#numbers').fill('1 2 3 4 5');await page.locator('#addLine').click();assert.equal(await page.locator('[data-amount]').count(),10);assert.match(await page.locator('.entry-total').innerText(),/1,000円/);await nav('home');});
 await pass('Register multi-type same race and actual settlement',async()=>{await nav('entry');await page.locator('#date').fill('2026-10-04');await page.locator('#type').selectOption('単勝');await page.locator('#numbers').fill('1');await page.locator('#stake').fill('500');await page.locator('#addLine').click();await page.locator('#type').selectOption('複勝');await page.locator('#numbers').fill('1');await page.locator('#addLine').click();await page.locator('#memo').fill('<img src=x onerror=alert(1)>');await page.locator('#allowUnfinished').evaluate(e=>e.checked=true);await page.locator('#entryForm button[type=submit]').click();await page.waitForSelector('[data-detail]');assert.equal(await page.locator('[data-detail]').count(),2);await page.locator('[data-detail]').first().click();await page.waitForSelector('#settlement');assert.equal(await page.locator('img[src=x]').count(),0);await page.locator('[data-choice="0"]').selectOption('hit');await page.locator('[data-payout="0"]').fill('1200');await page.locator('#settlement button[type=submit]').click();await page.waitForTimeout(150);const d=await page.evaluate(async()=>{const {load}=await import('./db.js');return load();});assert.equal(d.lines.filter(l=>l.status==='settled').length,1);const s=await page.evaluate(async()=>{const {aggregate}=await import('./core.js');const {load}=await import('./db.js');return aggregate(await load());});assert.equal(s.profit,700);assert.equal(s.returnRate,240);assert.equal(s.pendingStake,500);assert.equal(s.raceCount,0);});
 await pass('10: reload preserves IndexedDB records',async()=>{await page.reload();await page.waitForSelector('#settlement');assert.equal(await page.locator('[data-payout="0"]').inputValue(),'1200');});
 await pass('v1.0.2: native result picker remains mounted without reopening',async()=>{
  const picker=page.locator('[data-choice="0"]');
  await picker.evaluate(el=>{el.dataset.identityTest='preserved';});
  for(const [choice,payoutVisible,detailsVisible,refundVisible] of [
    ['miss',false,false,false],
    ['refund',false,false,true],
    ['advanced',true,true,false],
    ['pending',false,false,false],
    ['hit',true,false,false]
  ]){
    await picker.selectOption(choice);
    assert.equal(await picker.evaluate(el=>el.dataset.identityTest),'preserved','changing the choice must not replace its native select');
    assert.equal(await page.locator('[data-payout-wrap]').isVisible(),payoutVisible);
    assert.equal(await page.locator('[data-advanced-wrap]').isVisible(),detailsVisible);
    assert.equal(await page.locator('[data-refund-note]').isVisible(),refundVisible);
  }
  assert.equal(await page.locator('[data-payout="0"]').inputValue(),'1200','switching result options must not discard payout');
  await page.locator('#settlement button[type=submit]').click();
  await page.waitForFunction(()=>document.querySelector('#notice')?.textContent.includes('保存'));
  const d=await page.evaluate(async()=>{const {load}=await import('./db.js');return load();});
  assert.ok(d.lines.some(line=>line.status==='settled'&&line.payout===1200));
 });
 await pass('06: zero shortcut settles pending rows / 04 race count is one',async()=>{await nav('history');await page.locator('[data-detail]').nth(1).click();await page.locator('#zero').click();await page.locator('#settlement button[type=submit]').click();await page.waitForTimeout(100);const s=await page.evaluate(async()=>{const {aggregate}=await import('./core.js');const {load}=await import('./db.js');return aggregate(await load());});assert.equal(s.pendingCount,0);assert.equal(s.raceCount,1);assert.equal(s.raceHits,1);assert.equal(s.lineRate,50);});
 await pass('08: edit updates home + analysis; delete updates all',async()=>{await page.locator('#edit').click();await page.locator('[data-amount="0"]').fill('1000');await page.locator('[data-amount="0"]').blur();await page.locator('#allowUnfinished').evaluate(e=>e.checked=true);await page.locator('#entryForm button[type=submit]').click();await page.waitForSelector('[data-detail]');await nav('home');await page.locator('#homeMonthly').click();await page.locator('#month').fill('2026-10');await page.locator('#month').dispatchEvent('change');assert.match(await page.locator('.balance').innerText(),/-300円/);await nav('analysis');assert.match(await page.locator('.balance').innerText(),/-300円/);await nav('history');await page.locator('[data-detail]').nth(1).click();await page.locator('#delete').click();await page.waitForSelector('[data-detail]');assert.equal(await page.locator('[data-detail]').count(),1);await nav('analysis');assert.match(await page.locator('.balance').innerText(),/\+700円/);});
 await pass('v1.0.1: dock tracks detail, settings, direct routes and reduced motion',async()=>{
  for(const route of ['home','analysis','entry','growth','history']){await nav(route);assert.equal(await page.locator('nav a[aria-current=page]').getAttribute('href'),'#'+route);}
  await page.locator('[data-detail]').first().click();assert.equal(await page.locator('nav a[aria-current=page]').getAttribute('href'),'#history');
  await nav('settings');assert.equal(await page.locator('nav a[aria-current=page]').getAttribute('href'),'#history');
  await page.setViewportSize({width:360,height:800});await page.waitForTimeout(250);
  const aligned=await page.evaluate(()=>{const a=document.querySelector('nav a[aria-current=page]').getBoundingClientRect(),b=document.querySelector('.dock-indicator').getBoundingClientRect();return Math.abs(a.x-b.x)<1&&Math.abs(a.width-b.width)<1;});assert.ok(aligned);
  await page.emulateMedia({reducedMotion:'reduce'});assert.equal(await page.locator('.dock-indicator').evaluate(e=>getComputedStyle(e).transitionDuration),'0s');
  await nav('entry');await page.locator('#raceName').fill('未保存');page.removeAllListeners('dialog');page.once('dialog',d=>d.dismiss());await nav('analysis');assert.equal(await page.locator('nav a[aria-current=page]').getAttribute('href'),'#entry');assert.equal(await page.locator('#raceName').inputValue(),'未保存');page.on('dialog',d=>d.accept());await nav('history');
 });
 await pass('v1.0.1: mixed partial refunds preserved and pending-only batch',async()=>{
  const original=await page.evaluate(async()=>{const {load,save}=await import('./db.js');const d=await load(),copy=structuredClone(d),l=d.lines[0];l.status='settled';l.payout=800;l.refund=100;d.lines.push({...l,id:'qa-pending',numbers:[2],status:'pending',payout:0,refund:0},{...l,id:'qa-refund',numbers:[3],status:'pending',payout:0,refund:0});await save(d);return copy;});
  await page.reload();await page.waitForSelector('[data-detail]');await page.locator('[data-detail]').first().click();assert.equal(await page.locator('[data-choice="0"]').inputValue(),'advanced');
  await page.locator('[data-choice="2"]').selectOption('refund');await page.locator('#zero').click();assert.equal(await page.locator('[data-choice="0"]').inputValue(),'advanced');assert.equal(await page.locator('[data-choice="1"]').inputValue(),'miss');assert.equal(await page.locator('[data-choice="2"]').inputValue(),'refund');
  await page.locator('#settlement button[type=submit]').click();await page.waitForTimeout(150);
  const d=await page.evaluate(async()=>{const {load}=await import('./db.js');return load();});assert.equal(d.lines[0].payout,800);assert.equal(d.lines[0].refund,100);assert.equal(d.lines[1].status,'settled');assert.equal(d.lines[2].status,'void');assert.equal(d.lines[2].refund,500);
  await page.locator('[data-choice="1"]').selectOption('hit');await page.locator('#settlement button[type=submit]').click();await page.waitForTimeout(100);assert.match(await page.locator('#notice').innerText(),/1円以上/);
  await page.evaluate(async original=>{const {save}=await import('./db.js');await save(original);},original);await nav('home');await page.reload();await page.waitForSelector('.hero');
 });
 await pass('v1.0.1: 50 tips, categories, focus trap, offline and reduced motion',async()=>{
  await nav('growth');await page.locator('#petTips').click();assert.equal(await page.locator('#tipsClose').evaluate(e=>e===document.activeElement),true);
  const titles=new Set();for(let i=0;i<50;i++){titles.add(await page.locator('#tipTitle').innerText());await page.locator('#tipsNext').click();}assert.equal(titles.size,50);
  await page.locator('#tipsPrev').click();assert.match(await page.locator('#tipsCount').innerText(),/50 \/ 50/);
  await page.locator('#tipsCategory').selectOption('レースの言葉');assert.match(await page.locator('#tipsCount').innerText(),/1 \/ 10/);
  await page.locator('#tipsNext').focus();await page.keyboard.press('Tab');assert.equal(await page.locator('#tipsClose').evaluate(e=>e===document.activeElement),true);
  await page.keyboard.press('Shift+Tab');assert.equal(await page.locator('#tipsNext').evaluate(e=>e===document.activeElement),true);
  await page.keyboard.press('Escape');assert.equal(await page.locator('#tipsModal').count(),0);assert.equal(await page.locator('#petTips').evaluate(e=>e===document.activeElement),true);
  await context.setOffline(true);await page.reload();await page.locator('#petTips').click();await page.locator('#tipsNext').click();assert.ok(await page.locator('#tipBody').innerText());assert.match(await page.locator('#tipsTitle').innerText(),/豆知識/);
  await page.emulateMedia({reducedMotion:'reduce'});assert.equal(await page.locator('.tips-panel').evaluate(e=>getComputedStyle(e).animationName),'none');
  await page.locator('#tipsClose').click();await context.setOffline(false);
 });
 await pass('v1.0.1: dock history navigation, enlarged text and settings persistence',async()=>{
  await nav('home');await nav('analysis');await page.goBack();await page.waitForTimeout(150);assert.equal(await page.locator('nav [aria-current]').getAttribute('href'),'#home');
  await page.goForward();await page.waitForTimeout(150);assert.equal(await page.locator('nav [aria-current]').getAttribute('href'),'#analysis');
  await page.setViewportSize({width:360,height:800});const style=await page.addStyleTag({content:'body{font-size:200%}'});
  for(const route of ['home','entry','history','analysis','growth','settings']){await nav(route);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),route+' enlarged overflow');}
  await style.evaluate(e=>e.remove());await page.locator('#motion').uncheck();await page.locator('#settingsForm button').click();await page.waitForFunction(()=>document.querySelector('#notice')?.textContent.includes('設定を保存しました'));await page.reload();await page.waitForSelector('#motion');assert.equal(await page.locator('#motion').isChecked(),false);
  await nav('growth');await page.locator('#petTips').click();assert.equal(await page.locator('.tips-panel').evaluate(e=>getComputedStyle(e).animationName),'none');await page.locator('#tipsClose').click();
 });
 let backup;
 await pass('09: JSON export + preview + confirmed replacement restores data',async()=>{await nav('settings');await page.evaluate(()=>{Object.defineProperty(navigator,'canShare',{configurable:true,value:()=>false});});const dp=page.waitForEvent('download');await page.locator('#export').click();const dl=await dp;backup=JSON.parse(fs.readFileSync(await dl.path(),'utf8'));assert.equal(backup.lines.length,1);await nav('history');await page.locator('[data-detail]').first().click();await page.locator('#delete').click();await page.waitForFunction(()=>document.querySelector('#notice')?.textContent.includes('削除しました'));await nav('settings');await page.locator('#import').setInputFiles({name:'backup.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(backup))});await page.waitForSelector('#restore');await page.locator('#restoreAgree').check();await page.locator('#restore').click();await page.waitForSelector('.hero');const d=await page.evaluate(async()=>{const {load}=await import('./db.js');return load();});assert.deepEqual(d.lines,backup.lines);});
 await pass('Invalid restore keeps existing data',async()=>{await nav('settings');await page.locator('#import').setInputFiles({name:'bad.json',mimeType:'application/json',buffer:Buffer.from('{"schemaVersion":999}')});await page.waitForTimeout(100);assert.equal(await page.locator('#restore').count(),0);const d=await page.evaluate(async()=>{const {load}=await import('./db.js');return load();});assert.equal(d.lines.length,1);});
 await pass('11: review awards once and is retained across reload',async()=>{await nav('growth');await page.locator('#reviewDetails > summary').click();await page.locator('#reviewWeek').fill('2026-09-28');await page.locator('#reviewWeek').dispatchEvent('change');await page.locator('#reviewText').fill('購入を増やさず、記録を振り返る。');await page.locator('#reviewForm button').click();await page.waitForTimeout(100);const first=await page.locator('.wide-number').innerText();await page.locator('#reviewWeek').fill('2026-09-28');await page.locator('#reviewWeek').dispatchEvent('change');await page.locator('#reviewText').fill('文章を訂正した。');await page.locator('#reviewForm button').click();await page.waitForTimeout(100);assert.equal(await page.locator('.wide-number').innerText(),first);await page.reload();await page.waitForSelector('.wide-number');assert.equal(await page.locator('.wide-number').innerText(),first);});
 await pass('13: offline cold page opens cached subpath app and saved records',async()=>{await context.setOffline(true);const offline=await context.newPage();await offline.goto(base+'#history');await offline.waitForSelector('[data-detail]');assert.equal(await offline.locator('[data-detail]').count(),1);await offline.close();await context.setOffline(false);});
 await pass('14: Android-sized 360px layout and reduced-motion',async()=>{await page.setViewportSize({width:360,height:800});await page.emulateMedia({reducedMotion:'reduce'});for(const r of ['home','entry','history','analysis','growth','settings']){await nav(r);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),r+' overflow');}await nav('growth');assert.equal(await page.locator('.pet').evaluate(e=>getComputedStyle(e).animationName),'none');});
 await pass('v1.1.0: style denominators, missing source, historical join and offline cache',async()=>{
  await nav('settings');await page.locator('#raceInfoPanel details').evaluate(e=>e.open=true);assert.equal(await page.locator('#refreshRaces').isDisabled(),true);assert.match(await page.locator('#raceInfoStatus').innerText(),/提供元未設定/);assert.match(await page.locator('#raceInfoPanel').innerText(),/最終成功：未実施/);
  await nav('entry');assert.match(await page.locator('#raceMatch').innerText(),/情報未取得/);
  await nav('analysis');assert.match(await page.locator('#racingStyle').innerText(),/購入総額/);assert.equal(await page.locator('#racingStyle .style-group').count(),9);
  await page.locator('#racingStyle .style-group').evaluateAll(els=>els.forEach(e=>e.open=true));
  assert.match(await page.locator('#racingStyle').innerText(),/情報未取得/);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  const before=await page.evaluate(async()=>{const db=await import('./db.js');const d=await db.load();const {emptyCatalog}=await import('./race-info.js');await db.saveCatalog({...emptyCatalog(),records:[{date:d.races[0].date,venue:d.races[0].venue,number:d.races[0].number,name:'TEST ONLY',condition:'テスト条件',grade:null,surface:'芝',distance:1600,source:'fixture',updatedAt:'2026-10-16T00:00:00Z'}]});return d;});
  await context.setOffline(true);await page.reload();await page.waitForSelector('#racingStyle');assert.match(await page.locator('#racingStyle').innerText(),/条件照合 1 \/ 1レース/);
  await page.locator('#racingStyle .style-group').evaluateAll(els=>els.forEach(e=>e.open=true));assert.match(await page.locator('#racingStyle').innerText(),/テスト条件/);
  await nav('history');await page.locator('[data-detail]').first().click();await page.waitForSelector('#settlement');assert.match(await page.locator('#app').innerText(),/TEST ONLY/);
  assert.deepEqual(await page.evaluate(async()=> (await import('./db.js')).load()),before);
  await context.setOffline(false);
  // Corrupt only disposable metadata; startup must still load accounting.
  await page.evaluate(()=>new Promise((resolve,reject)=>{const r=indexedDB.open('umalog',1);r.onsuccess=()=>{const db=r.result,tx=db.transaction('state','readwrite');tx.objectStore('state').put({version:999},'raceCatalog');tx.oncomplete=()=>{db.close();resolve();};tx.onerror=()=>reject(tx.error);};}));
  await nav('settings');await page.reload();await page.waitForSelector('#raceInfoPanel');await page.locator('#raceInfoPanel details').evaluate(e=>e.open=true);assert.match(await page.locator('#raceInfoPanel').innerText(),/キャッシュを読み込めません/);assert.deepEqual(await page.evaluate(async()=> (await import('./db.js')).load()),before);
  await page.evaluate(async()=>{const {saveCatalog}=await import('./db.js');await saveCatalog((await import('./race-info.js')).emptyCatalog());});
 });
 await nav('home');await page.locator('#homeMonthly').click();await page.locator('#month').fill('2026-10');await page.locator('#month').dispatchEvent('change');await page.evaluate(()=>document.fonts.ready);await page.screenshot({path:process.env.SCREENSHOT_PATH||'/tmp/umalog-home.png',fullPage:true});
 await nav('analysis');await page.locator('#racingStyle .style-group').first().evaluate(e=>e.open=true);await page.screenshot({path:'/tmp/umalog-style.png',fullPage:true});
 assert.deepEqual(errors,[]);results.push('No uncaught browser errors');
 fs.writeFileSync(process.env.RESULT_PATH||'/tmp/umalog-browser-results.json',JSON.stringify({engine:await browser.version(),viewportTests:['430x932','360x800'],results},null,2));
 await browser.close();if(server)server.close();console.log('ALL '+results.length+' BROWSER CHECKS PASSED');
})().catch(e=>{console.error(e);process.exit(1);});

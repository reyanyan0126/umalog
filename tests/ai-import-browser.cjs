const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const pw=require(process.env.PLAYWRIGHT_PATH||'playwright');
(async()=>{
 const root=path.resolve(__dirname,'..'),raw=fs.readFileSync(path.join(__dirname,'fixtures/ai-kyoto-20261024.txt'),'utf8');
 const server=http.createServer((req,res)=>{let p=req.url.split('?')[0];if(p.endsWith('/'))p+='index.html';try{res.setHeader('Content-Type',({'.js':'text/javascript','.html':'text/html','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png'}[path.extname(p)]||'application/octet-stream'));res.end(fs.readFileSync(path.join(root,p)));}catch{res.writeHead(404).end();}});await new Promise(r=>server.listen(0,'127.0.0.1',r));
 let browser;try{
 browser=await pw[process.env.BROWSER||'chromium'].launch({headless:true});
 const ctx=await browser.newContext({viewport:{width:440,height:956},isMobile:true,hasTouch:true});const page=await ctx.newPage();page.setDefaultTimeout(15000);const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
 const base=process.env.TEST_URL||`http://127.0.0.1:${server.address().port}/${process.env.PUBLISH?'publish/':''}`;
 const link=base+'#ai-import?text='+encodeURIComponent(raw);
 await page.goto(link);await page.locator('#aiImportReview:not([hidden])').waitFor();assert.equal(await page.locator('#launchScreen').isVisible(),false);assert.equal(await page.locator('#aiImportReview tbody tr').count(),10);assert.match(await page.locator('#aiImportReview').innerText(),/1,500/);assert.match(await page.locator('#aiImportReview').innerText(),/2,160/);assert.match(await page.locator('#aiImportReview').innerText(),/660/);
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 // A fresh isolated browser context, never the user's existing ledger.
 const read=()=>page.evaluate(async()=>await(await import('./db.js')).load());
 assert.equal((await read()).lines.length,0);
 await page.locator('#aiImportSave').click();assert.match(await page.locator('#aiImportError').innerText(),/チェック/);assert.equal((await read()).lines.length,0);
 await page.evaluate(()=>{document.querySelector('#aiImportSave').click();document.querySelector('#aiImportSave').click();});await page.waitForFunction(()=>location.hash==='#history');
 const saved=await read();assert.equal(saved.lines.length,10);assert.equal(saved.lines.reduce((n,l)=>n+l.stake,0),1500);assert.equal(saved.lines.reduce((n,l)=>n+l.payout,0),2160);
 for(const route of ['home','analysis','history']){await page.evaluate(r=>location.hash=r,route);await page.waitForTimeout(150);assert.equal(await page.locator('#app > .error').count(),0);assert.match(await page.locator('#app').innerText(),/660/);}
 await page.goto(link);await page.locator('#aiImportReview:not([hidden])').waitFor();await page.locator('#aiImportSave').click();assert.match(await page.locator('#aiImportError').innerText(),/登録済み/);assert.equal((await read()).lines.length,10);
 // Storage failure must leave every row unchanged and allow retry.
 await page.goto(base+'#ai-import?text='+encodeURIComponent(raw.replace('0001','0002')));await page.evaluate(async()=>{const db=await import('./db.js');const original=db.save;window.__beforeFailedImport=JSON.stringify(await db.load());window.__originalTransaction=IDBDatabase.prototype.transaction;IDBDatabase.prototype.transaction=function(...args){if(args[1]==='readwrite')throw Error('テスト保存失敗');return window.__originalTransaction.apply(this,args);};});
 await page.locator('#aiImportSave').click();assert.match(await page.locator('#aiImportError').innerText(),/テスト保存失敗/);assert.equal(await page.evaluate(async()=>JSON.stringify(await(await import('./db.js')).load())===window.__beforeFailedImport),true);await page.evaluate(()=>IDBDatabase.prototype.transaction=window.__originalTransaction);await page.locator('#aiImportSave').click();await page.waitForFunction(()=>location.hash==='#history');assert.equal((await read()).lines.length,20);
 // Missing results remain pending, with result-entry UI available later.
 const pending=raw.replace(/／不的中／払戻0円|／的中／払戻2,160円/g,'／未確定').replace('払戻合計：2,160円','払戻合計：未確認').replace('0001','0003');
 await page.goto(base+'#ai-import?text='+encodeURIComponent(pending));await page.locator('#aiImportSave').click();await page.waitForFunction(()=>location.hash==='#history');assert.equal((await read()).lines.filter(l=>l.status==='pending').length,10);
 const pendingTicket=(await read()).tickets.find(t=>t.memo.includes('0003'));await page.goto(base+'#detail/'+pendingTicket.id);assert.equal(await page.locator('#settlement').count(),1);assert.match(await page.locator('#app').innerText(),/AI取込のレース情報/);
 // 816 unique three-horse combinations in one screen, with no horizontal overflow.
 const many=[];for(let a=1;a<=18;a++)for(let b=a+1;b<=18;b++)for(let c=b+1;c<=18;c++)many.push(`${a}-${b}-${c}：100円／払戻0円`);
 const large=raw.replace(/【購入情報】[\s\S]*?【収支】/,'【購入情報】\n'+many.join('\n')+'\n【収支】').replace('1,500円','81,600円').replace('払戻合計：2,160円','払戻合計：0円');
 await page.goto(base+'#ai-import');await page.locator('#aiImportText').fill(large);await page.locator('#aiImportPreview').click();assert.equal(await page.locator('#aiImportReview tbody tr').count(),816);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 // HTML payload is shown as text, never executed.
 const hostile=raw.replace('レース名：2歳未勝利','レース名：<img src=x onerror=alert(1)>');await page.goto(base+'#ai-import?text='+encodeURIComponent(hostile));await page.locator('#aiImportReview:not([hidden])').waitFor();assert.equal(await page.locator('#aiImportReview img').count(),0);
 await page.goto(base+'#ai-import?text=%XX');await page.locator('#aiImportError').waitFor();assert.match(await page.locator('#aiImportError').innerText(),/文字コード/);
 assert.deepEqual(errors,[]);console.log('PASS AI import:',process.env.BROWSER||'chromium',process.env.PUBLISH?'publish':'source','fresh deep link, 10 lines, cash, double-tap, duplicate, atomic failure/retry, pending, XSS, URL errors');
 await ctx.close();
 }finally{await browser?.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});

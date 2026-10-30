const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http'),pw=require('playwright');
(async()=>{
 const root=path.resolve(__dirname,'..');const server=http.createServer((req,res)=>{let name=new URL(req.url,'http://localhost').pathname;if(name.endsWith('/'))name+='index.html';const file=path.resolve(root,'.'+name);if(!file.startsWith(root+path.sep))return res.writeHead(403).end();try{res.setHeader('Content-Type',({'.js':'text/javascript','.html':'text/html','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png'}[path.extname(file)]||'text/plain'));res.end(fs.readFileSync(file));}catch{res.writeHead(404).end();}});await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await pw[process.env.BROWSER||'chromium'].launch({headless:true});
 try{
 const ctx=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block'}),page=await ctx.newPage();page.on('dialog',d=>d.accept());const url='http://127.0.0.1:'+server.address().port;
 await page.goto(url);await page.locator('#launchStart:not([disabled])').click();await page.goto(url+'/#entry');
 await page.waitForFunction(()=>document.querySelector('#entryDraftStatus')?.textContent.includes('入力すると'));
 await page.evaluate(()=>{window.originalPut=IDBObjectStore.prototype.put;IDBObjectStore.prototype.put=function(value,key){if(String(key).startsWith('entryDraft:'))throw new DOMException('synthetic quota failure','QuotaExceededError');return originalPut.call(this,value,key);};});
 await page.locator('#memo').evaluate((el,value)=>{el.value=value;el.dispatchEvent(new Event('input',{bubbles:true}));},'失敗しても残す入力');await page.locator('nav a[href="#history"]').click();
 await page.waitForFunction(()=>document.querySelector('#notice')?.textContent.includes('quota'));
 assert.equal(new URL(page.url()).hash,'#entry');assert.equal(await page.locator('#memo').inputValue(),'失敗しても残す入力');
 await page.evaluate(()=>IDBObjectStore.prototype.put=originalPut);await page.locator('#memo').evaluate((el,value)=>{el.value=value;el.dispatchEvent(new Event('input',{bubbles:true}));},'再保存後も保持');await page.locator('nav a[href="#history"]').click();await page.locator('#historySearch').waitFor();
 await page.goto(url+'/#entry');await page.locator('#recoverEntryDraft').click();assert.equal(await page.locator('#memo').inputValue(),'再保存後も保持');
 console.log('PASS failed draft flush blocks navigation, explicit later save recovers input');
 await page.locator('nav a[href="#history"]').click();await page.locator('#historySearch').waitFor();
 const before=await page.evaluate(async()=>JSON.stringify(await(await import('./db.js')).loadEntryDraft('new')));
 await page.evaluate(()=>{window.originalGet=IDBObjectStore.prototype.get;IDBObjectStore.prototype.get=function(key){if(key==='entryDraft:new')throw new Error('synthetic draft read failure');return originalGet.call(this,key);};});
 await page.goto(url+'/#entry');await page.waitForFunction(()=>document.querySelector('#entryDraftStatus')?.textContent.includes('読み込めません'));
 await page.locator('#memo').evaluate((el,value)=>{el.value=value;el.dispatchEvent(new Event('input',{bubbles:true}));},'上書きしてはいけない');await page.evaluate(()=>document.querySelector('#entryForm').dispatchEvent(new Event('submit',{cancelable:true,bubbles:true})));
 await page.waitForFunction(()=>document.querySelector('#notice')?.textContent.includes('下書きの確認'));
 await page.evaluate(()=>IDBObjectStore.prototype.get=originalGet);
 assert.equal(await page.evaluate(async()=>JSON.stringify(await(await import('./db.js')).loadEntryDraft('new'))),before);
 assert.equal(await page.evaluate(async()=>(await(await import('./db.js')).loadWithRevision()).revision),0);
 console.log('PASS failed draft read blocks save and never overwrites existing draft');await ctx.close();
 }finally{await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});

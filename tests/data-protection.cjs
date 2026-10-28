const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const pw=require('playwright');
(async()=>{
 const root=path.resolve(__dirname,'..');let release='current',broken=false;
 const server=http.createServer((req,res)=>{
  let name=new URL(req.url,'http://localhost').pathname;if(name.endsWith('/'))name+='index.html';
  const file=path.resolve(root,'.'+name);if(!file.startsWith(root+path.sep))return res.writeHead(403).end();
  if(broken&&name==='/backup-manager.js')return res.writeHead(503).end();
  try{res.setHeader('Content-Type',({'.js':'text/javascript','.html':'text/html','.css':'text/css','.json':'application/json','.webmanifest':'application/manifest+json','.png':'image/png','.svg':'image/svg+xml'}[path.extname(file)]||'text/plain'));res.setHeader('Cache-Control','no-store');
   let content=fs.readFileSync(file);if(name==='/sw.js')content=content.toString().replace("const VERSION='4.5.2'",`const VERSION='4.5.2-${release}'`);res.end(content);
  }catch{res.writeHead(404).end();}
 });await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
 const browser=await pw[process.env.BROWSER||'chromium'].launch({headless:true,...(process.env.BROWSER_PATH?{executablePath:process.env.BROWSER_PATH}:{})});
 let passed=0;const pass=name=>{passed++;console.log('PASS',name);};
 try{
 const context=await browser.newContext(),page=await context.newPage();await page.goto(base+'/rescue.html');
 await page.evaluate(async()=>{window.dbmod=await import('./db.js');window.core=await import('./core.js');window.readRaw=async(key)=>{const db=await dbmod.openDB();return new Promise((resolve,reject)=>{const tx=db.transaction('state','readonly'),r=tx.objectStore('state').get(key);tx.oncomplete=()=>resolve(r.result);tx.onabort=()=>reject(tx.error);});};window.fixture=()=>{const d=core.emptyData();d.simpleEntries=[{id:'simple1',date:'2026-10-28',stake:1000,payout:2200,refund:0,status:'settled',venue:null,number:null,type:null,name:'',memo:''}];return d;};});
 assert.equal(await page.evaluate(async()=>{await dbmod.loadWithRevision();return (await readRaw('main'))===undefined;}),true);pass('first startup never writes');
 await page.evaluate(async()=>{await dbmod.save(fixture(),{expectedRevision:0});});
 assert.equal(await page.evaluate(async()=>(await dbmod.listBackups()).length),1);pass('first save exactly one snapshot');
 assert.equal(await page.evaluate(async()=>{const s=await dbmod.loadWithRevision();s.data.simpleEntries.push({...s.data.simpleEntries[0],id:'simple2'});await dbmod.save(s.data,{expectedRevision:s.revision});return (await dbmod.listBackups()).length;}),2);pass('second save retains previous generation');
 assert.equal(await page.evaluate(async()=>{const s=await dbmod.loadWithRevision();s.data.simpleEntries[0].stake=2000;await dbmod.save(s.data,{expectedRevision:s.revision});return JSON.parse((await dbmod.listBackups()).find(x=>x.revision===2).json).simpleEntries[0].stake;}),1000);pass('edit retains pre-edit values');
 assert.equal(await page.evaluate(async()=>{const before=JSON.stringify(await readRaw('main'));try{await dbmod.save(core.emptyData(),{expectedRevision:3});}catch{}return before===JSON.stringify(await readRaw('main'));}),true);pass('unexpected empty overwrite blocked');
 assert.equal(await page.evaluate(async()=>{try{await dbmod.save(fixture());return false;}catch{return true;}}),true);pass('unconditional write blocked');
 // Force a synchronous error after main/revision writes were queued.
 assert.equal(await page.evaluate(async()=>{const before=JSON.stringify(await readRaw('main')),put=IDBObjectStore.prototype.put;IDBObjectStore.prototype.put=function(v,k){if(String(k).startsWith('ledgerBackup:')&&v.revision===4)throw new DOMException('forced quota','QuotaExceededError');return put.call(this,v,k);};let rejected=false;try{await dbmod.save(fixture(),{expectedRevision:3});}catch{rejected=true;}finally{IDBObjectStore.prototype.put=put;}return rejected&&before===JSON.stringify(await readRaw('main'))&&(await readRaw('mainRevision'))===3;}),true);pass('backup failure rolls back main and revision atomically');
 assert.deepEqual(await page.evaluate(async()=>{const s=await dbmod.loadWithRevision();return (await Promise.allSettled([dbmod.save(s.data,{expectedRevision:s.revision}),dbmod.save(s.data,{expectedRevision:s.revision})])).map(x=>x.status);}),['fulfilled','rejected']);pass('concurrent saves only one wins');
 await page.evaluate(async()=>{const s=await dbmod.loadWithRevision();await dbmod.save(core.emptyData(),{expectedRevision:s.revision,allowEmpty:true});const rows=await dbmod.listBackups();const candidate=JSON.parse(rows.find(x=>x.revision===4).json);await dbmod.save(candidate,{expectedRevision:5,restore:true});});
 assert.equal(await page.evaluate(async()=>(await readRaw('main')).simpleEntries.length),2);pass('confirmed deletion recoverable from previous generation');
 assert.ok(await page.evaluate(async()=>!!await readRaw('preRestoreBackup')));pass('restore preserves pre-restore snapshot');
 assert.equal(await page.evaluate(async()=>{const before=JSON.stringify(await readRaw('main'));try{await dbmod.save(core.emptyData(),{expectedRevision:6,restore:true,allowEmpty:true});}catch{}return before===JSON.stringify(await readRaw('main'));}),true);pass('empty restore cannot bypass guard');
 assert.equal(await page.evaluate(async()=>{const before=JSON.stringify(await readRaw('main'));const x=fixture();x.simpleEntries[0].refund=999999;try{await dbmod.save(x,{expectedRevision:6,restore:true});}catch{}return before===JSON.stringify(await readRaw('main'));}),true);pass('invalid JSON restore leaves old data');
 await page.evaluate(async()=>{for(let i=0;i<53;i++){const s=await dbmod.loadWithRevision();await dbmod.save(s.data,{expectedRevision:s.revision});}});
 assert.deepEqual(await page.evaluate(async()=>{const rows=(await dbmod.listBackups()).filter(x=>x.key!=='preRestoreBackup');return [rows.length,rows[0].revision,rows.at(-1).revision,rows.every(x=>x.valid)];}),[50,59,10,true]);pass('exactly 50 intact generations after 59 revisions');
 const exported=await page.evaluate(async()=>JSON.stringify(await readRaw('main')));
 // Independent storage environment.
 const other=await browser.newContext(),otherPage=await other.newPage();await otherPage.goto(base+'/rescue.html');
 assert.equal(await otherPage.evaluate(async json=>{const m=await import('./db.js');await m.save(JSON.parse(json),{expectedRevision:0,restore:true});return (await m.load()).simpleEntries.length;},exported),2);await other.close();pass('export imports into an independent browser context');
 // Read errors must reject, never return an empty ledger.
 assert.equal(await page.evaluate(async()=>{const get=IDBObjectStore.prototype.get;IDBObjectStore.prototype.get=function(){throw new Error('forced read failure');};try{await dbmod.loadWithRevision();return false;}catch{return true;}finally{IDBObjectStore.prototype.get=get;}}),true);pass('read failure rejects');
 // Corrupt persisted main deliberately in isolated test storage; check no mutation on load/save.
 assert.equal(await page.evaluate(async()=>{const db=await dbmod.openDB(),original=await readRaw('main');async function put(value){return new Promise(r=>{const tx=db.transaction('state','readwrite');tx.objectStore('state').put(value,'main');tx.oncomplete=r;});}await put(null);let failures=0;try{await dbmod.loadWithRevision();}catch{failures++;}try{await dbmod.save(fixture(),{expectedRevision:59});}catch{failures++;}const unchanged=(await readRaw('main'))===null;await put(original);return failures===2&&unchanged;}),true);pass('null/corrupt data is not treated as first launch');
 // Reload/PWA update/offline, with the populated ledger.
 await page.goto(base);await page.locator('#launchStart:not([disabled])').waitFor();await page.locator('#launchStart').click();await page.locator('#homeSummary').waitFor();
 await page.waitForFunction(()=>!!navigator.serviceWorker.controller);await page.reload();
 assert.equal(await page.evaluate(async()=>(await (await import('./db.js')).loadWithRevision()).revision),59);pass('normal startup and reload do not save or migrate persisted bytes');
 release='interrupted';broken=true;
 await page.evaluate(async()=>{const r=await navigator.serviceWorker.ready;await r.update();});
 await page.waitForFunction(async()=>{const r=await navigator.serviceWorker.ready;return !r.installing;});
 assert.equal(await page.evaluate(async()=>!!(await navigator.serviceWorker.ready).waiting),false);pass('interrupted update never activates incomplete release');
 broken=false;release='updated';await page.evaluate(async()=>{await (await navigator.serviceWorker.ready).update();});
 await page.waitForFunction(async()=>!!(await navigator.serviceWorker.ready).waiting);
 await page.evaluate(async()=>{(await navigator.serviceWorker.ready).waiting?.postMessage({type:'SKIP_WAITING'});});
 await page.waitForFunction(async()=>!(await navigator.serviceWorker.ready).waiting);await page.reload();
 assert.deepEqual(await page.evaluate(async()=>{const m=await import('./db.js');return [(await m.loadWithRevision()).revision,(await m.listBackups()).filter(x=>x.key!=='preRestoreBackup').length];}),[59,50]);pass('successful PWA update retains records and 50 generations');
 await context.setOffline(true);await page.reload();await page.locator('#homeSummary').waitFor();
 await page.goto(base+'/rescue.html');assert.match(await page.locator('h1').textContent(),/保存データ救出/);
 await page.goto(base+'/recovery.html');assert.match(await page.locator('h1').textContent(),/起動復旧/);pass('offline app and exact rescue/recovery navigation');await context.setOffline(false);
 // Legacy main has no revision/backups; migration only becomes durable on user save.
 const legacy=await browser.newContext(),lp=await legacy.newPage();await lp.goto(base+'/rescue.html');
 assert.equal(await lp.evaluate(async json=>{const m=await import('./db.js'),db=await m.openDB();await new Promise(r=>{const tx=db.transaction('state','readwrite');tx.objectStore('state').put(JSON.parse(json),'main');tx.oncomplete=r;});const s=await m.loadWithRevision();await m.save(s.data,{expectedRevision:s.revision});return (await m.listBackups()).some(x=>x.revision===0&&x.records===2);},exported),true);await legacy.close();pass('legacy no-revision snapshot protected before first save');
 // User-facing add/edit/delete, backup preview and restore.
 const ui=await browser.newContext({viewport:{width:390,height:844}}),up=await ui.newPage();up.on('dialog',d=>d.accept());await up.goto(base);await up.locator('#launchStart:not([disabled])').click();
 await up.goto(base+'/#quick');await up.locator('#simpleStake').fill('1000');await up.locator('#simplePayout').fill('2300');await up.locator('#simpleSave').click();await up.locator('#externalBackupPrompt').waitFor();
 await up.goto(base+'/#settings');await up.locator('#backupManager details').waitFor();assert.equal(await up.locator('#backupManager details').count(),1);
 const uiId=await up.evaluate(async()=>(await (await import('./db.js')).load()).simpleEntries[0].id);
 await up.goto(base+'/#quick-edit/'+uiId);await up.locator('#simpleStake').fill('2000');await up.locator('#simpleSave').click();await up.waitForURL('**/#history');
 await up.goto(base+'/#quick-edit/'+uiId);await up.locator('#simpleDelete').click();await up.waitForURL('**/#history');
 await up.goto(base+'/#settings');await up.locator('#backupManager details').first().waitFor();
 const oldGeneration=up.locator('#backupManager details').filter({hasText:'世代 1 /'});await oldGeneration.locator('summary').click();await oldGeneration.getByRole('button',{name:'内容を確認して復元'}).click();await up.locator('#homeSummary').waitFor();
 assert.equal(await up.evaluate(async()=>(await (await import('./db.js')).load()).simpleEntries[0].stake),1000);pass('iPhone-sized UI add/edit/delete/preview/generation restore');
 await up.goto(base+'/#settings');await up.locator('#import').setInputFiles({name:'invalid.json',mimeType:'application/json',buffer:Buffer.from('{broken')});
 assert.equal(await up.evaluate(async()=>(await (await import('./db.js')).load()).simpleEntries[0].stake),1000);pass('invalid JSON file through real UI preserves ledger');
 await ui.close();
 await context.close();console.log(`${passed} data protection checks passed (${process.env.BROWSER||'chromium'})`);
 }finally{await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});

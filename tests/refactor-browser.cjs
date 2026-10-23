const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const pw=require(process.env.PLAYWRIGHT_PATH||'playwright');
(async()=>{
 const root=path.resolve(__dirname,'..'),baseline=process.env.BASELINE_DIR;
 assert.ok(baseline,'BASELINE_DIR is required');
 const output=process.env.OUTPUT_DIR||path.join(root,'test-artifacts');fs.mkdirSync(output,{recursive:true});
 const server=http.createServer((req,res)=>{const parts=req.url.split('?')[0].split('/'),target=parts[1]==='baseline'?baseline:root;let file='/'+parts.slice(2).join('/');if(file.endsWith('/'))file+='index.html';try{res.setHeader('Content-Type',({'.js':'text/javascript','.html':'text/html','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png'}[path.extname(file)]||'application/octet-stream'));res.end(fs.readFileSync(path.join(target,file)));}catch{res.writeHead(404).end();}});await new Promise(r=>server.listen(0,'127.0.0.1',r));
 let browser;try{
 const adapter=process.env.CHROMIUM_MODULE?require(process.env.CHROMIUM_MODULE):null;
 browser=await pw[process.env.BROWSER||'chromium'].launch({headless:true,...adapter?{executablePath:await adapter.executablePath(),args:adapter.args}:{}});
 const results=[];
 for(const width of [390,768,1280]){
  const shots=[];
  for(const variant of ['baseline','candidate']){
   const ctx=await browser.newContext({viewport:{width,height:844},serviceWorkers:'block',hasTouch:true});const page=await ctx.newPage();page.setDefaultTimeout(10000);const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
   await page.clock.setFixedTime(new Date('2026-10-24T03:00:00Z'));
   const url=`http://127.0.0.1:${server.address().port}/${variant}/`;
   await page.goto(url);await page.locator('#launchStart:not([disabled])').waitFor();await page.locator('#launchStart').click();await page.locator('#homeSummary').waitFor();
   await page.evaluate(async()=>{const db=await import('./db.js'),{makeSimpleEntry}=await import('./simple-ledger.js');const d=await db.load();d.settings.motion=false;d.simpleEntries=[makeSimpleEntry({date:'2026-10-24',stake:1000,payout:1700},'fixture')];d.races=[{id:'r',date:'2026-10-24',venue:'東京',number:1,name:'比較用'}];d.tickets=[{id:'t',raceId:'r',type:'単勝',kind:'reported',memo:'',createdAt:'2026-10-24T00:00:00Z'}];d.lines=[{id:'l',ticketId:'t',numbers:[1],stake:100,status:'pending',payout:0,refund:0}];await db.save(d);});
   await page.reload();await page.locator('#homeSummary').waitFor();
   const snapshots={};
   for(const route of ['home','quick','history','analysis','growth','settings','calendar','entry','day/2026-10-24','quick-edit/fixture','quick-result/fixture','detail/t','edit/t','title']){
    await page.evaluate(r=>location.hash=r,route);await page.waitForTimeout(250);
    assert.equal(await page.locator('#app > .error').count(),0,variant+route);
    // Exclude only transient notices/status/version. Layout and all app content remain compared.
    await page.addStyleTag({content:'#notice{display:none!important}'});
    const mask=[page.locator('#launchUpdateStatus')];
    snapshots[route]=await page.screenshot({fullPage:true,animations:'disabled',mask});
    fs.writeFileSync(path.join(output,`${width}-${variant}-${route.replaceAll('/','_')}.png`),snapshots[route]);
   }
   shots.push(snapshots);assert.deepEqual(errors,[]);
   if(width===390){
    await page.locator('#launchStart').click();await page.evaluate(()=>location.hash='quick');await page.locator('#simpleStake').fill('2000');await page.locator('#simplePayout').fill('3000');await page.locator('#simpleSave').click();await page.waitForTimeout(200);
    const id=await page.evaluate(async()=>{const d=await(await import('./db.js')).load();return d.simpleEntries.find(x=>x.id!=='fixture').id;});
    await page.evaluate(id=>location.hash='quick-edit/'+id,id);await page.locator('#simplePayout').fill('4000');await page.locator('#simpleSave').click();await page.waitForTimeout(200);
    assert.equal(await page.evaluate(async id=>(await(await import('./db.js')).load()).simpleEntries.find(x=>x.id===id).payout,id),4000);
    await page.evaluate(id=>location.hash='quick-edit/'+id,id);await page.locator('#simpleDelete').click();await page.waitForTimeout(200);
    assert.equal(await page.evaluate(async()=> (await(await import('./db.js')).load()).simpleEntries.length),1);
    const backup=await page.evaluate(async()=>JSON.stringify(await(await import('./db.js')).load()));
    await page.evaluate(()=>location.hash='settings');await page.locator('#import').setInputFiles({name:'backup.json',mimeType:'application/json',buffer:Buffer.from(backup)});await page.locator('#restoreAgree').check();await page.locator('#restore').click();await page.waitForTimeout(200);
    assert.equal(await page.evaluate(async()=>JSON.stringify(await(await import('./db.js')).load())),backup);
    await page.evaluate(async()=>{const db=await import('./db.js');await db.saveEntryDraft('qa',{value:1});if((await db.loadEntryDraft('qa')).value!==1)throw Error('draft');await db.discardEntryDraft('qa');if(await db.loadEntryDraft('qa')!==null)throw Error('discard');const at=await db.confirmBackupStored();if(await db.loadBackupConfirmation()!==at)throw Error('attestation');if(!await db.loadMainSaveTime())throw Error('save timestamp');const a=await db.loadWithRevision();await db.save(a.data,{expectedRevision:a.revision});try{await db.save(a.data,{expectedRevision:a.revision});throw Error('stale save accepted')}catch(e){if(e.code!=='STALE_LEDGER')throw e;}});
    console.log('PASS',variant,'UI create/edit/delete, JSON restore exact, draft CRUD, metadata, stale-write rejection');
   }
   await ctx.close();
  }
  for(const route of Object.keys(shots[0])){assert.ok(shots[0][route].equals(shots[1][route]),`pixel mismatch ${width} ${route}`);results.push({width,route,pixels:'identical'});}
  console.log('PASS',width,'14 route screenshots byte-identical');
 }
 fs.writeFileSync(path.join(output,'comparison.json'),JSON.stringify(results,null,2));
 }finally{await browser?.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1});

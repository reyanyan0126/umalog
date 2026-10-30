// Paired v4.5.9/candidate measurements in isolated contexts with synthetic records.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {pathToFileURL}=require('node:url'),pw=require('playwright');
(async()=>{
 const root=path.resolve(__dirname,'..'),baseline=process.env.BASELINE_DIR;assert.ok(baseline,'BASELINE_DIR required');
 const {qualityLedger}=await import('./fixtures/quality-ledger.js');
 const server=http.createServer((req,res)=>{const parts=new URL(req.url,'http://localhost').pathname.split('/'),variant=parts[1],dir=variant==='baseline'?baseline:root;let name=parts.slice(2).join('/')||'index.html';if(name.endsWith('/'))name+='index.html';const file=path.resolve(dir,name);if(!file.startsWith(path.resolve(dir)+path.sep))return res.writeHead(403).end();try{res.setHeader('Content-Type',({'.js':'text/javascript','.html':'text/html','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.webmanifest':'application/manifest+json'}[path.extname(file)]||'text/plain'));res.setHeader('Cache-Control','no-store');res.end(fs.readFileSync(file));}catch{res.writeHead(404).end();}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await pw.chromium.launch({headless:true,args:['--enable-precise-memory-info']});const results=[];
 try{
 for(const count of [100,1000,10000]){
  const fixture=qualityLedger(count),totals=[];
  for(const variant of ['baseline','candidate']){
   const context=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block'}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(60000);
   const url=`http://127.0.0.1:${server.address().port}/${variant}/`;await page.goto(url+'rescue.html');
   await page.evaluate(async d=>{const db=await import('./db.js');await db.save(d,{expectedRevision:0});sessionStorage.setItem('umalog-title-seen','1');},fixture);
   let start=performance.now();await page.goto(url+'#home');await page.locator('#homeSummary').waitFor();const startupMs=performance.now()-start;
   async function route(hash,selector){const start=performance.now();await page.evaluate(h=>location.hash=h,hash);await page.locator(selector).waitFor();return performance.now()-start;}
   const historyMs=await route('#history','#historySearch'),historyNodes=await page.locator('#app *').count();
   const calendarMs=await route('#calendar','#ledgerCalendar');
   const metrics=await page.evaluate(async()=>{
    const db=await import('./db.js'),core=await import('./core.js'),simple=await import('./simple-ledger.js'),cal=await import('./ledger-calendar.js'),backup=await import('./backup-integrity.js');
    const d=await db.load(),json=JSON.stringify(d),before=json;
    function measure(fn){fn();const values=[];for(let i=0;i<3;i++){const start=performance.now();fn();values.push(performance.now()-start);}return values.sort((a,b)=>a-b)[1];}
    const dailyMs=measure(()=>simple.cashFinance(d,{prefix:'2026-10-01'})),monthlyMs=measure(()=>simple.cashFinance(d,{prefix:'2026-10'})),yearlyMs=measure(()=>simple.cashFinance(d,{prefix:'2026'}));
    const calendarModelMs=measure(()=>cal.ledgerMonth(d,[],'2026-10')),backupMs=measure(()=>backup.snapshotOf(d,1)),restorePreviewMs=measure(()=>simple.cashFinance(core.validateData(JSON.parse(json))));
    if(JSON.stringify(d)!==before)throw new Error('benchmark mutated source');
    return {dailyMs,monthlyMs,yearlyMs,calendarModelMs,backupMs,restorePreviewMs,totals:simple.cashFinance(d),jsonBytes:new TextEncoder().encode(json).length};
   });
   const client=await context.newCDPSession(page);await client.send('HeapProfiler.collectGarbage');const usage=await client.send('Runtime.getHeapUsage');
   assert.deepEqual(errors,[]);totals.push(metrics.totals);const {totals:omit,...times}=metrics;
   const row={variant,count,startupMs,historyMs,calendarMs,historyNodes,...times,heapUsedBytes:usage.usedSize};results.push(row);console.log('QUALITY_PERF '+JSON.stringify(row));await context.close();
  }
  assert.deepEqual(totals[0],totals[1],'financial results changed at '+count);
 }
 const out=process.env.OUTPUT_DIR||'/tmp/umalog-quality-performance';fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'performance.json'),JSON.stringify({browser:'Chromium',viewport:'390x844',calculation:'warm median of 3; startup/routes single measured run',memory:'Chromium JS heap after explicit GC; not OS/device RAM',baseline:'c24b1836c8fa1c0a4629c12c660fc33170b3d39b',results},null,2));
 console.log('PASS paired 100/1000/10000-record browser performance and accounting parity');
 }finally{await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});

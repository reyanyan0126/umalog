// Isolated local server: serves old git revision, then current files at the same origin.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http'),cp=require('node:child_process');
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
(async()=>{
 const root=path.resolve(__dirname,'..');let current=false;
 const server=http.createServer((req,res)=>{let p=decodeURIComponent(req.url.split('?')[0]).replace(/^\//,'')||'index.html';if(p.includes('..')){res.writeHead(403).end();return;}try{const content=current?fs.readFileSync(path.join(root,p)):cp.execFileSync('git',['show','37ce52c:'+p],{cwd:root,stdio:['ignore','pipe','ignore']});res.setHeader('Content-Type',({'.js':'text/javascript','.css':'text/css','.html':'text/html','.svg':'image/svg+xml','.webmanifest':'application/manifest+json'}[path.extname(p)]||'application/octet-stream'));res.setHeader('Cache-Control','no-store');res.end(content);}catch{res.writeHead(404).end();}}).listen(8001,'127.0.0.1');
 let browser;try{
 const portable=require(process.env.CHROMIUM_MODULE);browser=await chromium.launch({headless:true,executablePath:await portable.executablePath(),args:portable.args.filter(x=>x!=='--disable-web-security'&&x!=='--allow-running-insecure-content')});
 const context=await browser.newContext(),page=await context.newPage();page.setDefaultTimeout(15000);console.log('open old');await page.goto('http://127.0.0.1:8001');await page.waitForFunction(()=>navigator.serviceWorker.controller);
 await page.evaluate(async()=>{const {load,save}=await import('./db.js');const d=await load();d.settings.name='更新前の記録';await save(d);});
 await page.evaluate(()=>location.hash='entry');await page.locator('#type').selectOption('単勝');await page.locator('#numbers').fill('1');await page.locator('#stake').fill('500');await page.locator('#addLine').click();await page.locator('#entryForm button[type=submit]').click();await page.waitForSelector('[data-detail]');
 await page.evaluate(()=>location.hash='home');await page.reload();await page.waitForSelector('.hero');console.log('old record saved');
 const before=await page.evaluate(async()=>{const {load}=await import('./db.js');return load();});
 current=true;console.log('request update');await page.evaluate(async()=>{const reg=await navigator.serviceWorker.getRegistration();await reg.update();});await page.waitForSelector('#applyUpdate');await page.locator('#applyUpdate').click();await page.waitForSelector('#tipsOpen');console.log('new UI loaded');
 const after=await page.evaluate(async()=>{const {load}=await import('./db.js');return load();});assert.deepEqual(after,before);
 await context.setOffline(true);await page.reload();await page.locator('#tipsOpen').click();assert.ok(await page.locator('#tipBody').innerText());
 const keys=await page.evaluate(()=>caches.keys());assert.ok(keys.some(k=>k.endsWith('1.0.1-rc.1')));assert.ok(!keys.some(k=>k.endsWith('-1.0.0')));
 console.log('PASS old v1.0.0 → rc.1 notification, update, unchanged IndexedDB, offline tips, old cache removed');
 }finally{if(browser)await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exit(1);});

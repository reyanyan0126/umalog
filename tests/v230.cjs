const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
(async()=>{
 const root=path.resolve(__dirname,'..'),prefix=process.env.PUBLISH==='1'?'/publish/':'/';
 const server=http.createServer((req,res)=>{
  let p=decodeURIComponent(req.url.split('?')[0]);if(p.endsWith('/'))p+='index.html';
  try{res.setHeader('Content-Type',({'.js':'text/javascript','.html':'text/html','.css':'text/css','.svg':'image/svg+xml'}[path.extname(p)]||'application/octet-stream'));res.end(fs.readFileSync(path.join(root,p)));}
  catch{res.writeHead(404).end();}
 }).listen(8236,'127.0.0.1');
 let browser;
 try{
  const a=require(process.env.CHROMIUM_MODULE);
  browser=await chromium.launch({headless:true,executablePath:await a.executablePath(),args:a.args.filter(x=>x!=='--disable-web-security'&&x!=='--allow-running-insecure-content')});
  const context=await browser.newContext({viewport:{width:390,height:844}}),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());page.setDefaultTimeout(20000);
  await page.goto('http://127.0.0.1:8236'+prefix);await page.waitForSelector('#homeQuickEntry');
  const stored=await page.evaluate(async()=>{
   const {load,save}=await import('./db.js'),{makeSimpleEntry}=await import('./simple-ledger.js'),d=await load();
   const row=(id,date,stake,venue,type,status,payout=0)=>makeSimpleEntry({date,stake,venue,type,status,payout,refund:0,name:'',memo:'',number:''},id);
   d.races=[{id:'sep',date:'2026-09-22',venue:'東京',number:11,name:'九月'},{id:'oct',date:'2026-10-19',venue:'京都',number:11,name:'十月'}];
   d.tickets=[{id:'ts',raceId:'sep',type:'単勝',kind:'reported',memo:'',createdAt:'2026-09-22T00:00:00Z'},{id:'to',raceId:'oct',type:'ワイド',kind:'reported',memo:'',createdAt:'2026-10-19T00:00:00Z'}];
   d.lines=[{id:'ls',ticketId:'ts',numbers:[1],stake:1000,status:'settled',payout:1500,refund:0},{id:'lo',ticketId:'to',numbers:[1,2],stake:500,status:'pending',payout:0,refund:0}];
   d.simpleEntries=[row('s1','2026-10-19',2000,'京都','ワイド','settled'),row('s2','2026-10-20',1000,null,null,'pending'),row('s3','2026-09-22',1000,'東京','単勝','settled',2000)];
   await save(d);return JSON.stringify(await load());
  });
  await page.reload();await page.waitForSelector('#homeQuickEntry');
  await page.evaluate(()=>location.hash='analysis');await page.locator('#analysisAdvanced > summary').click();await page.waitForSelector('#analysisQuality');
  assert.match(await page.locator('#analysisQuality').innerText(),/確定済みの記録/);
  assert.match(await page.locator('#analysisQuality').innerText(),/3 \/ 5点・件/);
  assert.match(await page.locator('#analysisQuality').innerText(),/87\.5％/);
  assert.match(await page.locator('#analysisQuality').innerText(),/未確定の記録が残っています/);
  assert.match(await page.locator('#analysisQuality').innerText(),/詳細買い目 2点・かんたん支出 3件/);
  assert.equal(await page.locator('[data-inclusive-month]').count(),2);
  assert.match(await page.locator('[data-inclusive-month="2026-09"]').innerText(),/1,500円/);
  assert.match(await page.locator('[data-inclusive-month="2026-10"]').innerText(),/3,500円/);
  assert.match(await page.locator('[data-inclusive-month="2026-10"]').innerText(),/0\.0％/);
  assert.match(await page.locator('#analysisTrends h2').innerText(),/詳細馬券/);
  await page.locator('#analysisVenue').selectOption('京都');
  assert.equal(await page.locator('[data-inclusive-month]').count(),1);
  assert.match(await page.locator('#analysisBasics').innerText(),/2,500円/);
  assert.match(await page.locator('#analysisQuality').innerText(),/2 \/ 2点・件|1 \/ 2点・件/);
  await page.locator('#analysisVenue').selectOption('');
  await page.locator('#analysisRange').selectOption('month');
  await page.locator('#analysisMonth').fill('2026-09');
  await page.locator('#analysisMonth').dispatchEvent('change');
  assert.equal(await page.locator('[data-inclusive-month]').count(),1);
  assert.equal(await page.locator('[data-inclusive-month]').first().getAttribute('data-inclusive-month'),'2026-09');
  assert.match(await page.locator('#analysisQuality').innerText(),/175\.0％/);
  await page.locator('#analysisRange').selectOption('all');
  assert.equal(await page.locator('[data-inclusive-month]').count(),2);
  assert.equal(await page.evaluate(async()=>JSON.stringify(await(await import('./db.js')).load())),stored,'analysis is read-only');
  for(const width of [320,390,440]){
   await page.setViewportSize({width,height:844});
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'analysis layout overflow '+width);
  }
  assert.deepEqual(errors,[]);
  console.log('PASS v2.3.0-dev.1: all-entry monthly trend, settlement completeness, filters, read-only storage and responsive UI');
 }finally{if(browser)await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exit(1);});

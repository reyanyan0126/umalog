const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
(async()=>{
 const root=path.resolve(__dirname,'..'),prefix=process.env.PUBLISH==='1'?'/publish/':'/';
 const server=http.createServer((req,res)=>{
  let p=decodeURIComponent(req.url.split('?')[0]);if(p.endsWith('/'))p+='index.html';
  try{res.setHeader('Content-Type',({'.js':'text/javascript','.html':'text/html','.css':'text/css','.svg':'image/svg+xml'}[path.extname(p)]||'application/octet-stream'));res.end(fs.readFileSync(path.join(root,p)));}
  catch{res.writeHead(404).end();}
 }).listen(8220,'127.0.0.1');
 let browser;
 try{
  const a=require(process.env.CHROMIUM_MODULE);
  browser=await chromium.launch({headless:true,executablePath:await a.executablePath(),args:a.args.filter(x=>x!=='--disable-web-security'&&x!=='--allow-running-insecure-content')});
  const context=await browser.newContext({viewport:{width:390,height:844}});
  const page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());page.setDefaultTimeout(18000);
  const nav=async route=>{await page.evaluate(r=>location.hash=r,route);await page.waitForTimeout(120);};
  await page.goto('http://127.0.0.1:8220'+prefix);await page.waitForSelector('#homeQuickEntry');
  await page.locator('#homeQuickEntry').click();await page.waitForSelector('#simpleEntryForm');
  assert.equal(await page.locator('[data-simple-template]').count(),0);
  await page.locator('#simpleDate').fill('2026-10-18');
  await page.locator('#simpleStake').fill('2400');
  await page.locator('.simple-optional summary').click();
  await page.locator('#simpleVenue').selectOption('札幌');
  await page.locator('#simpleNumber').selectOption('11');
  await page.locator('#simpleType').selectOption('ワイド');
  await page.locator('#simpleName').fill('旧レース');
  await page.locator('#simpleMemo').fill('元のメモ');
  await page.locator('#simpleResultSection summary').click();
  await page.locator('#simpleStatus').selectOption('settled');
  await page.locator('#simplePayout').fill('3800');
  await page.locator('#simpleSave').click();await page.waitForFunction(()=>location.hash==='#history');
  let before=await page.evaluate(async()=>(await(await import('./db.js')).load()).simpleEntries);
  assert.equal(before.length,1);assert.equal(before[0].status,'settled');assert.equal(before[0].payout,3800);
  await nav('quick');await page.waitForSelector('[data-simple-template]',{state:'attached'});
  const dateBefore=await page.locator('#simpleDate').inputValue();
  await page.locator('#simpleAssists summary').click();
  await page.locator('[data-simple-template="0"]').click();
  assert.equal(await page.locator('#simpleDate').inputValue(),dateBefore,'copy does not overwrite purchase date');
  assert.equal(await page.locator('#simpleStake').inputValue(),'2400');
  assert.equal(await page.locator('#simpleVenue').inputValue(),'札幌');
  assert.equal(await page.locator('#simpleType').inputValue(),'ワイド');
  assert.equal(await page.locator('#simpleNumber').inputValue(),'');
  assert.equal(await page.locator('#simpleName').inputValue(),'');
  assert.equal(await page.locator('#simpleMemo').inputValue(),'');
  assert.equal(await page.locator('#simpleStatus').inputValue(),'pending');
  assert.equal(await page.locator('#simplePayout').inputValue(),'0');
  assert.equal(await page.locator('#simplePayoutFields').isVisible(),false);
  assert.match(await page.locator('#simpleReview').innerText(),/未入力/);
  assert.deepEqual(await page.evaluate(async()=>(await(await import('./db.js')).load()).simpleEntries),before,'reuse preview writes no data');
  await page.locator('#simpleDate').fill('2026-10-19');
  await page.locator('#simpleSave').click();await page.waitForFunction(()=>location.hash==='#history');
  const saved=await page.evaluate(async()=>(await(await import('./db.js')).load()));
  assert.equal(saved.simpleEntries.length,2);
  assert.deepEqual(saved.simpleEntries[0],before[0],'original row untouched');
  assert.notEqual(saved.simpleEntries[0].id,saved.simpleEntries[1].id);
  assert.equal(saved.simpleEntries[1].date,'2026-10-19');
  assert.equal(saved.simpleEntries[1].stake,2400);
  assert.equal(saved.simpleEntries[1].status,'pending');
  assert.equal(saved.simpleEntries[1].payout,0);
  assert.equal(saved.simpleEntries[1].number,null);
  assert.equal(saved.simpleEntries[1].memo,'');
  assert.equal(saved.lines.length,0,'no fake detail bets');
  await nav('quick');await page.waitForSelector('.simple-recent',{state:'attached'});
  for(const width of [320,390,440]){
   await page.setViewportSize({width,height:844});
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'repeat layout overflow '+width);
  }
  assert.deepEqual(errors,[]);
  console.log('PASS v2.2.0-dev.1: repeat amount/venue/type without copying previous settlement, preserve original and responsive layout');
 }finally{if(browser)await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exit(1);});

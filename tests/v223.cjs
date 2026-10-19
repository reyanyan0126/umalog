const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
(async()=>{
 const root=path.resolve(__dirname,'..'),prefix=process.env.PUBLISH==='1'?'/publish/':'/';
 const server=http.createServer((req,res)=>{
  let p=decodeURIComponent(req.url.split('?')[0]);if(p.endsWith('/'))p+='index.html';
  try{res.setHeader('Content-Type',({'.js':'text/javascript','.html':'text/html','.css':'text/css','.svg':'image/svg+xml'}[path.extname(p)]||'application/octet-stream'));res.end(fs.readFileSync(path.join(root,p)));}
  catch{res.writeHead(404).end();}
 }).listen(8230,'127.0.0.1');
 let browser;
 try{
  const a=require(process.env.CHROMIUM_MODULE);
  browser=await chromium.launch({headless:true,executablePath:await a.executablePath(),args:a.args.filter(x=>x!=='--disable-web-security'&&x!=='--allow-running-insecure-content')});
  const context=await browser.newContext({viewport:{width:390,height:844}}),page=await context.newPage(),errors=[],dialogs=[];
  let rejectNavigation=true;
  page.on('pageerror',e=>errors.push(e.message));
  page.on('dialog',async d=>{dialogs.push(d.message());if(rejectNavigation&&d.message().includes('未保存')){rejectNavigation=false;await d.dismiss();}else await d.accept();});
  page.setDefaultTimeout(18000);
  await page.goto('http://127.0.0.1:8230'+prefix);await page.waitForSelector('#homeQuickEntry');
  await page.evaluate(()=>location.hash='day/2026-10-12');await page.waitForSelector('a[href="#quick-date/2026-10-12"]');
  await page.locator('a[href="#quick-date/2026-10-12"]').click();await page.waitForSelector('#simpleEntryForm');
  assert.equal(await page.locator('#simpleDate').inputValue(),'2026-10-12');
  assert.equal(await page.locator('.simple-entry-head a').first().getAttribute('href'),'#day/2026-10-12');
  await page.locator('#simpleStake').fill('900');
  await page.locator('#simpleResultSection summary').click();
  await page.locator('#simpleMarkMiss').click();
  assert.equal(await page.locator('#simpleStatus').inputValue(),'settled');
  assert.equal(await page.locator('#simplePayout').inputValue(),'0');
  assert.equal(await page.locator('#simplePayoutFields').isVisible(),true);
  assert.match(await page.locator('#simpleUnsaved').innerText(),/未保存/);
  await page.locator('.simple-entry-head a').first().click();
  await page.waitForFunction(()=>location.hash==='#quick-date/2026-10-12');
  assert.equal(new URL(page.url()).hash,'#quick-date/2026-10-12','discard refusal keeps edited form');
  assert.equal(await page.locator('#simpleStake').inputValue(),'900');
  await page.locator('#simpleSave').click();
  await page.waitForFunction(()=>location.hash==='#day/2026-10-12');
  let saved=await page.evaluate(async()=>(await(await import('./db.js')).load()).simpleEntries);
  assert.equal(saved.length,1);assert.equal(saved[0].stake,900);assert.equal(saved[0].status,'settled');
  const firstId=saved[0].id;
  await page.locator('a[href^="#quick-edit/"]').click();await page.waitForSelector('#simpleEntryForm');
  assert.equal(new URL(page.url()).hash,'#quick-edit/'+firstId+'/day');
  assert.equal(await page.locator('.simple-entry-head a').first().getAttribute('href'),'#day/2026-10-12');
  await page.locator('#simpleMarkPending').click();
  assert.equal(await page.locator('#simplePayoutFields').isVisible(),false);
  assert.equal(await page.locator('#simpleStatus').inputValue(),'pending');
  await page.locator('#simpleSave').click();await page.waitForFunction(()=>location.hash==='#day/2026-10-12');
  saved=await page.evaluate(async()=>(await(await import('./db.js')).load()).simpleEntries);
  assert.equal(saved.length,1);assert.equal(saved[0].id,firstId);assert.equal(saved[0].status,'pending');
  await page.locator('a[href^="#quick-edit/"]').click();await page.waitForSelector('#simpleEntryForm');
  await page.locator('#simpleResultSection summary').click();
  await page.locator('#simpleStatus').selectOption('settled');
  await page.locator('#simplePayout').fill('2500');
  await page.locator('#simpleMarkMiss').click();
  assert.equal(await page.locator('#simplePayout').inputValue(),'0','explicit zero shortcut resets receipt');
  await page.locator('#simpleSave').click();await page.waitForFunction(()=>location.hash==='#day/2026-10-12');
  saved=await page.evaluate(async()=>(await(await import('./db.js')).load()).simpleEntries);
  assert.equal(saved.length,1);assert.equal(saved[0].payout,0);assert.equal(saved[0].status,'settled');
  assert.ok(dialogs.some(s=>s.includes('入力済みの払戻')));
  assert.ok(dialogs.some(s=>s.includes('未保存')));
  await page.locator('a[href^="#quick-edit/"]').click();
  await page.waitForSelector('#simpleEntryForm');
  for(const width of [320,390,440]){await page.setViewportSize({width,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'quick overflow '+width);}
  assert.deepEqual(errors,[]);
  console.log('PASS v2.2.0-dev.3: day-context entry/edit, safe status shortcuts, dirty navigation and iPhone widths');
 }finally{if(browser)await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exit(1);});

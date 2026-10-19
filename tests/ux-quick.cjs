const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
(async()=>{
 const root=path.resolve(__dirname,'..'),prefix=process.env.PUBLISH==='1'?'/publish/':'/';
 const server=http.createServer((req,res)=>{
  let p=decodeURIComponent(req.url.split('?')[0]);if(p.endsWith('/'))p+='index.html';
  try{res.setHeader('Content-Type',({'.js':'text/javascript','.html':'text/html','.css':'text/css','.svg':'image/svg+xml'}[path.extname(p)]||'application/octet-stream'));res.end(fs.readFileSync(path.join(root,p)));}
  catch{res.writeHead(404).end();}
 }).listen(8238,'127.0.0.1');
 let browser;
 try{
  const a=require(process.env.CHROMIUM_MODULE);
  browser=await chromium.launch({headless:true,executablePath:await a.executablePath(),args:a.args.filter(x=>x!=='--disable-web-security'&&x!=='--allow-running-insecure-content')});
  const context=await browser.newContext({viewport:{width:390,height:844}}),page=await context.newPage(),errors=[],dialogs=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('dialog',async d=>{dialogs.push(d.message());await d.accept();});page.setDefaultTimeout(18000);
  await page.goto('http://127.0.0.1:8238'+prefix);await page.waitForSelector('#homeQuickEntry');
  const before=await page.evaluate(async()=>JSON.stringify(await(await import('./db.js')).load()));
  await page.locator('#homeQuickEntry').click();await page.waitForSelector('#simpleEntryForm');
  assert.equal(await page.locator('#simpleStake').inputValue(),'','new stake must be intentionally entered');
  assert.equal(await page.locator('#simpleAssists').getAttribute('open'),null);
  assert.equal(await page.locator('.simple-optional').getAttribute('open'),null);
  assert.equal(await page.locator('#simpleResultSection').getAttribute('open'),null);
  assert.equal(await page.locator('[data-simple-amount="1000"]').isVisible(),false);
  assert.equal(await page.locator('#simpleStatus').isVisible(),false);
  assert.equal(await page.locator('#simpleSave').isVisible(),true);
  assert.match(await page.locator('#simpleReview').innerText(),/金額を入力/);
  assert.equal(await page.locator('#simpleUnsaved').isVisible(),false,'no duplicate unsaved note before editing');
  // An empty amount cannot be submitted, even though date is filled.
  await page.locator('#simpleSave').click();
  assert.equal(new URL(page.url()).hash,'#quick');
  assert.equal(await page.evaluate(async()=>JSON.stringify(await(await import('./db.js')).load())),before);
  await page.locator('#simpleStake').fill('1200');
  assert.equal(await page.locator('#simpleUnsaved').isVisible(),true,'unsaved state appears after input');
  assert.match(await page.locator('#simpleReview').innerText(),/1,200円/);
  await page.locator('#simpleSave').click();await page.waitForFunction(()=>location.hash==='#history');
  let saved=await page.evaluate(async()=>(await(await import('./db.js')).load()).simpleEntries);
  assert.equal(saved.length,1);assert.equal(saved[0].stake,1200);
  assert.equal(saved[0].status,'pending');assert.equal(saved[0].payout,0);
  assert.equal(dialogs.filter(x=>x.includes('支出として記録')).length,0,'Save is a one-step action');
  await page.locator('#historyList a[href^="#quick-edit"]').click();await page.waitForSelector('#simpleEntryForm');
  assert.equal(await page.locator('#simpleStake').inputValue(),'1200');
  assert.equal(await page.locator('#simpleResultSection').getAttribute('open'),null);
  await page.locator('#simpleResultSection summary').click();
  await page.locator('#simpleMarkMiss').click();
  assert.equal(await page.locator('#simpleStatus').inputValue(),'settled');
  assert.equal(await page.locator('#simpleResultSection').getAttribute('open'),'');
  await page.locator('#simplePayout').fill('2500');
  await page.locator('#simpleSave').click();await page.waitForFunction(()=>location.hash==='#history');
  saved=await page.evaluate(async()=>(await(await import('./db.js')).load()).simpleEntries);
  assert.equal(saved.length,1);assert.equal(saved[0].payout,2500);assert.equal(saved[0].status,'settled');
  await page.locator('#historyList a[href^="#quick-edit"]').click();await page.waitForSelector('#simpleEntryForm');
  assert.equal(await page.locator('#simpleResultSection').getAttribute('open'),'','settled edits reveal the result');
  await page.evaluate(()=>location.hash='history');await page.waitForSelector('#historyCount');
  await page.evaluate(()=>location.hash='quick');await page.waitForSelector('#simpleEntryForm');
  assert.equal(await page.locator('#simpleAssists').getAttribute('open'),null);
  assert.equal(await page.locator('[data-simple-template]').count(),1,'templates are preserved');
  await page.locator('#simpleAssists summary').click();
  await page.locator('[data-simple-template="0"]').click();
  assert.equal(await page.locator('#simpleStake').inputValue(),'1200');
  assert.equal(await page.locator('#simpleStatus').inputValue(),'pending');
  assert.equal(await page.locator('#simplePayout').inputValue(),'0');
  assert.equal(await page.evaluate(async()=>JSON.stringify((await(await import('./db.js')).load()).simpleEntries)),JSON.stringify(saved),'using a template is read-only until Save');
  for(const width of [320,390,440]){
   await page.setViewportSize({width,height:844});
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'horizontal overflow '+width);
  }
  assert.deepEqual(errors,[]);
  console.log('PASS ux2: minimal two-field entry, empty amount protection, one-step save, optional details, edit, template and iPhone widths');
 }finally{if(browser)await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exit(1);});

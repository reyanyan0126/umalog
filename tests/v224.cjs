const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
(async()=>{
 const root=path.resolve(__dirname,'..'),prefix=process.env.PUBLISH==='1'?'/publish/':'/';
 const server=http.createServer((req,res)=>{
  let p=decodeURIComponent(req.url.split('?')[0]);if(p.endsWith('/'))p+='index.html';
  try{res.setHeader('Content-Type',({'.js':'text/javascript','.html':'text/html','.css':'text/css','.svg':'image/svg+xml'}[path.extname(p)]||'application/octet-stream'));res.end(fs.readFileSync(path.join(root,p)));}
  catch{res.writeHead(404).end();}
 }).listen(8234,'127.0.0.1');
 let browser;
 try{
  const a=require(process.env.CHROMIUM_MODULE);
  browser=await chromium.launch({headless:true,executablePath:await a.executablePath(),args:a.args.filter(x=>x!=='--disable-web-security'&&x!=='--allow-running-insecure-content')});
  const context=await browser.newContext({viewport:{width:390,height:844}}),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());page.setDefaultTimeout(18000);
  await page.goto('http://127.0.0.1:8234'+prefix);await page.waitForSelector('#homeQuickEntry');
  const original=await page.evaluate(async()=>JSON.stringify(await(await import('./db.js')).load()));
  await page.evaluate(()=>{
   const vv=window.visualViewport;
   const natural=vv.height;
   window.__simulatedMobileKeyboard=null;
   Object.defineProperty(vv,'height',{configurable:true,get:()=>window.__simulatedMobileKeyboard===null?natural:window.__simulatedMobileKeyboard});
  });
  const emulate=async height=>page.evaluate(next=>{
   window.__simulatedMobileKeyboard=next;
   window.visualViewport.dispatchEvent(new Event('resize'));
  },height);
  await page.locator('#homeQuickEntry').click();await page.waitForSelector('#simpleEntryForm');
  assert.equal(await page.locator('.simple-entry-head>a:first-child').evaluate(e=>parseFloat(getComputedStyle(e).minHeight)>=44),true);
  await page.locator('#simpleStake').focus();
  await emulate(500);
  await page.waitForFunction(()=>document.body.classList.contains('mobile-keyboard-open'));
  assert.equal(await page.locator('nav').evaluate(e=>getComputedStyle(e).visibility),'hidden','dock stays out of keyboard');
  await page.locator('#simpleStake').fill('1100');
  assert.equal(await page.evaluate(async()=>JSON.stringify(await(await import('./db.js')).load())),original,'keyboard interaction is read-only until save');
  await page.locator('#simpleStake').blur();
  await page.waitForFunction(()=>!document.body.classList.contains('mobile-keyboard-open'));
  assert.equal(await page.locator('nav').evaluate(e=>getComputedStyle(e).visibility),'visible','dock returns when keyboard closes');
  await page.locator('#simpleDate').focus();await emulate(430);
  assert.equal(await page.evaluate(()=>document.body.classList.contains('mobile-keyboard-open')),false,'native date picker is not a text keyboard');
  await page.locator('#simpleStake').focus();
  await emulate(await page.evaluate(()=>window.innerHeight-90));
  assert.equal(await page.evaluate(()=>document.body.classList.contains('mobile-keyboard-open')),false,'small viewport changes do not hide dock');
  await emulate(null);
  await page.locator('#simpleStake').blur();
  await page.evaluate(()=>location.hash='history');await page.waitForSelector('#historySearch');
  assert.equal(await page.locator('#historySearch').getAttribute('enterkeyhint'),'search');
  assert.equal(await page.locator('#historySearch').evaluate(e=>parseFloat(getComputedStyle(e).fontSize)>=16),true,'iPhone search font avoids automatic zoom');
  for(const width of [320,390,440]){
   await page.setViewportSize({width,height:844});
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'horizontal overflow '+width);
   await page.locator('#historySearch').focus();await emulate(500);
   await page.waitForFunction(()=>document.body.classList.contains('mobile-keyboard-open'));
   assert.equal(await page.locator('nav').evaluate(e=>getComputedStyle(e).visibility),'hidden');
   await page.locator('#historySearch').blur();
   await page.waitForFunction(()=>!document.body.classList.contains('mobile-keyboard-open'));
  }
  await page.setViewportSize({width:900,height:844});
  await page.locator('#historySearch').focus();await emulate(450);
  assert.equal(await page.evaluate(()=>document.body.classList.contains('mobile-keyboard-open')),false,'desktop menu must remain visible');
  await page.locator('#historySearch').blur();
  assert.equal(await page.evaluate(async()=>JSON.stringify(await(await import('./db.js')).load())),original,'no ledger mutation');
  assert.deepEqual(errors,[]);
  console.log('PASS v2.2.0-dev.4: keyboard-only dock visibility, safe focus handling, input sizes, narrow viewports and untouched ledger');
 }finally{if(browser)await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exit(1);});

const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
(async()=>{
 const root=path.resolve(__dirname,'..'),prefix=process.env.PUBLISH==='1'?'/publish/':'/',results=[];
 const server=http.createServer((q,r)=>{let p=q.url.split('?')[0];if(p.endsWith('/'))p+='index.html';try{r.setHeader('Content-Type',({'.js':'text/javascript','.html':'text/html','.css':'text/css','.svg':'image/svg+xml'}[path.extname(p)]||'application/octet-stream'));r.end(fs.readFileSync(path.join(root,p)));}catch{r.writeHead(404).end();}}).listen(8010,'127.0.0.1');
 let browser;
 try{
  const c=require(process.env.CHROMIUM_MODULE);
  browser=await chromium.launch({headless:true,executablePath:await c.executablePath(),args:c.args.filter(x=>x!=='--disable-web-security'&&x!=='--allow-running-insecure-content')});
  const ctx=await browser.newContext({viewport:{width:390,height:844}}),page=await ctx.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(15000);
  const pass=async(name,fn)=>{await fn();results.push(name);console.log('PASS '+name);};
  await page.goto('http://127.0.0.1:8010'+prefix);await page.waitForSelector('.hero');
  await page.evaluate(()=>location.hash='entry');await page.waitForSelector('#entryForm');
  await pass('BOX stake preview and no persistence',async()=>{
   assert.match(await page.locator('#additionEstimate').innerText(),/番号と金額/);
   await page.locator('#type').selectOption('三連複');await page.locator('#mode').selectOption('box');
   for(const n of [1,2,3,4,5])await page.locator('.number-pad-choice').nth(n-1).click();
   assert.match(await page.locator('#additionEstimate').innerText(),/追加予定 10点 \/ 1,000円/);
   await page.locator('#stake').fill('300');assert.match(await page.locator('#additionEstimate').innerText(),/追加予定 10点 \/ 3,000円/);
   const original=await page.evaluate(async()=>JSON.stringify(await (await import('./db.js')).load()));
   await page.locator('#stake').fill('150');assert.match(await page.locator('#additionEstimate').innerText(),/番号と金額/);
   await page.locator('#stake').fill('300');assert.equal(await page.evaluate(async()=>JSON.stringify(await (await import('./db.js')).load())),original);
  });
  await pass('one-tap axis replacement and two-axis estimate',async()=>{
   await page.locator('#type').selectOption('三連単');await page.locator('#mode').selectOption('flow');
   for(const n of [1,2,3])await page.locator('[data-pattern-number="'+n+'"]').click();
   await page.locator('[data-pattern-tab="0"]').click();await page.locator('[data-pattern-number="5"]').click();
   assert.match(await page.locator('[data-pattern-tab="0"]').innerText(),/軸 5/);
   await page.locator('#flowPosition').selectOption('multi');assert.match(await page.locator('#additionEstimate').innerText(),/追加予定 6点 \/ 1,800円/);
   await page.locator('#flowAxisCount').selectOption('2');assert.match(await page.locator('#additionEstimate').innerText(),/番号と金額/);
   for(const n of [1,2,3])await page.locator('[data-pattern-number="'+n+'"]').click();
   assert.match(await page.locator('#additionEstimate').innerText(),/追加予定 6点 \/ 1,800円/);
  });
  await pass('formation next button, four-line estimate, mobile widths',async()=>{
   await page.locator('#mode').selectOption('formation');
   for(const n of [1,2])await page.locator('[data-pattern-number="'+n+'"]').click();
   await page.locator('[data-pattern-next]').click();assert.equal(await page.locator('[data-pattern-tab="1"]').getAttribute('aria-pressed'),'true');
   for(const n of [2,3])await page.locator('[data-pattern-number="'+n+'"]').click();
   await page.locator('[data-pattern-next]').click();assert.equal(await page.locator('[data-pattern-tab="2"]').getAttribute('aria-pressed'),'true');
   for(const n of [3,4])await page.locator('[data-pattern-number="'+n+'"]').click();
   assert.match(await page.locator('#additionEstimate').innerText(),/追加予定 4点 \/ 1,200円/);
   const before=await page.evaluate(async()=>JSON.stringify(await (await import('./db.js')).load()));
   await page.locator('#addLine').click();assert.equal(await page.locator('[data-amount]').count(),4);
   assert.match(await page.locator('.entry-total').innerText(),/1,200円/);
   assert.equal(await page.evaluate(async()=>JSON.stringify(await (await import('./db.js')).load())),before);
   for(const width of [320,390,440]){await page.setViewportSize({width,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),String(width));}
  });
  assert.deepEqual(errors,[]);console.log('ALL '+results.length+' DEV10 CHECKS PASSED');
 }finally{if(browser)await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exit(1);});

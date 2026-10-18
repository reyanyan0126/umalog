const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
(async()=>{
 const root=path.resolve(__dirname,'..'),prefix=process.env.PUBLISH==='1'?'/publish/':'/';
 const server=http.createServer((req,res)=>{
  let p=decodeURIComponent(req.url.split('?')[0]);if(p.endsWith('/'))p+='index.html';
  try{res.setHeader('Content-Type',({'.js':'text/javascript','.html':'text/html','.css':'text/css','.svg':'image/svg+xml'}[path.extname(p)]||'application/octet-stream'));res.end(fs.readFileSync(path.join(root,p)));}
  catch{res.writeHead(404).end();}
 }).listen(8061,'127.0.0.1');
 let browser;
 try{
  const c=require(process.env.CHROMIUM_MODULE);
  browser=await chromium.launch({headless:true,executablePath:await c.executablePath(),args:c.args.filter(x=>x!=='--disable-web-security'&&x!=='--allow-running-insecure-content')});
  const context=await browser.newContext({viewport:{width:390,height:844}}),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(16000);
  await page.goto('http://127.0.0.1:8061'+prefix);
  await page.waitForSelector('#homeEntry');await page.evaluate(()=>location.hash='growth');await page.waitForSelector('#companionOutfit');
  const before=await page.evaluate(async()=>(await (await import('./db.js')).load()));
  assert.equal(await page.locator('#companionOutfit').inputValue(),'none');
  assert.equal(await page.locator('.companion-outfit').count(),0);
  await page.locator('#companionOutfit').selectOption('ribbon');
  await page.waitForSelector('.companion-outfit[data-outfit="ribbon"]');
  assert.equal(await page.locator('.companion-outfit[data-outfit="ribbon"]').count(),1);
  assert.match(await page.locator('#companionActionStatus').innerText(),/リボン/);
  assert.equal(await page.locator('#petCare').getAttribute('data-reaction'),'outfit');
  assert.equal(await page.locator('.pet').evaluate(el=>getComputedStyle(el).animationName),'companion-pose');
  await page.locator('#companionPlay').click();
  await page.waitForFunction(()=>document.querySelector('#petCare')?.dataset.reaction==='play');
  assert.equal(await page.locator('#petCare').getAttribute('data-reaction'),'play');
  assert.equal(await page.locator('.pet').evaluate(el=>getComputedStyle(el).animationName),'companion-hop');
  await page.locator('#companionRest').click();
  await page.waitForFunction(()=>document.querySelector('#petCare')?.dataset.reaction==='rest');
  assert.equal(await page.locator('#petCare').getAttribute('data-reaction'),'rest');
  assert.equal(await page.locator('.pet').evaluate(el=>getComputedStyle(el).animationName),'companion-rest');
  await page.locator('#companionOutfit').selectOption('scarf');
  await page.waitForSelector('.companion-outfit[data-outfit="scarf"]');
  assert.equal(await page.locator('.companion-outfit[data-outfit="scarf"]').count(),1);
  await page.reload();await page.waitForSelector('#companionOutfit');
  assert.equal(await page.locator('#companionOutfit').inputValue(),'scarf');
  assert.equal(await page.locator('.companion-outfit').count(),1);
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.locator('#companionPlay').click();
  assert.equal(await page.locator('.pet').evaluate(el=>getComputedStyle(el).animationName),'none');
  await page.emulateMedia({reducedMotion:'no-preference'});
  // A settings-controlled "off" should suppress all motion without affecting behavior.
  await page.evaluate(async()=>{
   const db=await import('./db.js'),stored=await db.loadWithRevision(),next=structuredClone(stored.data);
   next.settings.motion=false;await db.save(next,{expectedRevision:stored.revision});
  });
  await page.reload();await page.waitForSelector('#companionOutfit');
  assert.equal(await page.locator('.nursery').getAttribute('data-motion'),'off');
  await page.locator('#companionRest').click();
  await page.waitForFunction(()=>document.querySelector('#companionActionStatus')?.textContent.includes('休憩'));
  assert.equal(await page.locator('.pet').evaluate(el=>getComputedStyle(el).animationName),'none');
  for(const width of [320,390,440]){
   await page.setViewportSize({width,height:844});
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'mobile overflow '+width);
  }
  const after=await page.evaluate(async()=>(await (await import('./db.js')).load()));
  for(const key of ['races','tickets','lines','reviews'])assert.deepEqual(after[key],before[key]);
  assert.equal(after.growthV2.companion.outfit,'scarf');
  assert.equal(after.growthV2.careExp,before.growthV2.careExp);
  assert.deepEqual(errors,[]);
  console.log('PASS v1.6.1 costumes persistence, action animations, OS and app reduced-motion, 320/390/440, no ledger mutations');
 }finally{if(browser)await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exit(1);});

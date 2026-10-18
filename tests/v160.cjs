const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
(async()=>{
 const root=path.resolve(__dirname,'..'),prefix=process.env.PUBLISH==='1'?'/publish/':'/';
 const server=http.createServer((req,res)=>{
  let p=decodeURIComponent(req.url.split('?')[0]);if(p.endsWith('/'))p+='index.html';
  try{res.setHeader('Content-Type',({'.js':'text/javascript','.html':'text/html','.css':'text/css','.svg':'image/svg+xml'}[path.extname(p)]||'application/octet-stream'));res.end(fs.readFileSync(path.join(root,p)));}
  catch{res.writeHead(404).end();}
 }).listen(8060,'127.0.0.1');
 let browser;
 try{
  const c=require(process.env.CHROMIUM_MODULE);
  browser=await chromium.launch({headless:true,executablePath:await c.executablePath(),args:c.args.filter(x=>x!=='--disable-web-security'&&x!=='--allow-running-insecure-content')});
  const context=await browser.newContext({viewport:{width:390,height:844}}),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(18000);
  await page.goto('http://127.0.0.1:8060'+prefix);await page.waitForSelector('#homeEntry');
  await page.evaluate(()=>location.hash='growth');await page.waitForSelector('#companionPlay');
  const before=await page.evaluate(async()=>(await (await import('./db.js')).load()));
  assert.equal(await page.locator('#companionRoom').inputValue(),'meadow');
  assert.equal(await page.locator('#companionAlbum .companion-stage').count(),5);
  assert.equal(await page.locator('#companionPlay').count(),1);
  for(let i=0;i<3;i++)await page.locator('#companionPlay').click();
  const played=await page.evaluate(async()=>(await (await import('./db.js')).load()));
  assert.equal(played.growthV2.bond,before.growthV2.bond+2);
  assert.equal(played.growthV2.careExp,before.growthV2.careExp);
  assert.equal(played.character.exp,before.character.exp);
  assert.equal(played.growthV2.companion.memories.length,1);
  assert.equal(await page.locator('#companionActionStatus').innerText().then(s=>s.includes('2 / 2')),true);
  await page.locator('#companionRest').click();
  await page.locator('#companionRest').click();
  const rested=await page.evaluate(async()=>(await (await import('./db.js')).load()));
  assert.equal(rested.growthV2.companion.memories.length,2);
  assert.equal(rested.growthV2.bond,played.growthV2.bond);
  await page.locator('#companionRoom').selectOption('stars');
  assert.equal(await page.locator('.nursery').getAttribute('data-room'),'stars');
  await page.locator('#companionAlbum summary').click();
  assert.equal(await page.locator('#companionMemories li').count(),2);
  assert.equal(await page.locator('#companionAlbum .companion-stage.unlocked').count(),1);
  await page.reload();await page.waitForSelector('#companionPlay');
  assert.equal(await page.locator('#companionRoom').inputValue(),'stars');
  assert.match(await page.locator('#companionActionStatus').innerText(),/2 \/ 2/);
  await page.locator('#companionAlbum summary').click();
  assert.equal(await page.locator('#companionMemories li').count(),2);
  for(const width of [320,390,440]){await page.setViewportSize({width,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'growth overflow '+width);}
  const after=await page.evaluate(async()=>(await (await import('./db.js')).load()));
  assert.deepEqual(after.races,before.races);
  assert.deepEqual(after.tickets,before.tickets);
  assert.deepEqual(after.lines,before.lines);
  assert.deepEqual(after.reviews,before.reviews);
  assert.deepEqual(errors,[]);
  console.log('PASS v1.6.0 companion actions, theme persistence, album, capped rewards and 320/390/440 layouts');
 }finally{if(browser)await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exit(1);});

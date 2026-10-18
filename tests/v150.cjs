const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
(async()=>{
 const root=path.resolve(__dirname,'..'),prefix=process.env.PUBLISH==='1'?'/publish/':'/';
 const server=http.createServer((req,res)=>{let p=decodeURIComponent(req.url.split('?')[0]);if(p.endsWith('/'))p+='index.html';try{res.setHeader('Content-Type',({'.js':'text/javascript','.html':'text/html','.css':'text/css','.svg':'image/svg+xml'}[path.extname(p)]||'application/octet-stream'));res.end(fs.readFileSync(path.join(root,p)));}catch{res.writeHead(404).end();}}).listen(8045,'127.0.0.1');
 let browser;
 try{
  const c=require(process.env.CHROMIUM_MODULE);
  browser=await chromium.launch({headless:true,executablePath:await c.executablePath(),args:c.args.filter(x=>x!=='--disable-web-security'&&x!=='--allow-running-insecure-content')});
  const context=await browser.newContext({viewport:{width:390,height:844}}),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(18000);
  const go=async hash=>{await page.evaluate(h=>location.hash=h,hash);await page.waitForTimeout(180);};
  await page.goto('http://127.0.0.1:8045'+prefix);await page.waitForSelector('#homeEntry');
  await page.evaluate(async()=>{
   const db=await import('./db.js'),old=await db.loadWithRevision(),d=structuredClone(old.data);
   const now=new Date(),today=new Date(now.getTime()+9*3600000).toISOString().slice(0,10);
   const past=n=>{const x=new Date(today+'T00:00:00Z');x.setUTCDate(x.getUTCDate()-n);return x.toISOString().slice(0,10);};
   for(const [idx,date,venue,type,stake,status,payout,refund] of [
    [1,past(12),'東京','ワイド',500,'settled',1250,0],
    [2,past(10),'東京','ワイド',100,'pending',0,0],
    [3,past(40),'札幌','単勝',200,'settled',0,0],
    [4,past(50),'札幌','単勝',100,'void',0,100]
   ]){
    const rid='compare-r'+idx,tid='compare-t'+idx;
    d.races.push({id:rid,date,venue,number:idx,name:'比較用'});
    d.tickets.push({id:tid,raceId:rid,type,kind:'reported',memo:'',createdAt:date+'T01:00:00Z'});
    d.lines.push({id:'compare-l'+idx,ticketId:tid,numbers:type==='単勝'?[1]:[1,2],stake,status,payout,refund,purchaseMode:'normal'});
   }
   await db.save(d,{expectedRevision:old.revision});
  });
  await page.reload();await page.waitForSelector('#homeEntry');
  const before=await page.evaluate(async()=>(await (await import('./db.js')).load()));
  await go('analysis');await page.waitForSelector('#analysisCompare');
  const panel=page.locator('#analysisCompare');
  assert.match(await panel.innerText(),/直近30日とその前の30日/);
  assert.match(await panel.innerText(),/1,250円/);
  assert.match(await panel.innerText(),/結果未入力|未入力/);
  assert.match(await panel.innerText(),/少数|30点未満/);
  await page.locator('#analysisCompare .compare-breakdown').first().locator('summary').click();
  assert.equal(await panel.locator('table:visible').count(),1);
  assert.match(await panel.locator('table').first().innerText(),/ワイド/);
  await page.locator('[data-analysis-jump="analysisCompare"]').click();
  assert.ok(await panel.isVisible());
  await page.locator('#analysisType').selectOption('単勝');
  assert.match(await page.locator('#analysisCompare').innerText(),/その前の30日/);
  assert.ok(!((await page.locator('#analysisCompare').innerText()).includes('1,250円')));
  await page.locator('#analysisRange').selectOption('month');
  assert.equal(await page.locator('#analysisCompare').count(),0);
  await page.locator('#analysisRange').selectOption('all');
  assert.equal(await page.locator('#analysisCompare').count(),1);
  for(const width of [320,390,440]){
    await page.setViewportSize({width,height:844});await go('analysis');
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'horizontal overflow '+width);
  }
  const after=await page.evaluate(async()=>(await (await import('./db.js')).load()));
  assert.deepEqual(after,before);assert.deepEqual(errors,[]);
  console.log('PASS v1.5.0 30-day comparison, filter isolation, read-only data, 320/390/440 layouts');
 }finally{if(browser)await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exit(1);});

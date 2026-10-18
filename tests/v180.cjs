const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
(async()=>{
 const root=path.resolve(__dirname,'..'),prefix=process.env.PUBLISH==='1'?'/publish/':'/';
 const server=http.createServer((req,res)=>{
  let p=decodeURIComponent(req.url.split('?')[0]);if(p.endsWith('/'))p+='index.html';
  try{res.setHeader('Content-Type',({'.js':'text/javascript','.html':'text/html','.css':'text/css','.svg':'image/svg+xml'}[path.extname(p)]||'application/octet-stream'));res.end(fs.readFileSync(path.join(root,p)));}
  catch{res.writeHead(404).end();}
 }).listen(8080,'127.0.0.1');
 let browser;
 try{
  const c=require(process.env.CHROMIUM_MODULE);
  browser=await chromium.launch({headless:true,executablePath:await c.executablePath(),args:c.args.filter(x=>x!=='--disable-web-security'&&x!=='--allow-running-insecure-content')});
  const context=await browser.newContext({viewport:{width:390,height:844}}),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(20000);
  const nav=async h=>{await page.evaluate(s=>location.hash=s,h);await page.waitForTimeout(120);};
  await page.goto('http://127.0.0.1:8080'+prefix);await page.waitForSelector('#homeEntry');
  const before=await page.evaluate(async()=>(await (await import('./db.js')).load()));
  await page.evaluate(async()=>{
   const db=await import('./db.js'),manual=await import('./manual-race.js');
   const state=await db.loadCalendar();let calendar=state.calendar;
   calendar=manual.planManualRace(calendar,{date:'2028-01-08',venue:'札幌',number:6,name:'古いレース・要再確認',surface:'芝',distance:1200,sourceURL:'https://example.org/old'}).calendar;
   for(let i=0;i<44;i++){
    const venue=['東京','中山','阪神','京都'][Math.floor(i/12)],number=i%12+1;
    calendar=manual.planManualRace(calendar,{date:'2028-04-09',venue,number,name:'検証候補 '+i,surface:'芝',distance:1600,sourceURL:'https://example.org/new/'+i}).calendar;
   }
   await db.saveCalendar(calendar,state.revision);
  });
  await page.reload();await nav('settings');await page.waitForSelector('#raceAudit');
  const panel=page.locator('#raceAudit');
  assert.match(await panel.locator('summary').innerText(),/要確認 45 \/ 全 45 件/);
  await panel.locator('summary').click();
  assert.equal(await panel.locator('.race-audit-row').count(),40);
  assert.match(await panel.locator('#raceAuditCount').innerText(),/該当 45 件／表示 40 件/);
  assert.equal(await panel.locator('#raceAuditMore').isVisible(),true);
  await panel.locator('#raceAuditMore').click();
  assert.equal(await panel.locator('.race-audit-row').count(),45);
  await panel.locator('#raceAuditVenue').selectOption('札幌');
  assert.equal(await panel.locator('.race-audit-row').count(),1);
  assert.match(await panel.locator('.race-audit-info').innerText(),/古いレース・要再確認/);
  await panel.locator('#raceAuditVenue').selectOption('all');
  await panel.locator('#raceAuditQuery').fill('古いレース');
  assert.equal(await panel.locator('.race-audit-row').count(),1);
  assert.equal(await panel.locator('#raceAuditMore').isVisible(),false);
  assert.equal(await panel.locator('.race-audit-row [data-audit-correct]').count(),1);
  assert.equal(await panel.locator('.race-audit-row a[target=_blank]').getAttribute('rel'),'noopener noreferrer');
  const saved=await page.evaluate(async()=>(await (await import('./db.js')).loadCalendar()).calendar);
  assert.equal(saved.races.length,45);
  // Older than the original correction editor's top 40 must still be reachable.
  await panel.locator('[data-audit-correct]').click();
  assert.equal(await page.locator('#manualCorrections').getAttribute('open'),'');
  assert.equal(await page.locator('#manualCorrectionForm [name=name]').inputValue(),'古いレース・要再確認');
  await page.locator('#manualCorrectionForm [name=name]').fill('古いレース・訂正済み');
  await page.locator('#manualCorrectionForm [name=sourceURL]').fill('https://example.org/verified-by-user-not-official');
  await page.locator('#manualCorrectionForm button[type=submit]').click();await page.waitForSelector('#manualCorrectionApply');
  assert.match(await page.locator('#manualCorrectionPreview').innerText(),/古いレース・要再確認/);
  await page.locator('#manualCorrectionAgree').check();
  await page.locator('#manualCorrectionApply').click();
  await page.waitForFunction(()=>document.querySelector('#calendarMessage')?.textContent.includes('レース情報を訂正しました'));
  const afterEdit=await page.evaluate(async()=>(await (await import('./db.js')).loadCalendar()).calendar);
  assert.equal(afterEdit.races.length,45);
  assert.equal(afterEdit.races.find(r=>r.date==='2028-01-08').name,'古いレース・訂正済み');
  assert.equal(afterEdit.races.find(r=>r.date==='2028-01-08').approval,'unknown');
  const after=await page.evaluate(async()=>(await (await import('./db.js')).load()));
  assert.deepEqual(after,before);
  await page.reload();await page.waitForSelector('#raceAudit');await panel.locator('summary').click();
  await panel.locator('#raceAuditQuery').fill('訂正済み');
  assert.match(await panel.locator('.race-audit-info').innerText(),/古いレース・訂正済み/);
  await panel.locator('#raceAuditStatus').selectOption('other');
  assert.equal(await panel.locator('.race-audit-row').count(),0);
  await panel.locator('#raceAuditStatus').selectOption('all');
  assert.equal(await panel.locator('.race-audit-row').count(),1);
  for(const width of [320,390,440]){
   await page.setViewportSize({width,height:844});
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'horizontal overflow '+width);
  }
  assert.deepEqual(errors,[]);
  console.log('PASS v1.8.0 dashboard source/publish: categories, 45-row paging, filter/search, 41st-row correction, reload, data isolation and mobile');
 }finally{if(browser)await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exit(1);});

const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
(async()=>{
 const root=path.resolve(__dirname,'..'),prefix=process.env.PUBLISH==='1'?'/publish/':'/';
 const server=http.createServer((req,res)=>{let p=decodeURIComponent(req.url.split('?')[0]);if(p.endsWith('/'))p+='index.html';try{res.setHeader('Content-Type',({'.js':'text/javascript','.html':'text/html','.css':'text/css','.svg':'image/svg+xml'}[path.extname(p)]||'application/octet-stream'));res.end(fs.readFileSync(path.join(root,p)));}catch{res.writeHead(404).end();}}).listen(8071,'127.0.0.1');
 let browser;
 try{
  const c=require(process.env.CHROMIUM_MODULE);
  browser=await chromium.launch({headless:true,executablePath:await c.executablePath(),args:c.args.filter(x=>x!=='--disable-web-security'&&x!=='--allow-running-insecure-content')});
  const context=await browser.newContext({viewport:{width:390,height:844}}),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(17000);
  const go=async route=>{await page.evaluate(v=>location.hash=v,route);await page.waitForTimeout(125);};
  await page.goto('http://127.0.0.1:8071'+prefix);await page.waitForSelector('#homeEntry');
  const before=await page.evaluate(async()=>(await (await import('./db.js')).load()));
  await page.evaluate(async()=>{
   const db=await import('./db.js'),manual=await import('./manual-race.js');
   const old=await db.loadCalendar(),next=manual.planManualRace(old.calendar,{date:'2028-04-09',venue:'札幌',number:6,name:'修正前の名前',surface:'芝',distance:1200,sourceURL:'https://example.org/races/old'}).calendar;
   await db.saveCalendar(next,old.revision);
  });
  await page.reload();await go('settings');await page.waitForSelector('#manualCorrections');
  await page.locator('#manualCorrections > summary').click();
  assert.equal(await page.locator('[data-correct-race]').count(),1);
  assert.match(await page.locator('#manualCorrections').innerText(),/修正前の名前/);
  await page.locator('[data-correct-race="0"]').click();
  await page.waitForSelector('#manualCorrectionForm');
  assert.match(await page.locator('#manualCorrectionForm').innerText(),/2028-04-09 札幌 6R/);
  await page.locator('#manualCorrectionForm [name=name]').fill('修正後の名前');
  await page.locator('#manualCorrectionForm [name=surface]').selectOption('ダート');
  await page.locator('#manualCorrectionForm [name=distance]').fill('1700');
  await page.locator('#manualCorrectionForm [name=sourceURL]').fill('https://example.org/races/new');
  await page.locator('#manualCorrectionForm button[type=submit]').click();
  await page.waitForSelector('#manualCorrectionApply');
  const preview=await page.locator('#manualCorrectionPreview').innerText();
  assert.match(preview,/訂正前後を比較/);assert.match(preview,/修正前の名前/);assert.match(preview,/修正後の名前/);
  assert.match(preview,/2028-04-09\|札幌\|6/);
  const oldCalendar=await page.evaluate(async()=>(await (await import('./db.js')).loadCalendar()).calendar);
  assert.equal(oldCalendar.races[0].name,'修正前の名前');
  await page.locator('#manualCorrectionApply').click();
  assert.match(await page.locator('#calendarMessage').innerText(),/チェック/);
  await page.locator('#manualCorrectionAgree').check();
  await page.locator('#manualCorrectionApply').click();
  await page.waitForFunction(()=>document.querySelector('#calendarMessage')?.textContent.includes('レース情報を訂正しました'));
  const updated=await page.evaluate(async()=>(await (await import('./db.js')).loadCalendar()).calendar);
  assert.equal(updated.races.length,1);assert.equal(updated.meetings.length,1);
  const race=updated.races[0];assert.equal(race.name,'修正後の名前');assert.equal(race.distance,1700);
  assert.equal(race.surface,'ダート');assert.equal(race.approval,'unknown');
  assert.deepEqual([race.date,race.venue,race.number],['2028-04-09','札幌',6]);
  await page.reload();await go('entry');await page.waitForSelector('#date');
  await page.locator('#date').fill('2028-04-09');await page.locator('#date').dispatchEvent('change');
  await page.locator('#venue').selectOption('札幌');
  await page.locator('#calendarCandidates > details > summary').click();
  assert.match(await page.locator('#calendarCandidates').innerText(),/修正後の名前/);
  await page.locator('#calendarCandidates [data-n="6"]').click();
  assert.equal(await page.locator('#raceName').inputValue(),'修正後の名前');
  assert.equal(await page.locator('#number').inputValue(),'6');
  assert.match(await page.locator('#raceMatch').innerText(),/1700m/);
  const after=await page.evaluate(async()=>(await (await import('./db.js')).load()));
  assert.deepEqual(after,before);
  await go('settings');
  for(const width of [320,390,440]){
   await page.setViewportSize({width,height:844});
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'settings overflow '+width);
  }
  assert.deepEqual(errors,[]);
  console.log('PASS v1.7.1 metadata correction, confirmation, revision-safe persistence, entry candidate refresh, ledger isolation and mobile');
 }finally{if(browser)await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exit(1);});

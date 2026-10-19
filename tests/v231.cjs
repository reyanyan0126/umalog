const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
(async()=>{
 const root=path.resolve(__dirname,'..'),prefix=process.env.PUBLISH==='1'?'/publish/':'/';
 const server=http.createServer((req,res)=>{
  let p=decodeURIComponent(req.url.split('?')[0]);if(p.endsWith('/'))p+='index.html';
  try{res.setHeader('Content-Type',({'.js':'text/javascript','.html':'text/html','.css':'text/css','.svg':'image/svg+xml'}[path.extname(p)]||'application/octet-stream'));res.end(fs.readFileSync(path.join(root,p)));}
  catch{res.writeHead(404).end();}
 }).listen(8237,'127.0.0.1');
 let browser;
 try{
  const cfg=require(process.env.CHROMIUM_MODULE);
  browser=await chromium.launch({headless:true,executablePath:await cfg.executablePath(),args:cfg.args.filter(x=>x!=='--disable-web-security'&&x!=='--allow-running-insecure-content')});
  const context=await browser.newContext({viewport:{width:390,height:844}}),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());page.setDefaultTimeout(20000);
  await page.goto('http://127.0.0.1:8237'+prefix);await page.waitForSelector('#homeQuickEntry');
  const stored=await page.evaluate(async()=>{
   const {load,save}=await import('./db.js'),{makeSimpleEntry}=await import('./simple-ledger.js'),d=await load();
   const row=(id,date,stake,venue,type,status,payout=0)=>makeSimpleEntry({date,stake,venue,type,status,payout,refund:0,name:'',memo:'',number:''},id);
   d.races=[{id:'tokyo',date:'2026-09-22',venue:'東京',number:11,name:'九月'},{id:'kyoto',date:'2026-10-19',venue:'京都',number:11,name:'十月'}];
   d.tickets=[{id:'t1',raceId:'tokyo',type:'単勝',kind:'reported',memo:'',createdAt:'2026-09-22T00:00:00Z'},{id:'t2',raceId:'kyoto',type:'ワイド',kind:'reported',memo:'',createdAt:'2026-10-19T00:00:00Z'}];
   d.lines=[{id:'l1',ticketId:'t1',numbers:[1],stake:1000,status:'settled',payout:1000,refund:0},{id:'l2',ticketId:'t2',numbers:[1,2],stake:500,status:'pending',payout:0,refund:0}];
   d.simpleEntries=[row('a','2026-09-22',1000,'東京','単勝','settled'),row('b','2026-10-19',1000,'京都','ワイド','settled',4000),row('c','2026-10-20',2000,'中山','複勝','pending'),row('unknown','2026-10-20',1000,null,null,'pending')];
   await save(d);return JSON.stringify(await load());
  });
  await page.reload();await page.waitForSelector('#homeQuickEntry');
  await page.evaluate(()=>location.hash='analysis');await page.waitForSelector('#analysisCategoryCompare');await page.locator('#analysisAdvanced > summary').click();
  const labels=async axis=>page.locator('#category'+axis+'Results [data-category-label]').evaluateAll(rows=>rows.map(row=>row.getAttribute('data-category-label')));
  assert.deepEqual(await labels('Venue'),['東京','京都','中山']);
  assert.deepEqual(await labels('Type'),['単勝','ワイド','複勝']);
  assert.match(await page.locator('#analysisCategoryCompare').innerText(),/順番は過去の記録/);
  assert.match(await page.locator('#analysisCategoryCompare').innerText(),/記録少数・参考値/);
  assert.match(await page.locator('#categoryVenueResults').innerText(),/「未指定」 1点・件/);
  assert.match(await page.locator('#categoryVenueResults [data-category-label="中山"]').innerText(),/—/);
  await page.locator('#categoryVenueSort').selectOption('returnRate');
  assert.deepEqual(await labels('Venue'),['京都','東京','中山']);
  assert.match(await page.locator('#categoryVenueResults [data-category-label="京都"]').innerText(),/400\.0％/);
  await page.locator('#categoryTypeSort').selectOption('profit');
  assert.deepEqual(await labels('Type'),['ワイド','単勝','複勝']);
  await page.locator('#analysisVenue').selectOption('東京');
  assert.deepEqual(await labels('Venue'),['東京']);
  assert.deepEqual(await labels('Type'),['単勝']);
  assert.equal(await page.locator('#categoryVenueSort').inputValue(),'returnRate','sort survives filter update');
  await page.locator('#analysisVenue').selectOption('');
  await page.locator('#analysisRange').selectOption('month');
  await page.locator('#analysisMonth').fill('2026-09');await page.locator('#analysisMonth').dispatchEvent('change');
  assert.deepEqual(await labels('Venue'),['東京']);
  assert.deepEqual(await labels('Type'),['単勝']);
  await page.locator('#analysisRange').selectOption('all');
  assert.deepEqual(await labels('Venue'),['京都','東京','中山']);
  const a=await page.evaluate(async()=>JSON.stringify(await(await import('./db.js')).load()));
  assert.equal(a,stored,'sorting and filtering never mutate purchase data');
  for(const width of [320,390,440]){
   await page.setViewportSize({width,height:844});
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'category UI overflow '+width);
  }
  assert.deepEqual(errors,[]);
  console.log('PASS v2.3.0-dev.2: sorted category comparisons, unknown and pending-only groups, filters, untouched data and iPhone widths');
 }finally{if(browser)await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exit(1);});

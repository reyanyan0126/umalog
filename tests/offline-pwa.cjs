const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const http=require('node:http');
const {chromium,webkit}=require('playwright');
(async()=>{
 const root=path.resolve(__dirname,'..');
 const prefix=process.env.PUBLISH==='1'?'/publish/':'/';
 const server=http.createServer((req,res)=>{
  const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  const name=pathname.endsWith('/')?pathname+'index.html':pathname;
  const file=path.resolve(root,'.'+name);
  if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
  try{
   res.setHeader('Content-Type',({'.js':'text/javascript','.html':'text/html','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.webmanifest':'application/manifest+json'}[path.extname(file)]||'application/octet-stream'));
   res.end(fs.readFileSync(file));
  }catch{res.writeHead(404).end();}
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 let browser;
 try{
  browser=await (process.env.BROWSER==='webkit'?webkit:chromium).launch({headless:true});
  const context=await browser.newContext({viewport:{width:390,height:844}});
  const page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  const url='http://127.0.0.1:'+server.address().port+prefix;
  await page.goto(url);
  await page.locator('#launchStart:not([disabled])').waitFor();
  await page.locator('#launchStart').click();
  await page.locator('#homeSummary').waitFor();
  await page.waitForFunction(async()=>!!(await navigator.serviceWorker?.ready)?.active,null,{timeout:20000});
  await page.reload();
  await page.waitForFunction(()=>!!navigator.serviceWorker?.controller,null,{timeout:20000});
  await context.setOffline(true);
  await page.reload({waitUntil:'domcontentloaded'});
  await page.locator('#homeSummary').waitFor({timeout:20000});
  assert.deepEqual(errors,[],'offline app startup should not throw');
  console.log('PASS offline PWA',process.env.BROWSER||'chromium',prefix);
  await context.close();
 }finally{await browser?.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});

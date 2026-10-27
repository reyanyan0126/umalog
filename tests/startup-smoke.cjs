const assert=require('node:assert/strict');
const fs=require('node:fs');
const http=require('node:http');
const path=require('node:path');
const playwright=require('playwright');
(async()=>{
 const root=path.resolve(__dirname,'..');
 const prefix=process.env.PUBLISH==='1'?'/publish/':'/';
 const server=http.createServer((req,res)=>{
  const url=new URL(req.url,'http://localhost');
  let pathname=decodeURIComponent(url.pathname);
  if(pathname.endsWith('/'))pathname+='index.html';
  const file=path.resolve(root,'.'+pathname);
  if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
  try{
   const ext=path.extname(file);
   res.setHeader('Content-Type',({'.js':'text/javascript','.html':'text/html','.css':'text/css','.json':'application/json','.webmanifest':'application/manifest+json','.svg':'image/svg+xml','.png':'image/png'}[ext]||'application/octet-stream'));
   res.setHeader('Cache-Control','no-store');
   res.end(fs.readFileSync(file));
  }catch{res.writeHead(404).end();}
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 let browser;
 try{
  browser=await playwright[process.env.BROWSER||'chromium'].launch({headless:true});
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  const page=await context.newPage();
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const url='http://127.0.0.1:'+server.address().port+prefix;
  await page.goto(url,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>{const b=document.getElementById('launchStart');return b&&!b.disabled;},null,{timeout:15000});
  assert.deepEqual(errors,[],'startup must not throw JavaScript errors');
  await page.locator('#launchStart').click();
  await page.locator('#launchScreen').waitFor({state:'hidden'});
  await page.locator('#homeSummary').waitFor();
  await page.reload();
  await page.locator('#homeSummary').waitFor();
  assert.deepEqual(errors,[],'reload must not throw JavaScript errors');
  console.log('PASS startup smoke',process.env.BROWSER||'chromium',prefix);
 }finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(e=>{console.error(e);process.exitCode=1;});

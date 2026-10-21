// Increment VERSION whenever any app asset changes. Never touch IndexedDB here.
const VERSION='2.5.18';
const PREFIX='umalog-'+self.registration.scope+'-';
const CACHE=PREFIX+VERSION;
const ASSETS=['./','./index.html','./style.css','./app.js','./core.js','./db.js','./manifest.webmanifest','./assets/logo-official.png','./assets/icon.svg','./assets/icon-192.png','./assets/icon-512.png','./assets/icon-maskable.png',...Array.from({length:5},(_,i)=>`./assets/stage-${i}.svg`)];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll([...ASSETS,'./results.js','./dock.js','./tips.js','./analytics.js','./analysis-compare.js','./race-info.js','./style-view.js','./graded-master.js','./graded-races.js','./calendar.js','./calendar-view.js','./manual-race.js','./manual-race-correction.js','./race-audit.js','./growth-v2.js','./settlement-preview.js','./ledger-calendar.js','./jp-holidays.js','./number-pad.js','./advanced-picker.js','./stake-allocation.js','./stake-workflow.js','./simple-ledger.js','./bet-patterns.js','./batch-results.js','./batch-ui.js','./entry-results.js','./day-ledger.js','./growth-rewards.js','./fast-results.js','./entry-sheets.js','./ledger-tools.js','./line-correction.js','./entry-drafts.js','./screen-roles.js','./analysis-quality.js','./category-compare.js','./ledger-trends.js','./growth-companion.js',...Array.from({length:5},(_,i)=>'./assets/companion-'+i+'.svg')])).then(()=>self.skipWaiting())));
self.addEventListener('message',event=>{if(event.data?.type==='SKIP_WAITING')self.skipWaiting();});
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith(PREFIX)&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
// Navigation is network-first so a stale home screen cannot hide the update button.
self.addEventListener('fetch',event=>{
 if(event.request.method!=='GET')return;
 const url=new URL(event.request.url);
 if(!url.href.startsWith(self.registration.scope))return;
 const isDocument=event.request.mode==='navigate'||url.pathname.endsWith('/index.html');
 const isCode=url.pathname.endsWith('.js')||url.pathname.endsWith('.css')||url.pathname.endsWith('.webmanifest');
 event.respondWith((async()=>{
  const cache=await caches.open(CACHE);
  if(isDocument||isCode){
   try{
    const response=await fetch(event.request,{cache:'no-store'});
    if(response.ok)await cache.put(isDocument?'./index.html':event.request,response.clone());
    return response;
   }catch(error){
    const cached=await cache.match(isDocument?'./index.html':event.request,{ignoreSearch:true});
    if(cached)return cached;
    throw error;
   }
  }
  const cached=await cache.match(event.request,{ignoreSearch:true});
  if(cached)return cached;
  return fetch(event.request);
 })());
});

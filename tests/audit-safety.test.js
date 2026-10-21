import test from 'node:test';
import assert from 'node:assert/strict';
import {mountDockSwipe} from '../dock-swipe.js';
import {createEntryDraftAutosaver} from '../entry-drafts.js';
import {createNavigation} from '../navigation.js';
import {validDate,emptyData} from '../core.js';
import {makeSimpleEntry,cashFinance} from '../simple-ledger.js';
import {analysisCoverage} from '../finance-view.js';
function gestures(){
 const events={},routes=[],win={innerWidth:390,scrollY:0};let route='#home',allowed=true;
 mountDockSwipe({element:{addEventListener:(key,fn)=>events[key]=fn},window:win,getRoute:()=>route,canNavigate:()=>allowed,navigate:r=>routes.push(r)});
 const point=(x,y=100,id=1)=>({clientX:x,clientY:y,identifier:id});
 const target={closest:()=>false};
 const start=(x=280,y=100)=>events.touchstart({touches:[point(x,y)],target});
 const end=(x=100,y=100)=>events.touchend({touches:[],changedTouches:[point(x,y)],target});
 return {events,routes,win,point,target,start,end,setRoute:r=>route=r,block:()=>allowed=false};
}
test('swipe follows four tabs with no wrap and only commits at touchend',()=>{
 const h=gestures();h.start();assert.deepEqual(h.routes,[]);h.end();assert.deepEqual(h.routes,['#quick']);
 h.setRoute('#history');h.start();h.end();assert.equal(h.routes.at(-1),'#analysis');
 h.setRoute('#analysis');h.start();h.end();assert.equal(h.routes.length,2);
 h.start(100);h.end(280);assert.equal(h.routes.at(-1),'#history');
});
test('swipe rejects edges, vertical movement even if finger returns, scroll, controls, multitouch and dirty changes',()=>{
 const h=gestures();h.start(10);h.end(250);
 h.start();h.events.touchmove({touches:[h.point(260,150)]});h.end();
 h.start();h.win.scrollY=5;h.end();
 h.events.touchstart({touches:[h.point(280)],target:{closest:()=>true}});h.end();
 h.start();h.events.touchmove({touches:[h.point(280),h.point(200,100,2)]});h.end();
 h.start();h.events.touchcancel();h.end();
 h.start();h.setRoute('#history');h.end();
 h.start();h.block();h.end();assert.deepEqual(h.routes,[]);
});
test('invalid dates return false instead of throwing RangeError',()=>{
 for(const d of ['2026-99-99','2026-00-10','2026-02-30','no',null])assert.equal(validDate(d),false);
 assert.equal(validDate('2028-02-29'),true);
});
test('cash projection includes simple records and legacy pending spending without mutation',()=>{
 const d=emptyData();d.simpleEntries=[makeSimpleEntry({date:'2026-10-01',stake:1000,status:'settled',payout:1500,refund:100},'a'),makeSimpleEntry({date:'2026-10-02',stake:500,venue:'門別'},'b')];
 const before=JSON.stringify(d),s=cashFinance(d);assert.equal(s.recordedPurchase,1500);assert.equal(s.profit,100);assert.equal(s.returnRate,1600/1500*100);assert.equal(analysisCoverage(d).finance.profit,100);assert.equal(JSON.stringify(d),before);
});
function draft(){return {version:1,key:'new',race:{date:'2026-10-01',venue:'東京',number:'',name:''},lines:[],fields:Object.fromEntries(['type','mode','numbers','stake','duplicate','memo','saveNextRace','allowUnfinished'].map(k=>[k,''])),updatedAt:new Date().toISOString(),baseSignature:''};}
test('failed draft write prevents leave, retry succeeds and same-route clicks never erase inputs',async()=>{
 let fail=true,writes=0;const errors=[],renders=[];
 const saver=createEntryDraftAutosaver({key:'new',capture:draft,onSaved:()=>{},onError:e=>errors.push(e),persist:async()=>{writes++;if(fail)throw Error('quota');}});
 const win={location:{hash:'#entry'},sessionStorage:{getItem:()=> '1'},addEventListener(){},history:{replaceState(a,b,h){win.location.hash=h},pushState(a,b,h){win.location.hash=h}}};
 const nav=createNavigation({window:win,render:r=>renders.push(r),beforeLeave:()=>saver.flush().then(()=>true)});nav.start();saver.start();saver.schedule();
 await nav.navigate('#entry');assert.deepEqual(renders,['#entry']);
 await assert.rejects(nav.navigate('#home'),/quota/);assert.equal(win.location.hash,'#entry');assert.deepEqual(renders,['#entry']);
 fail=false;await nav.navigate('#home');assert.deepEqual(renders,['#entry','#home']);assert.equal(writes,2);assert.equal(errors.length,1);await saver.stop();
});

test('offline release includes every source JavaScript module',async()=>{
 const {readFile,readdir}=await import('node:fs/promises');const root=new URL('../',import.meta.url),sw=await readFile(new URL('sw.js',root),'utf8');
 for(const file of (await readdir(root)).filter(f=>f.endsWith('.js')&&f!=='sw.js'))assert.ok(sw.includes("'./"+file+"'"),'uncached module '+file);
});

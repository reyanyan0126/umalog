import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const inlineScripts=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(match=>match[1]);
const updateScript=inlineScripts.find(source=>source.includes("getElementById('launchUpdate')"));
const navigationScript=inlineScripts.find(source=>source.includes('function showTitle()'));
assert.ok(updateScript,'update handler must exist');
assert.ok(navigationScript,'title navigation handler must exist');

function harness(){
 const handlers={};let reloads=0,changes=0;
 const button={disabled:false,addEventListener:(name,fn)=>handlers[name]=fn};
 const status={textContent:''};
 const splash={hidden:true,style:{display:'none'}};
 const app={querySelector:()=>null};
 const location={hash:'#settings',pathname:'/umalog/',search:'',reload:()=>reloads++};
 const history={replaceState:(_a,_b,url)=>{location.hash=url.slice(url.indexOf('#'));}};
 const sessionStorage={removeItem:()=>{}};
 const reg={update:async()=>{},waiting:null,installing:null};
 const document={
  getElementById:id=>({launchUpdate:button,launchUpdateStatus:status,launchScreen:splash,app})[id],
  addEventListener:()=>{}
 };
 const window={dispatchEvent:()=>changes++,scrollTo:()=>{}};
 const navigator={serviceWorker:{getRegistration:async()=>reg,register:async()=>reg}};
 const context={document,location,history,sessionStorage,navigator,window,Event:class{constructor(type){this.type=type;}},MutationObserver:class{observe(){}},console};
 vm.runInNewContext(updateScript,context);
 return {handlers,location,status,splash,reg,context,get reloads(){return reloads},get changes(){return changes}};
}
test('update check from Settings route resets Home without reload when current',async()=>{
 const h=harness();
 await h.handlers.click();
 assert.equal(h.location.hash,'#home');
 assert.equal(h.reloads,0);
 assert.match(h.status.textContent,/確認が完了/);
 assert.ok(h.changes>=1);
});
test('title return clears Settings route and shows overlay',()=>{
 const h=harness();
 const handlers={};
 h.context.document.addEventListener=(name,fn)=>handlers[name]=fn;
 vm.runInNewContext(navigationScript,h.context);
 handlers.click({target:{closest:selector=>selector==='#returnToTitle'?{}:null},preventDefault(){}});
 assert.equal(h.location.hash,'#home');
 assert.equal(h.splash.hidden,false);
 assert.equal(h.splash.style.display,'grid');
});
test('Start link targets Home, not the previous Settings route',()=>{
 assert.match(html,/id="launchStart"[^>]*href="#home"/);
});

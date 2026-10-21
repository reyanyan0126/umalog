import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const code=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(x=>x[1]).find(s=>s.includes('function showTitle()'));
test('settings -> title routes Home before Start without silent replaceState',()=>{
 let route='#settings';let navigations=0;let click;
 const splash={hidden:true,style:{display:'none'}};
 const app={querySelector:()=>null};
 const location={get hash(){return route},set hash(v){route=v;navigations++}};
 const document={getElementById:id=>id==='app'?app:splash,addEventListener:(_,fn)=>{click=fn}};
 vm.runInNewContext(code,{document,location,window:{scrollTo(){}},sessionStorage:{removeItem(){}},MutationObserver:class{observe(){}}});
 click({target:{closest:()=>({})},preventDefault(){}});
 assert.equal(route,'#home');assert.equal(navigations,1);
 assert.equal(splash.hidden,false);
});
test('Start is one native Home link, not a second inline navigation handler',()=>{
 assert.match(html,/<a id="launchStart" class="launch-start" href="#home">/);
 assert.doesNotMatch(html,/id="launchStart"[^>]+onclick=/);
});

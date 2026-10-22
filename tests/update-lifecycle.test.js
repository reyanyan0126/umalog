import test from 'node:test';
import assert from 'node:assert/strict';
import {createUpdates} from '../updates.js';

function harness({allow=true,waiting=true}={}){
 const messages=[],posts=[];
 const reg={waiting:waiting?{postMessage:m=>posts.push(m)}:null,update:async()=>{},addEventListener(){}};
 const serviceWorker={controller:{},addEventListener(){},register:async()=>reg};
 const updates=createUpdates({serviceWorker,onOffer:()=>{},onStatus:m=>messages.push(m),canReload:()=>allow,reload:()=>{},isOnline:()=>true});
 return {updates,messages,posts};
}
test('pending update never reloads with unsaved data',async()=>{
 const h=harness({allow:false});
 await h.updates.check();
 assert.equal(h.posts.length,0);
 assert.ok(h.messages.some(x=>x.includes('保留')));
});
test('ready update activates waiting service worker',async()=>{
 const h=harness();
 await h.updates.check();
 assert.deepEqual(h.posts,[{type:'SKIP_WAITING'}]);
});
test('no waiting worker reports a verified release version',async()=>{
 const h=harness({waiting:false});
 await h.updates.check();
 assert.ok(h.messages.some(x=>x.includes('更新は見つかりませんでした')));
});

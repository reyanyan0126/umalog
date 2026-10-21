import test from 'node:test';
import assert from 'node:assert/strict';
import {createNavigation} from '../navigation.js';
function harness({seen=true,beforeLeave}={}){
 const win={location:{hash:'#settings'},sessionStorage:{getItem:()=>seen?'1':null},addEventListener(){},history:{replaceState(_a,_b,url){win.location.hash=url},pushState(_a,_b,url){win.location.hash=url}}};
 const screens=[];const nav=createNavigation({window:win,render:route=>screens.push(route),beforeLeave});nav.start();return {nav,win,screens};
}
test('fresh launch uses title even with a stale settings hash',()=>{assert.deepEqual(harness({seen:false}).screens,['#title']);});
test('Settings -> Title -> Start commits Home every time, including same-hash repair',async()=>{
 const {nav,win,screens}=harness();
 for(let i=0;i<4;i++){await nav.navigate('#settings');await nav.navigate('#title');await nav.navigate('#home');assert.equal(win.location.hash,'#home');assert.equal(screens.at(-1),'#home');}
 await nav.navigate('#home');assert.equal(screens.at(-1),'#home');
});
test('cancel unsaved changes keeps Settings and never displays title',async()=>{
 const {nav,win,screens}=harness({beforeLeave:async()=>false});assert.equal(await nav.navigate('#title'),false);assert.equal(win.location.hash,'#settings');assert.deepEqual(screens,['#settings']);
});
test('async draft flush is serialized before title and Start',async()=>{
 let release;const gate=new Promise(resolve=>release=resolve);const {nav,screens}=harness({beforeLeave:()=>gate});const title=nav.navigate('#title'),start=nav.navigate('#home');await Promise.resolve();assert.deepEqual(screens,['#settings']);release(true);await Promise.all([title,start]);assert.deepEqual(screens,['#settings','#title','#home']);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createNavigation} from '../navigation.js';

const app=readFileSync(new URL('../app.js',import.meta.url),'utf8');
test('swipe uses the guarded navigation controller',()=>{
 const swipe=app.slice(app.indexOf('function setupDockSwipe()'),app.indexOf('setupDockSwipe();'));
 assert.match(swipe,/navigate\('#'\+pages\[next\]\)/);
 assert.doesNotMatch(swipe,/location\.hash\s*=/);
 assert.match(swipe,/dirty\|\|calendarDirty/);
});

test('navigation blocks a swipe-style route change when unsaved',async()=>{
 const events={};
 const win={location:{hash:'#quick'},history:{replaceState(_a,_b,h){win.location.hash=h;},pushState(_a,_b,h){win.location.hash=h;}},addEventListener(type,fn){events[type]=fn;},sessionStorage:{getItem(){return '1';}}};
 const rendered=[];
 const navigation=createNavigation({window:win,render:h=>rendered.push(h),beforeLeave:async()=>false});
 navigation.start();
 assert.equal(await navigation.navigate('#history'),false);
 assert.equal(win.location.hash,'#quick');
 assert.deepEqual(rendered,['#quick']);
});

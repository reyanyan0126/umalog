import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createNavigation} from '../navigation.js';

const app=readFileSync(new URL('../app.js',import.meta.url),'utf8');
test('swipe uses the guarded navigation controller',()=>{
 const swipe=app.slice(app.indexOf('function setupDockSwipe()'),app.indexOf('setupDockSwipe();'));
 assert.match(swipe,/navigate\(destination\)/);
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


test('navigation changes screens in order without losing history',async()=>{
 const events={};
 const win={location:{hash:'#home'},history:{replaceState(_a,_b,h){win.location.hash=h;},pushState(_a,_b,h){win.location.hash=h;}},addEventListener(type,fn){events[type]=fn;},sessionStorage:{getItem(){return '1';}}};
 const rendered=[];
 const navigation=createNavigation({window:win,render:h=>rendered.push(h)});
 navigation.start();
 assert.equal(await navigation.navigate('#quick'),true);
 assert.equal(await navigation.navigate('#history'),true);
 assert.equal(await navigation.navigate('#analysis'),true);
 assert.equal(win.location.hash,'#analysis');
 assert.deepEqual(rendered,['#home','#quick','#history','#analysis']);
});

test('swipe keeps horizontal widgets and controls interactive',()=>{
 const swipe=app.slice(app.indexOf('function setupDockSwipe()'),app.indexOf('setupDockSwipe();'));
 assert.match(swipe,/overflow-x/);
 assert.match(swipe,/input,textarea,select,button,a,label/);
 assert.match(swipe,/touchcancel/);
});


test('navigation does not prompt when staying on the same screen',async()=>{
 let prompts=0;
 const win={location:{hash:'#home'},history:{replaceState(_a,_b,h){win.location.hash=h;},pushState(_a,_b,h){win.location.hash=h;}},addEventListener(){},sessionStorage:{getItem(){return '1';}}};
 const screens=[];
 const nav=createNavigation({window:win,render:h=>screens.push(h),beforeLeave:async()=>{prompts++;return false;}});
 nav.start();
 assert.equal(await nav.navigate('#home'),true);
 assert.equal(prompts,0);
 assert.equal(win.location.hash,'#home');
});

test('data protection: schema remains v1 and main writes use revision checks',()=>{
 const db=readFileSync(new URL('../db.js',import.meta.url),'utf8');
 assert.match(db,/VERSION=1,STORE='state'/);
 assert.match(db,/expectedRevision!==null&&revision!==expectedRevision/);
 assert.match(db,/store\.put\(data,'main'\)/);
 assert.match(db,/tx\.onabort=\(\)=>reject/);
});

test('PWA cache release and entry point versions agree',()=>{
 const sw=readFileSync(new URL('../sw.js',import.meta.url),'utf8');
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 const version=sw.match(/const VERSION='(\d+)\.(\d+)\.(\d+)'/);
 assert.ok(version,'PWA version should be declared');
 assert.ok(html.includes('app.js?v='+version[1]+version[2]+version[3]));
});


test('published release manifest matches PWA cache and entry point',()=>{
 const manifest=JSON.parse(readFileSync(new URL('../release.json',import.meta.url),'utf8'));
 const sw=readFileSync(new URL('../sw.js',import.meta.url),'utf8');
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 assert.equal(manifest.version,'2.8.0');
 assert.ok(sw.includes("const VERSION='"+manifest.version+"'"));
 assert.ok(html.includes('app.js?v=280'));
});

test('release metadata is fetched fresh and excluded from offline precache',()=>{
 const app=readFileSync(new URL('../app.js',import.meta.url),'utf8');
 const sw=readFileSync(new URL('../sw.js',import.meta.url),'utf8');
 assert.match(app,/release\.json\?check=/);
 assert.match(app,/cache:'no-store'/);
 assert.ok(!sw.includes("'./release.json'"));
});

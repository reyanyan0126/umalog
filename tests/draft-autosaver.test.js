import test from 'node:test';
import assert from 'node:assert/strict';
import {createEntryDraftAutosaver} from '../entry-drafts.js';
const capture=()=>({version:1,key:'new',race:{date:'2026-10-31',venue:'東京',number:'1',name:''},lines:[],fields:Object.fromEntries(['type','mode','numbers','stake','duplicate','memo','saveNextRace','allowUnfinished'].map(x=>[x,''])),updatedAt:'2026-10-31T00:00:00Z',baseSignature:''});
test('failed autosave rejects navigation flush until a later save succeeds',async()=>{
 let fail=true,errors=0,saved=0;
 const session=createEntryDraftAutosaver({key:'new',capture,onSaved:()=>saved++,onError:()=>errors++,persist:async()=>{if(fail)throw new Error('quota');}});
 session.start();session.schedule();await assert.rejects(session.flush(),/quota/);
 await assert.rejects(session.flush(),/quota/);assert.equal(saved,0);assert.equal(errors,1);
 fail=false;session.schedule();await session.flush();assert.equal(saved,1);await session.stop();
});
test('invalid captured draft prevents leaving and retains failure state',async()=>{
 const session=createEntryDraftAutosaver({key:'new',capture:()=>({...capture(),race:null}),onSaved:()=>assert.fail(),onError:()=>{},persist:()=>assert.fail()});
 session.start();session.schedule();await assert.rejects(session.flush(),/レース/);await session.stop();
});
test('autosaves serialize and pause waits for outstanding writes',async()=>{
 const order=[];let release;
 const session=createEntryDraftAutosaver({key:'new',capture,onSaved:()=>order.push('saved'),onError:()=>assert.fail(),persist:()=>new Promise(r=>release=()=>{order.push('write');r();})});
 session.start();session.schedule();const flush=session.flush();await Promise.resolve();
 let paused=false;const pause=session.pauseForCommit().then(()=>paused=true);await Promise.resolve();assert.equal(paused,false);
 release();await flush;await pause;assert.deepEqual(order,['write','saved']);await session.stop();
});
test('an earlier successful write cannot erase a later invalid-capture error',async()=>{
 let invalid=false,release;
 const session=createEntryDraftAutosaver({key:'new',capture:()=>invalid?{...capture(),race:null}:capture(),onSaved:()=>{},onError:()=>{},persist:()=>new Promise(r=>release=r)});
 session.start();session.schedule();const first=session.flush();await Promise.resolve();invalid=true;session.schedule();const second=session.flush();release();await first;await assert.rejects(second,/レース/);await assert.rejects(session.flush(),/レース/);await session.stop();
});

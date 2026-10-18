import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyData,validateData,recalculate} from '../core.js';
import {grow,migrateGrowth,companionProgress,growthTotal} from '../growth-v2.js';
import {companionAlbum,companionState,THEME_NAMES} from '../growth-companion.js';

const day=s=>new Date(s+'T03:00:00.000Z');
const start=()=>migrateGrowth(emptyData(),day('2026-10-18'),400);

test('v1.6 legacy GrowthV2 remains valid and 2 plays/day add bond but never purchase-based EXP',()=>{
 let d=start(),before=JSON.stringify(d),exp=growthTotal(d.growthV2);
 assert.equal(d.growthV2.companion,undefined);
 assert.equal(companionProgress(d.growthV2,'2026-10-18').theme,'meadow');
 assert.deepEqual(companionAlbum(recalculate(d),'2026-10-18').stages.map(x=>x.unlocked),[true,true,true,true,false]);
 assert.equal(JSON.stringify(d),before);
 for(let i=0;i<5;i++)d=grow(d,'play',null,day('2026-10-18'));
 assert.equal(d.growthV2.bond,2);
 assert.equal(d.growthV2.companion.playCount,2);
 assert.equal(d.growthV2.companion.memories.length,1);
 assert.equal(d.growthV2.companion.memories[0].kind,'play');
 assert.equal(growthTotal(d.growthV2),exp);
 assert.equal(d.growthV2.careExp,0);
 assert.deepEqual(validateData(JSON.parse(JSON.stringify(recalculate(d)))),recalculate(d));
});

test('v1.6 rest is repeat-safe, room selection is cosmetic, no lost days penalties',()=>{
 let d=start();const base=growthTotal(d.growthV2);
 d=grow(d,'rest',null,day('2026-10-18'));
 d=grow(d,'rest',null,day('2026-10-18'));
 assert.equal(d.growthV2.companion.memories.length,1);
 assert.equal(d.growthV2.companion.restDay,'2026-10-18');
 d=grow(d,'room','stars',day('2026-10-18'));
 assert.equal(companionProgress(d.growthV2,'2026-10-18').theme,'stars');
 assert.equal(growthTotal(d.growthV2),base);
 assert.equal(companionState(recalculate(d),'2026-10-18').theme,'stars');
 assert.equal(THEME_NAMES.stars,'星空');
 assert.throws(()=>grow(d,'room','paid-premium',day('2026-10-18')));
 const later=grow(d,'time',null,day('2026-10-21'));
 assert.equal(later.growthV2.bond,d.growthV2.bond);
 assert.equal(later.growthV2.companion.playCount,0);
 const beforeBack=JSON.stringify(d);
 const rollback=grow(d,'play',null,day('2026-10-17'));
 assert.equal(rollback.growthV2.bond,d.growthV2.bond);
 assert.equal(rollback.growthV2.clockWarning,true);
 assert.equal(JSON.stringify(d),beforeBack);
});

test('v1.6 memories deduplicate by day/action and cap at 30, validate corrupt import',()=>{
 let d=start();
 for(let i=0;i<35;i++){
  const time=new Date(Date.parse('2026-10-18T03:00:00.000Z')+i*86400000);
  d=grow(d,'play',null,time);
  d=grow(d,'rest',null,time);
 }
 const c=d.growthV2.companion;
 assert.equal(c.memories.length,30);
 assert.equal(new Set(c.memories.map(m=>m.day+'|'+m.kind)).size,30);
 assert.equal(companionAlbum(recalculate(d),'2026-11-21').memories.length,30);
 assert.deepEqual(validateData(JSON.parse(JSON.stringify(recalculate(d)))),recalculate(d));
 for(const mutation of [
  c=>c.theme='random',
  c=>c.playCount=3,
  c=>c.restDay='2026-02-30',
  c=>c.memories.push({...c.memories[0]}),
  c=>c.memories[0].kind='bet',
  c=>c.memories[0].day='bad'
 ]){
  const broken=structuredClone(d);mutation(broken.growthV2.companion);
  assert.throws(()=>validateData(broken));
 }
 const prior=migrateGrowth(emptyData(),day('2026-10-18'),700);
 assert.equal(validateData(recalculate(prior)).character.stage,4);
});

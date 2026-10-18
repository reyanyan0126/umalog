import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyData,recalculate,validateData} from '../core.js';
import {migrateGrowth,grow,companionProgress,growthTotal} from '../growth-v2.js';
import {companionState,OUTFIT_NAMES,OUTFIT_ICONS} from '../growth-companion.js';

const now=new Date('2026-10-18T03:00:00.000Z');
test('v1.6.1 all costumes cosmetic, optional, persistent, and previous data valid',()=>{
 const base=migrateGrowth(emptyData(),now,180),before=JSON.stringify(base);
 assert.equal(companionProgress(base.growthV2,'2026-10-18').outfit,'none');
 let data=base;
 for(const costume of ['ribbon','clover','scarf','none']){
  const exp=growthTotal(data.growthV2),bond=data.growthV2.bond;
  data=grow(data,'outfit',costume,now);
  assert.equal(companionProgress(data.growthV2,'2026-10-18').outfit,costume);
  assert.equal(companionState(recalculate(data),'2026-10-18').outfit,costume);
  assert.equal(growthTotal(data.growthV2),exp);
  assert.equal(data.growthV2.bond,bond);
  assert.deepEqual(validateData(recalculate(JSON.parse(JSON.stringify(data)))),recalculate(data));
 }
 assert.equal(Object.keys(OUTFIT_NAMES).length,4);
 assert.equal(OUTFIT_ICONS.none,'');
 assert.equal(JSON.stringify(base),before);
 const old=grow(base,'play',null,now);
 assert.equal(old.growthV2.companion.outfit,'none');
 const legacy=JSON.parse(JSON.stringify(old));delete legacy.growthV2.companion.outfit;
 assert.equal(validateData(legacy),legacy);
 assert.equal(companionProgress(legacy.growthV2,'2026-10-18').outfit,'none');
 const updated=grow(legacy,'outfit','scarf',now);
 assert.equal(updated.growthV2.companion.outfit,'scarf');
 assert.equal(updated.growthV2.companion.playCount,1);
});

test('v1.6.1 rejects invalid outfits in UI action and imported backup',()=>{
 const base=migrateGrowth(emptyData(),now);
 assert.throws(()=>grow(base,'outfit','paid-only',now));
 assert.throws(()=>grow(base,'outfit','',now));
 const data=grow(base,'outfit','ribbon',now);
 for(const bad of [null,'paid-only',50,{},'RIBBON']){
  const broken=structuredClone(data);broken.growthV2.companion.outfit=bad;
  assert.throws(()=>validateData(broken));
 }
 assert.equal(validateData(emptyData()).growthV2,undefined);
});

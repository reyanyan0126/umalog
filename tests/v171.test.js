import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyCalendar,validateCalendar} from '../calendar.js';
import {planManualRace} from '../manual-race.js';
import {editableManualRaces,eligibleManualRace,planManualCorrection} from '../manual-race-correction.js';
import {emptyData} from '../core.js';

const now='2026-10-18T13:00:00Z',later='2026-10-19T13:00:00Z';
const initial={date:'2028-04-09',venue:'札幌',number:6,name:'入力前の名称',surface:'芝',distance:'1200',sourceURL:'https://example.org/old'};
const change={name:'訂正した名称',surface:'ダート',distance:'1700',sourceURL:'https://example.org/new'};
test('v1.7.1 correct metadata only; preserve key, all other races and main financial records',()=>{
 const plain=emptyCalendar(),ledger=emptyData(),original=JSON.stringify({plain,ledger});
 const one=planManualRace(plain,initial,now).calendar;
 const two=planManualRace(one,{...initial,number:7,name:'他のレース'},now).calendar;
 const snapshot=JSON.stringify(two),key='2028-04-09|札幌|6';
 const x=planManualCorrection(two,key,change,later);
 assert.equal(x.key,key);
 assert.deepEqual(x.changed,['name','surface','distance','sourceURL']);
 assert.deepEqual([x.before.date,x.before.venue,x.before.number],[x.after.date,x.after.venue,x.after.number]);
 assert.equal(x.after.name,'訂正した名称');assert.equal(x.after.surface,'ダート');
 assert.equal(x.after.distance,1700);assert.equal(x.after.sourceURL,'https://example.org/new');
 assert.equal(x.after.retrievedAt,later);assert.equal(x.after.approval,'unknown');
 assert.equal(x.calendar.races.length,2);
 assert.deepEqual(x.calendar.meetings,two.meetings);
 assert.deepEqual(x.calendar.races.find(r=>r.number===7),two.races.find(r=>r.number===7));
 assert.deepEqual(validateCalendar(x.calendar),x.calendar);
 assert.equal(JSON.stringify(two),snapshot);
 assert.equal(JSON.stringify({plain,ledger}),original);
 assert.deepEqual(editableManualRaces(x.calendar).map(r=>r.number),[6,7]);
 assert.equal(eligibleManualRace(x.after),true);
});
test('v1.7.1 rejects no-op, malformed source and non-manual/blocked records',()=>{
 const x=planManualRace(emptyCalendar(),initial,now).calendar,key='2028-04-09|札幌|6';
 assert.throws(()=>planManualCorrection(x,key,{name:initial.name,surface:'芝',distance:'1200',sourceURL:initial.sourceURL},later),/変更がありません/);
 for(const mod of [{sourceURL:'javascript:alert(1)'},{sourceURL:'http://example.com'},{sourceURL:'https://hello:pass@example.com'},{distance:'0'},{surface:'砂'},{name:'x'.repeat(101)}]){
  assert.throws(()=>planManualCorrection(x,key,{...change,...mod},later),'bad metadata '+JSON.stringify(mod));
 }
 assert.throws(()=>planManualCorrection(x,'2028-04-09|札幌|5',change,later),/訂正対象/);
 for(const update of [
  r=>r.approval='approved',r=>r.status='result',r=>r.eventId='official-event',
  r=>r.grade='GIII',r=>r.gradeStatus='confirmed',r=>r.startTime='15:00',
  r=>r.sourceUpdatedAt='2028-04-01'
 ]){
  const blocked=structuredClone(x);update(blocked.races[0]);
  assert.equal(eligibleManualRace(blocked.races[0]),false);
  assert.throws(()=>planManualCorrection(blocked,key,change,later));
 }
 for(const status of ['changed','cancelled']){
  const blocked=structuredClone(x);blocked.meetings[0].status=status;
  assert.throws(()=>planManualCorrection(blocked,key,change,later),/中止・変更/);
 }
});
test('v1.7.1 optional data remain null, key and unverified status stable',()=>{
 const x=planManualRace(emptyCalendar(),initial,now).calendar;
 const o=planManualCorrection(x,'2028-04-09|札幌|6',{name:'',surface:'',distance:'',sourceURL:'https://example.org/changed'},later);
 assert.equal(o.after.name,null);assert.equal(o.after.surface,null);assert.equal(o.after.distance,null);
 assert.deepEqual(o.changed,['name','surface','distance','sourceURL']);
 assert.equal(o.after.status,'program');assert.equal(o.after.approval,'unknown');
 assert.equal(o.calendar.version,1);
});

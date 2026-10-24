import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyCalendar,validateCalendar} from '../calendar.js';
import {planManualRace} from '../manual-race.js';
import {raceAudit,filterRaceAudit,RACE_AUDIT_LABELS} from '../race-audit.js';
import {emptyData} from '../core.js';

const stamp='2026-10-18T12:00:00Z';
const add=(c,date,venue,number,name)=>planManualRace(c,{date,venue,number,name,surface:'芝',distance:1600,sourceURL:'https://example.org/race/'+number},stamp).calendar;
test('v1.8 classify local records only; no certification, no mutation of calendar or ledger',()=>{
 let c=add(emptyCalendar(),'2028-04-09','札幌',1,'検証していないレース');
 c=add(c,'2028-04-09','札幌',2,'認可前'),c=add(c,'2028-04-09','札幌',3,'格付け未確定');
 c=add(c,'2028-04-09','札幌',4,'その他'),c=add(c,'2028-05-09','東京',5,'中止確認');
 c.races[1].approval='pending';
 c.races[2].approval='approved';c.races[2].gradeStatus='pending';c.races[2].proposedGrade='GIII';
 c.races[3].approval='approved';
 c.meetings.find(m=>m.date==='2028-05-09').status='cancelled';
 const baseline=JSON.stringify({c,ledger:emptyData()});
 const a=raceAudit(c);
 assert.deepEqual(a.counts,{all:5,attention:4,blocked:1,pending:1,unknown:1,grade:1,other:1});
 assert.equal(a.records[0].auditStatus,'blocked');
 assert.equal(a.records.find(r=>r.number===1).auditStatus,'unknown');
 assert.equal(a.records.find(r=>r.number===4).auditStatus,'other');
 assert.deepEqual(filterRaceAudit(a,{status:'attention'}).total,4);
 assert.deepEqual(filterRaceAudit(a,{status:'other'}).visible.map(r=>r.number),[4]);
 assert.deepEqual(filterRaceAudit(a,{status:'blocked',venue:'札幌'}).visible,[]);
 assert.equal(filterRaceAudit(a,{status:'unknown',query:'検証していない'}).total,1);
 assert.equal(filterRaceAudit(a,{status:'all',query:'２０２８－０４－０９'}).total,4);
 assert.equal(filterRaceAudit(a,{status:'all',query:'EXAMPLE.ORG'}).total,5);
 assert.equal(JSON.stringify({c,ledger:emptyData()}),baseline);
 assert.equal(Object.keys(RACE_AUDIT_LABELS).length,5);
 assert.deepEqual(validateCalendar(c),c);
});
test('v1.8 bounded paging for 50+ records and strict input checks',()=>{
 let c=emptyCalendar();
 for(let i=0;i<51;i++){
  const d='2028-04-'+String(1+Math.floor(i/12)).padStart(2,'0');
  c=add(c,d,'東京',i%12+1,'対象'+i);
 }
 const a=raceAudit(c);
 const p=filterRaceAudit(a);
 assert.equal(p.total,51);assert.equal(p.visible.length,40);assert.equal(p.hasMore,true);
 assert.equal(filterRaceAudit(a,{limit:80}).visible.length,51);
 assert.equal(filterRaceAudit(a,{limit:80}).hasMore,false);
 assert.equal(filterRaceAudit(a,{status:'all',venue:'札幌'}).total,0);
 assert.equal(filterRaceAudit(a,{status:'attention',query:'対象50'}).total,1);
 for(const params of [{status:'official'},{venue:'架空競馬場'},{limit:0},{limit:30001},{query:'x'.repeat(201)}]){
  assert.throws(()=>filterRaceAudit(a,params));
 }
 assert.equal(raceAudit(emptyCalendar()).counts.all,0);
});

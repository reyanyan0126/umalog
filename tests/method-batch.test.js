import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyData,validateData,aggregate} from '../core.js';
import {candidateOutcome,raceCandidates} from '../batch-results.js';
import {styleAnalysis} from '../analytics.js';
import {resultValue} from '../results.js';

const podium=[3,4,5];
test('candidate identification for each ticket type, with bracket/unknown abstention',()=>{
 const tests=[
  ['単勝',[3],'hit'],['単勝',[4],'miss'],
  ['複勝',[5],'hit'],['複勝',[9],'miss'],
  ['馬連',[3,4],'hit'],['馬連',[3,5],'miss'],
  ['馬単',[3,4],'hit'],['馬単',[4,3],'miss'],
  ['ワイド',[3,5],'hit'],['ワイド',[4,9],'miss'],
  ['三連複',[3,4,5],'hit'],['三連複',[2,4,5],'miss'],
  ['三連単',[3,4,5],'hit'],['三連単',[5,4,3],'miss'],
  ['枠連',[1,2],'unknown']
 ];
 for(const [type,numbers,want] of tests)assert.equal(candidateOutcome(type,numbers,podium,{normalConfirmed:true,startersAtSale:18}),want,type);
 assert.equal(candidateOutcome('三連単',[3,4,5],[3,4,null]),'unknown');
 assert.throws(()=>candidateOutcome('単勝',[3],[3,3,5]),/同じ馬番/);
});
function fixture(){
 const d=emptyData();
 d.races=[{id:'race',date:'2026-10-17',venue:'東京',number:11,name:'例'}];
 d.tickets=[{id:'ticket',raceId:'race',type:'三連複',kind:'reported',memo:'',createdAt:'2026-10-17T04:00:00.000Z'}];
 d.lines=[
  {id:'l0',ticketId:'ticket',numbers:[3,4,5],stake:500,payout:3500,refund:0,status:'settled',purchaseMode:'box'},
  {id:'l1',ticketId:'ticket',numbers:[1,4,5],stake:200,payout:0,refund:0,status:'pending',purchaseMode:'flow'},
  {id:'l2',ticketId:'ticket',numbers:[2,4,5],stake:300,payout:0,refund:0,status:'pending',purchaseMode:'formation'},
  {id:'l3',ticketId:'ticket',numbers:[1,3,5],stake:100,payout:0,refund:0,status:'pending'}
 ];
 return d;
}
test('validates mixed legacy/new purchase modes; read-only method totals and rates',()=>{
 const d=validateData(fixture());
 const before=JSON.stringify(d),a=styleAnalysis(d),byMode=new Map(a.groups.mode.map(x=>[x.label,x]));
 assert.equal(a.groups.mode.length,4);
 assert.equal(byMode.get('BOX').stake,500);
 assert.equal(byMode.get('BOX').purchase,500);
 assert.equal(byMode.get('BOX').profit,3000);
 assert.equal(byMode.get('BOX').lineRate,100);
 assert.equal(byMode.get('流し').stake,200);
 assert.equal(byMode.get('フォーメーション').stake,300);
 assert.equal(byMode.get('旧記録（不明）').stake,100);
 assert.equal(byMode.get('旧記録（不明）').purchase,0);
 assert.equal(byMode.get('旧記録（不明）').pendingCount,1);
 assert.equal(JSON.stringify(d),before,'analyses must not mutate records');
 const invalid=fixture();invalid.lines[0].purchaseMode='random';
 assert.throws(()=>validateData(invalid),/買い方/);
 const legacy=fixture();delete legacy.lines[0].purchaseMode;
 assert.doesNotThrow(()=>validateData(legacy));
});
test('candidate preview includes pending rows, but never mutates settled line',()=>{
 const d=fixture(),before=JSON.stringify(d);
 const rows=raceCandidates(d,'race',podium,{normalConfirmed:true});
 assert.deepEqual(rows.map(x=>x.candidate),['settled','miss','miss','miss']);
 assert.equal(rows[0].payout,3500);
 assert.equal(rows[0].status,'settled');
 assert.equal(JSON.stringify(d),before);
 assert.equal(raceCandidates(d,'race',[3,4,null])[1].candidate,'unknown');
});
test('manual settlement amounts are required for hit and remain accounting source of truth',()=>{
 const d=fixture();
 assert.throws(()=>resultValue(d.lines[1],'hit',0),/1円以上/);
 const manually=resultValue(d.lines[1],'hit',2100);
 assert.deepEqual(manually,{status:'settled',payout:2100,refund:0});
 Object.assign(d.lines[1],manually);
 Object.assign(d.lines[2],resultValue(d.lines[2],'miss'));
 const validated=validateData(d),s=aggregate(validated);
 assert.equal(s.purchase,1000);
 assert.equal(s.payout,5600);
 assert.equal(s.pendingStake,100);
 assert.equal(s.profit,4600);
 assert.equal(validated.lines[0].payout,3500);
 assert.equal(validated.lines[3].status,'pending');
});

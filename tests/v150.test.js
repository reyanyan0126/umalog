import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyData} from '../core.js';
import {periodComparison} from '../analysis-compare.js';

function fixture(){
 const d=emptyData();
 for(const [id,date,venue,type,amount,status,payout,refund] of [
  ['old','2026-08-19','東京','単勝',100,'settled',10000,0],
  ['prior','2026-08-20','阪神','ワイド',100,'settled',0,0],
  ['priorRefund','2026-09-18','阪神','ワイド',100,'void',0,100],
  ['recent','2026-09-19','東京','ワイド',500,'settled',1000,0],
  ['pending','2026-10-18','東京','ワイド',100,'pending',0,0],
  ['recentRefund','2026-10-18','東京','ワイド',100,'void',0,100],
  ['future','2026-10-19','東京','単勝',100,'settled',90000,0]
 ]){
  const rid='race-'+id,tid='ticket-'+id;
  d.races.push({id:rid,date,venue,number:1,name:''});
  d.tickets.push({id:tid,raceId:rid,type,kind:'reported',memo:'',createdAt:date+'T01:00:00Z'});
  d.lines.push({id:'line-'+id,ticketId:tid,numbers:type==='単勝'?[1]:[1,2],stake:amount,status,payout,refund,purchaseMode:'normal'});
 }
 return d;
}

test('v1.5 30-day closed ranges include boundaries and exclude old/future records',()=>{
 const d=fixture(),old=JSON.stringify(d),c=periodComparison(d,'2026-10-18');
 assert.deepEqual([c.recent.start,c.recent.end],['2026-09-19','2026-10-18']);
 assert.deepEqual([c.previous.start,c.previous.end],['2026-08-20','2026-09-18']);
 assert.equal(c.recent.summary.purchase,600);
 assert.equal(c.recent.summary.payout,1000);
 assert.equal(c.recent.summary.refund,100);
 assert.equal(c.recent.summary.profit,500);
 assert.equal(c.recent.summary.pendingCount,1);
 assert.equal(c.recent.summary.pendingStake,100);
 assert.equal(c.recent.summary.lineCount,1);
 assert.equal(c.recent.summary.lineHits,1);
 assert.equal(c.previous.summary.purchase,200);
 assert.equal(c.previous.summary.refund,100);
 assert.equal(c.previous.summary.profit,-100);
 assert.equal(c.profitDelta,600);
 assert.ok(Math.abs(c.rateDelta-133.33333333333)<0.00001);
 assert.deepEqual(c.byType.map(x=>x.label),['ワイド']);
 assert.deepEqual(c.byVenue.map(x=>x.label),['東京']);
 assert.equal(c.byType[0].recordedStake,700);
 assert.equal(c.byType[0].lineCount,1);
 assert.equal(c.lowSample,true);
 assert.equal(JSON.stringify(d),old);
});

test('v1.5 no finalized purchase shows null deltas and no misleading rate',()=>{
 const d=emptyData();
 d.races=[{id:'r',date:'2026-10-18',venue:'札幌',number:1,name:''}];
 d.tickets=[{id:'t',raceId:'r',type:'複勝',kind:'reported',memo:'',createdAt:'2026-10-18T01:00:00Z'}];
 d.lines=[{id:'l',ticketId:'t',numbers:[1],stake:100,status:'pending',payout:0,refund:0}];
 const c=periodComparison(d,'2026-10-18');
 assert.equal(c.recent.summary.returnRate,null);
 assert.equal(c.recent.summary.profit,0);
 assert.equal(c.recent.summary.pendingStake,100);
 assert.equal(c.rateDelta,null);
 assert.equal(c.profitDelta,null);
 assert.equal(c.byType[0].returnRate,null);
 assert.equal(c.byType[0].pendingCount,1);
 assert.equal(periodComparison(emptyData(),'2026-10-18').byVenue.length,0);
 assert.throws(()=>periodComparison(d,'2026-02-30'));
 assert.throws(()=>periodComparison(d,'2026-10-18',0));
});

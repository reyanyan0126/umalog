import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyData,validateData} from '../core.js';
import {makeSimpleEntry} from '../simple-ledger.js';
import {analysisCoverage,inclusiveMonthlyRows} from '../analysis-quality.js';
const row=(id,date,stake,venue,type,status,payout=0)=>makeSimpleEntry({date,stake,venue,type,status,payout,refund:0,name:'',memo:'',number:''},id);
function fixture(){
 const d=emptyData();
 d.races=[
  {id:'sep',date:'2026-09-22',venue:'東京',number:11,name:'九月'},
  {id:'oct',date:'2026-10-19',venue:'京都',number:11,name:'十月'}
 ];
 d.tickets=[
  {id:'ts',raceId:'sep',type:'単勝',kind:'reported',memo:'',createdAt:'2026-09-22T00:00:00Z'},
  {id:'to',raceId:'oct',type:'ワイド',kind:'reported',memo:'',createdAt:'2026-10-19T00:00:00Z'}
 ];
 d.lines=[
  {id:'ls',ticketId:'ts',numbers:[1],stake:1000,status:'settled',payout:1500,refund:0},
  {id:'lo',ticketId:'to',numbers:[1,2],stake:500,status:'pending',payout:0,refund:0}
 ];
 d.simpleEntries=[
  row('s1','2026-10-19',2000,'京都','ワイド','settled'),
  row('s2','2026-10-20',1000,null,null,'pending'),
  row('s3','2026-09-22',1000,'東京','単勝','settled',2000)
 ];
 return d;
}
test('coverage counts details as points and simple as independent records, no payouts inferred',()=>{
 const d=fixture(),before=JSON.stringify(d);
 validateData(d);
 const q=analysisCoverage(d);
 assert.equal(q.total,5);
 assert.equal(q.detailCount,2);assert.equal(q.simpleCount,3);
 assert.equal(q.settledCount,3);assert.equal(q.pendingCount,2);
 assert.equal(q.finance.recordedPurchase,5500);
 assert.equal(q.finance.settledPurchase,4000);
 assert.equal(q.finance.receipts,3500);
 assert.equal(q.finance.profit,-500);
 assert.equal(q.finance.returnRate,87.5);
 assert.equal(q.pendingStake,1500);
 assert.equal(q.settledShare,4000/5500*100);
 assert.equal(q.venueCount,4);assert.equal(q.typeCount,4);
 assert.equal(q.venueShare,4500/5500*100);
 assert.equal(q.typeShare,4500/5500*100);
 assert.equal(q.venueCountShare,80);assert.equal(q.typeCountShare,80);
 assert.equal(JSON.stringify(d),before,'analysis should not modify stored ledger');
});
test('monthly rows include all detailed and simple, honor month/year/venue/type and zero payouts',()=>{
 const d=fixture();
 const rows=inclusiveMonthlyRows(d);
 assert.deepEqual(rows.map(x=>x.month),['2026-09','2026-10']);
 assert.deepEqual(rows.map(x=>[x.recordedPurchase,x.settledPurchase,x.receipts,x.pendingStake,x.profit,x.returnRate]),[
  [2000,2000,3500,0,1500,175],
  [3500,2000,0,1500,-2000,0]
 ]);
 assert.deepEqual(inclusiveMonthlyRows(d,{prefix:'2026-10'}).map(x=>x.month),['2026-10']);
 assert.deepEqual(inclusiveMonthlyRows(d,{prefix:'2026'}).map(x=>x.month),['2026-09','2026-10']);
 assert.deepEqual(inclusiveMonthlyRows(d,{venue:'東京'}).map(x=>x.month),['2026-09']);
 assert.deepEqual(inclusiveMonthlyRows(d,{venue:'京都',type:'ワイド'}).map(x=>x.month),['2026-10']);
 assert.deepEqual(inclusiveMonthlyRows(d,{type:'三連単'}),[]);
 assert.equal(inclusiveMonthlyRows(d,{limit:1})[0].month,'2026-10');
 assert.equal(analysisCoverage(d,{prefix:'2026-08'}).finance.returnRate,null);
 assert.equal(analysisCoverage(d,{prefix:'2026-08'}).settledShare,null);
 assert.throws(()=>inclusiveMonthlyRows(d,{limit:0}),/表示月数/);
});

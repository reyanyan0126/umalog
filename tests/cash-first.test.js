import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyData} from '../core.js';
import {makeSimpleEntry,cashFinance,cashQuickBreakdown} from '../simple-ledger.js';
import {ledgerMonth} from '../ledger-calendar.js';
import {calendarMetricValue} from '../screen-roles.js';

function fixture(){
 const d=emptyData();
 d.simpleEntries=[
  makeSimpleEntry({date:'2026-10-20',stake:1000,venue:'札幌',status:'pending'},'old-quick'),
  makeSimpleEntry({date:'2026-10-19',stake:500,venue:'東京',status:'settled',payout:700},'paid-quick')
 ];
 d.races.push({id:'r1',date:'2026-10-18',venue:'札幌',number:11,name:'旧詳細馬券'});
 d.tickets.push({id:'t1',raceId:'r1',type:'単勝',kind:'reported',memo:'',createdAt:'2026-10-18T00:00:00Z'});
 d.lines.push({id:'l1',ticketId:'t1',numbers:[1],stake:200,status:'pending',payout:0,refund:0});
 return d;
}
test('legacy quick and detailed purchases are expenses immediately without data mutation',()=>{
 const d=fixture(),raw=JSON.stringify(d);
 const all=cashFinance(d);
 assert.equal(all.recordedPurchase,1700);
 assert.equal(all.settledPurchase,1700);
 assert.equal(all.receipts,700);
 assert.equal(all.profit,-1000);
 assert.equal(all.returnRate,700/1700*100);
 assert.equal(all.pendingCount,0);
 assert.equal(all.pendingStake,0);
 assert.equal(all.simpleCount,2);
 assert.equal(all.detailCount,1);
 assert.equal(JSON.stringify(d),raw,'read-only query must not mutate old backups');
 assert.equal(d.simpleEntries[0].status,'pending','legacy flag preserved in source');
 assert.equal(d.lines[0].status,'pending','legacy detailed flag preserved in source');
});
test('date and venue filters and calendar use exactly the same money',()=>{
 const d=fixture(),month=cashFinance(d,{prefix:'2026-10'});
 assert.equal(month.profit,-1000);
 const sapporo=cashFinance(d,{venue:'札幌'});
 assert.deepEqual([sapporo.recordedPurchase,sapporo.receipts,sapporo.profit],[1200,0,-1200]);
 const tokyo=cashFinance(d,{venue:'東京'});
 assert.deepEqual([tokyo.recordedPurchase,tokyo.receipts,tokyo.profit],[500,700,200]);
 const days=ledgerMonth(d,[],'2026-10').days;
 for(const [n,stake,payout,profit] of [[18,200,0,-200],[19,500,700,200],[20,1000,0,-1000]]){
  const stat=days[n-1].summary;
  assert.equal(stat.purchase,stake,'daily recorded stake '+n);
  assert.equal(stat.payout,payout);
  assert.equal(calendarMetricValue(stat,'profit'),profit);
  assert.equal(calendarMetricValue(stat,'purchase'),stake);
  assert.equal(calendarMetricValue(stat,'receipt'),payout);
  assert.equal(stat.pendingCount,0,'no pending indicator in day summary');
 }
});
test('category profit matches original purchase and current receipts',()=>{
 const d=fixture(),byVenue=cashQuickBreakdown(d,{dimension:'venue'});
 const rows=Object.fromEntries(byVenue.map(row=>[row.label,row]));
 assert.deepEqual([rows['札幌'].recordedPurchase,rows['札幌'].profit,rows['札幌'].pendingCount],[1200,-1200,0]);
 assert.deepEqual([rows['東京'].recordedPurchase,rows['東京'].profit],[500,200]);
});
test('new purchase can be recorded as an immediate expense; payout revision changes only receipts',()=>{
 const d=fixture();
 const row=makeSimpleEntry({date:'2026-10-21',stake:300,status:'settled',payout:0},'new-quick');
 d.simpleEntries.push(row);
 assert.equal(cashFinance(d).profit,-1300);
 d.simpleEntries[2]=makeSimpleEntry({...row,payout:900,status:'settled'},row.id);
 assert.equal(cashFinance(d).profit,-400);
 assert.equal(d.simpleEntries[2].stake,300);
 assert.equal(d.lines[0].stake,200,'detailed bet kept');
});

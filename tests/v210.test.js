import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyData,validateData} from '../core.js';
import {validateSimpleEntries,makeSimpleEntry,combinedFinance,quickBreakdown} from '../simple-ledger.js';
import {budgetStatus,ledgerCSV} from '../ledger-tools.js';
import {ledgerMonth} from '../ledger-calendar.js';
const date='2026-10-19';
const make=(id,stake,props={})=>makeSimpleEntry({date,stake,...props},id);
function mixed(){
 const d=emptyData();
 d.races=[{id:'r1',date,venue:'札幌',number:11,name:'詳細レース'}];
 d.tickets=[{id:'t1',raceId:'r1',type:'ワイド',kind:'reported',memo:'',createdAt:'2026-10-19T03:00:00Z'}];
 d.lines=[{id:'l1',ticketId:'t1',numbers:[1,2],stake:1000,status:'settled',payout:3200,refund:0,purchaseMode:'formation'}];
 d.simpleEntries=[make('q1',1500),make('q2',500),make('q3',1000,{venue:'東京',type:'三連複',number:9,status:'settled',payout:0,refund:0})];
 return d;
}
test('v2.1 optional data backward compatibility; simple records validated, no fake tickets',()=>{
 const legacy=emptyData();
 assert.equal(validateData(legacy).simpleEntries,undefined);
 const d=mixed(),original=JSON.stringify(d),validated=validateData(d);
 assert.equal(validated.simpleEntries.length,3);
 assert.equal(validated.tickets.length,1);
 assert.equal(validated.lines.length,1);
 assert.equal(JSON.stringify(d),original);
 assert.deepEqual(JSON.parse(JSON.stringify(validated)).simpleEntries,d.simpleEntries);
});
test('v2.1 purchase total includes every simple record; confirmed net ignores pending',()=>{
 const d=mixed(),all=combinedFinance(d);
 assert.equal(all.recordedPurchase,4000);
 assert.equal(all.settledPurchase,2000);
 assert.equal(all.receipts,3200);
 assert.equal(all.profit,1200);
 assert.equal(all.tentativeNet,-800);
 assert.equal(all.pendingStake,2000);
 assert.equal(all.pendingCount,2);
 assert.deepEqual(all.coverage,{all:4,venue:2,number:2,type:2,combination:1});
 assert.equal(combinedFinance(d,{venue:'東京'}).recordedPurchase,1000);
 assert.equal(combinedFinance(d,{venue:'札幌'}).recordedPurchase,1000);
 assert.equal(combinedFinance(d,{type:'ワイド'}).recordedPurchase,1000);
 assert.equal(combinedFinance(d,{type:'三連複'}).recordedPurchase,1000);
 assert.equal(combinedFinance(d,{prefix:'2026-10-18'}).recordedPurchase,0);
 assert.equal(combinedFinance(d,{prefix:'2026-10'}).recordedPurchase,4000);
});
test('v2.1 field-aware analysis classifies missing venue/type and sums detailed + simple',()=>{
 const d=mixed(),byVenue=quickBreakdown(d,{dimension:'venue'});
 assert.deepEqual(byVenue.map(x=>x.label),['未指定','札幌','東京']);
 assert.equal(byVenue[0].recordedPurchase,2000);
 const byType=quickBreakdown(d,{dimension:'type'});
 assert.equal(byType.find(x=>x.label==='未指定').recordedPurchase,2000);
 assert.equal(byType.find(x=>x.label==='ワイド').receipts,3200);
 assert.equal(quickBreakdown(d,{dimension:'date'})[0].recordedPurchase,4000);
});
test('v2.1 budget, CSV, calendar include simple spending without double count',()=>{
 const d=mixed();
 const budget=budgetStatus(d,'2026-10');
 assert.equal(budget.purchase,4000);assert.equal(budget.pending,0);
 const csv=ledgerCSV(d);
 assert.match(csv,/記録済み（簡易）/);
 assert.equal(csv.split('\r\n').filter(x=>x.startsWith('"2026-10-19"')).length,4);
 const month=ledgerMonth(d,[],'2026-10');
 const day=month.days.find(x=>x.date===date);
 assert.equal(day.summary.purchase,4000);
 assert.equal(day.summary.pendingStake,0);
 assert.equal(day.summary.payout,3200);
 assert.equal(day.quick.length,3);
});
test('v2.1 distinguish unresolved from confirmed zero, preserve id on editing, reject invalid',()=>{
 const original=make('q1',1000);
 assert.equal(original.status,'pending');assert.equal(original.payout,0);
 const corrected=make('q1',1000,{status:'settled',payout:0});
 assert.equal(corrected.id,'q1');
 assert.equal(corrected.status,'settled');
 assert.equal(combinedFinance({...emptyData(),simpleEntries:[corrected]}).profit,-1000);
 const refunded=make('q1',1000,{status:'settled',refund:1000});
 assert.equal(combinedFinance({...emptyData(),simpleEntries:[refunded]}).profit,0);
 const d=emptyData();d.simpleEntries=[original,corrected];
 assert.throws(()=>validateData(d),/重複/);
 const errors=[
 ()=>make('x',0),()=>make('x',150),()=>make('x',100,{venue:'存在しない競馬場'}),
 ()=>make('x',100,{number:13}),()=>make('x',100,{type:'WIN5'}),
 ()=>make('x',100,{status:'settled',refund:200}),
 ()=>make('x',100,{status:'settled',refund:100,payout:300}),
 ()=>validateSimpleEntries([{...original,status:'pending',payout:200}]),
 ()=>validateSimpleEntries([{...original}, {...original}]),
 ()=>validateSimpleEntries([{...original,createdAt:'secret'}]),
 ()=>combinedFinance(emptyData(),{venue:'存在しない競馬場'})
 ];
 for(const f of errors)assert.throws(f);
});

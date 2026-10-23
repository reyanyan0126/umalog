import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyData,summarize} from '../core.js';
import {homeSummary,raceHistoryRows,matchesRaceQuery,typeVenueMatrix,calendarMetricValue} from '../screen-roles.js';
function fixture(){
 const d=emptyData();
 d.races=[{id:'r1',date:'2026-10-18',venue:'東京',number:8,name:'収支テスト'},{id:'r2',date:'2026-09-18',venue:'京都',number:10,name:'以前の記録'}];
 d.tickets=[{id:'t1',raceId:'r1',type:'ワイド',memo:'振り返り用メモ'},{id:'t2',raceId:'r1',type:'単勝',memo:'別の券種'},{id:'t3',raceId:'r2',type:'複勝',memo:'前月'}];
 d.lines=[{id:'l1',ticketId:'t1',status:'settled',stake:100,payout:550,refund:0,numbers:[1,2]},{id:'l2',ticketId:'t1',status:'pending',stake:200,payout:0,refund:0,numbers:[1,3]},{id:'l3',ticketId:'t2',status:'settled',stake:100,payout:0,refund:0,numbers:[4]},{id:'l4',ticketId:'t3',status:'settled',stake:100,payout:250,refund:0,numbers:[5]}];
 return d;
}
test('monthly home counts every purchase as expense without mutating legacy data',()=>{
 const d=fixture(),before=JSON.stringify(d),m=homeSummary(d,'2026-10');
 assert.equal(m.purchase,400);assert.equal(m.payout,550);assert.equal(m.profit,150);assert.equal(m.pendingCount,0);assert.equal(m.pendingStake,0);
 assert.equal(homeSummary(d,'2026-09').profit,150);
 assert.equal(JSON.stringify(d),before);
});
test('dev24 indexed history groups per race and matches normalized race memo',()=>{
 const d=fixture(),rows=raceHistoryRows(d);assert.equal(rows.length,2);assert.equal(rows[0].tickets.length,2);
 assert.ok(matchesRaceQuery(rows[0],'振り返り'));assert.ok(matchesRaceQuery(rows[0],'東京'));assert.ok(matchesRaceQuery(rows[0],'収支テスト'));
 assert.ok(!matchesRaceQuery(rows[0],'札幌'));assert.ok(!matchesRaceQuery(rows[1],'振り返り'));
});
test('calendar shows cash-flow profit, all purchases and actual receipts',()=>{
 const summary=summarize(fixture().lines.slice(0,3));
 assert.equal(calendarMetricValue(summary,'profit'),150);
 assert.equal(calendarMetricValue(summary,'purchase'),400);
 assert.equal(calendarMetricValue(summary,'receipt'),550);
 assert.equal(calendarMetricValue(null,'profit'),null);assert.throws(()=>calendarMetricValue(summary,'random'));
});
test('dev27 matrix groups venue × ticket type without inventing missing data',()=>{
 const d=fixture(),before=JSON.stringify(d),rows=typeVenueMatrix(d);
 assert.equal(rows.length,25);const tokyo=rows.find(r=>r.venue==='東京');
 assert.equal(tokyo.types.length,8);const wide=tokyo.types.find(x=>x.type==='ワイド');
 assert.equal(wide.lines,2);assert.equal(wide.pending,0);assert.equal(wide.profit,250);
 const kyoto=rows.find(r=>r.venue==='京都').types.find(x=>x.type==='複勝');assert.equal(kyoto.profit,150);
 const noData=tokyo.types.find(x=>x.type==='三連単');assert.equal(noData.settledCount,0);
 assert.equal(JSON.stringify(d),before);
});

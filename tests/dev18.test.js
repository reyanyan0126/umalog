import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyData,validateData} from '../core.js';
import {budgetStatus,setMonthlyBudget,raceHistory,ledgerCSV,monthReview} from '../ledger-tools.js';
import {lineCorrectionValues} from '../line-correction.js';
function fixture(){
 const d=emptyData();d.races=[{id:'r1',date:'2026-10-17',venue:'東京',number:8,name:'中央競馬テスト戦'},{id:'r2',date:'2026-10-18',venue:'京都',number:9,name:'特別競走'}];
 d.tickets=[{id:'t1',raceId:'r1',type:'ワイド',kind:'reported',memo:' =SUM(1,2)',createdAt:'2026-10-17T09:00:00Z'},{id:'t2',raceId:'r1',type:'複勝',kind:'reported',memo:'メモ',createdAt:'2026-10-17T09:05:00Z'},{id:'t3',raceId:'r2',type:'単勝',kind:'reported',memo:'',createdAt:'2026-10-18T09:00:00Z'}];
 d.lines=[{id:'l1',ticketId:'t1',numbers:[1,2],stake:100,status:'settled',payout:480,refund:0,purchaseMode:'normal'},{id:'l2',ticketId:'t1',numbers:[2,3],stake:100,status:'settled',payout:760,refund:0,purchaseMode:'normal'},{id:'l3',ticketId:'t2',numbers:[5],stake:100,status:'void',payout:0,refund:100,purchaseMode:'normal'},{id:'l4',ticketId:'t3',numbers:[3],stake:100,status:'pending',payout:0,refund:0,purchaseMode:'normal'}];
 return d;
}
test('dev16 records group by race, preserve per-ticket records and stable order',()=>{
 const d=fixture(),snapshot=JSON.stringify(d),rows=raceHistory(d);
 assert.equal(rows.length,2);assert.equal(rows[1].tickets.length,2);assert.equal(rows[1].summary.profit,1040);
 assert.equal(JSON.stringify(d),snapshot);
});
test('dev16 CSV is BOM UTF-8, RFC-style escaped, formula safe, includes all purchases, pending profit blank',()=>{
 const d=fixture(),csv=ledgerCSV(d);
 assert.ok(csv.startsWith('\uFEFF'));assert.ok(csv.includes('\r\n'));assert.equal(csv.split('\r\n').length-1,5);
 assert.ok(csv.includes('"\' =SUM(1,2)"'));
 assert.ok(csv.includes('"未入力"'));assert.ok(csv.includes('"ワイド"'));
 assert.ok(csv.includes('"380"'));
 assert.equal(JSON.stringify(d),JSON.stringify(fixture()));
});
test('dev16 one-line correction validates refund and payout, cannot create invalid statuses',()=>{
 const l=fixture().lines[0];assert.deepEqual(lineCorrectionValues(l,'hit',200,950,0),{stake:200,status:'settled',payout:950,refund:0});
 assert.deepEqual(lineCorrectionValues(l,'refund',300,0,0),{stake:300,status:'void',payout:0,refund:300});
 assert.deepEqual(lineCorrectionValues(l,'advanced',200,700,50),{stake:200,status:'settled',payout:700,refund:50});
 assert.throws(()=>lineCorrectionValues(l,'hit',200,0,0));
 assert.throws(()=>lineCorrectionValues(l,'advanced',200,50,250));
 assert.throws(()=>lineCorrectionValues(l,'pending',100,0,0));
 assert.throws(()=>lineCorrectionValues(l,'hit',125,100,0));
});
test('dev17 optional budgets in existing schema survive JSON round-trip, account for pending purchases',()=>{
 const initial=fixture();validateData(initial);
 const updated=setMonthlyBudget(initial,'2026-10',300),status=budgetStatus(updated,'2026-10');
 assert.equal(status.purchase,400);assert.equal(status.pending,100);assert.equal(status.remaining,-100);assert.equal(status.over,true);
 assert.equal(JSON.stringify(initial.settings.monthlyBudgets),undefined);
 assert.equal(validateData(JSON.parse(JSON.stringify(updated))).settings.monthlyBudgets['2026-10'],300);
 assert.deepEqual(setMonthlyBudget(updated,'2026-10',0).settings.monthlyBudgets,{});
 assert.throws(()=>setMonthlyBudget(initial,'2026-13',100));
 assert.throws(()=>setMonthlyBudget(initial,'2026-10',-20));
 const corrupt=structuredClone(updated);corrupt.settings.monthlyBudgets['2026-10']=-1;assert.throws(()=>validateData(corrupt));
});
test('dev17 monthly reflection is deterministic and never recommends a bet',()=>{
 const r=monthReview(fixture(),'2026-10');assert.equal(r.days,2);assert.equal(r.totals.pendingCount,1);
 assert.ok(r.warning.includes('未入力'));assert.equal(r.totals.profit,1040);
});

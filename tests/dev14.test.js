import test from 'node:test';
import assert from 'node:assert/strict';
import {dayLedger,existingPurchaseDuplicates,periodInsights} from '../day-ledger.js';
import {growthRewards} from '../growth-rewards.js';

function fixture(){
 const races=[{id:'a',date:'2026-10-17',venue:'東京',number:8,name:''},{id:'b',date:'2026-10-17',venue:'京都',number:10,name:''},{id:'c',date:'2026-10-18',venue:'東京',number:8,name:''}];
 const tickets=[{id:'ta',raceId:'a',type:'馬連'},{id:'tb',raceId:'b',type:'複勝'},{id:'tc',raceId:'c',type:'馬連'}];
 const lines=[
  {id:'l1',ticketId:'ta',numbers:[1,2],stake:100,status:'settled',payout:500,refund:0},
  {id:'l2',ticketId:'tb',numbers:[3],stake:300,status:'settled',payout:0,refund:0},
  {id:'l3',ticketId:'tc',numbers:[1,2],stake:100,status:'settled',payout:0,refund:0}
 ];
 return {races,tickets,lines,character:{exp:50,level:1,stage:1},growthV2:{bond:10,learned:['単勝','複勝','馬連','三連複']}};
}
test('dev12 day summaries use settled accounting and retain records',()=>{
 const d=fixture(),before=JSON.stringify(d),day=dayLedger(d,'2026-10-17');
 assert.equal(day.raceCount,2);assert.equal(day.summary.purchase,400);assert.equal(day.summary.payout,500);assert.equal(day.summary.profit,100);
 assert.equal(day.entries[0].tickets.length,1);assert.equal(JSON.stringify(d),before);
 assert.throws(()=>dayLedger(d,'2026-13-01'));
});
test('dev12 duplicates only within same date venue race and canonical type-number',()=>{
 const d=fixture();
 assert.equal(existingPurchaseDuplicates(d,{date:'2026-10-17',venue:'東京',number:8},[{type:'馬連',numbers:[2,1]},{type:'単勝',numbers:[1]}]).length,1);
 assert.equal(existingPurchaseDuplicates(d,{date:'2026-10-18',venue:'京都',number:8},[{type:'馬連',numbers:[1,2]}]).length,0);
 assert.equal(existingPurchaseDuplicates(d,d.races[0],[{type:'馬連',numbers:[1,2]}],'ta').length,0);
});
test('dev13 best/worst days and cumulative monthly sums match ledger',()=>{
 const a=periodInsights(fixture());
 assert.equal(a.days,2);assert.equal(a.wins,1);assert.equal(a.losses,1);assert.equal(a.best.date,'2026-10-17');assert.equal(a.worst.date,'2026-10-18');
 assert.equal(a.cumulativeMonths[0].profit,0);assert.equal(a.winDayRate,50);
 const empty=periodInsights({races:[],tickets:[],lines:[]});assert.equal(empty.days,0);assert.equal(empty.winDayRate,null);
});
test('dev14 read-only achievements depend on existing progress and never change EXP',()=>{
 const d=fixture(),original=JSON.stringify(d),rewards=growthRewards(d);
 assert.equal(rewards.length,5);assert.deepEqual(rewards.filter(r=>r.unlocked).map(r=>r.id),['sprout','friend','scholar']);
 assert.equal(rewards.find(r=>r.id==='diary').progress,20);
 assert.equal(JSON.stringify(d),original);
});

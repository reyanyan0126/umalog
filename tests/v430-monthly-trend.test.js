import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyData} from '../core.js';
import {monthlyCashTrend} from '../monthly-cash-trend.js';
const entry=(id,date,stake,payout,venue=null,type=null)=>({id,date,stake,payout,refund:0,venue,type,number:null,name:'',memo:'',status:'settled'});
test('monthly trend includes empty months without inventing return rates',()=>{
 const d=emptyData();d.simpleEntries=[entry('a','2026-08-01',1000,0),entry('b','2026-10-01',500,2000)];
 const rows=monthlyCashTrend(d,{months:3,through:'2026-10'});
 assert.deepEqual(rows.map(r=>r.month),['2026-08','2026-09','2026-10']);
 assert.deepEqual(rows.map(r=>r.profit),[-1000,0,1500]);
 assert.deepEqual(rows.map(r=>r.cumulative),[-1000,-1000,500]);
 assert.equal(rows[1].returnRate,null);
});
test('monthly trend respects venue and ticket type filters',()=>{
 const d=emptyData();d.simpleEntries=[entry('a','2026-10-01',1000,2000,'東京','単勝'),entry('b','2026-10-02',3000,0,'札幌','複勝')];
 const rows=monthlyCashTrend(d,{months:1,through:'2026-10',venue:'東京',type:'単勝'});
 assert.equal(rows[0].purchase,1000);assert.equal(rows[0].profit,1000);
});
test('monthly trend rejects invalid time windows',()=>{
 const d=emptyData();
 assert.throws(()=>monthlyCashTrend(d,{months:0}),/表示月数/);
 assert.throws(()=>monthlyCashTrend(d,{through:'2026-13'}),/集計終了月/);
});

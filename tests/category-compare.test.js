import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyData,validateData} from '../core.js';
import {makeSimpleEntry,quickBreakdown} from '../simple-ledger.js';
import {compareCategories} from '../category-compare.js';

const entry=(id,date,stake,venue,type,status,payout=0)=>makeSimpleEntry({date,stake,venue,type,status,payout,refund:0,name:'',memo:'',number:''},id);
function sample(){
 const data=emptyData();
 data.races=[
  {id:'tokyo',date:'2026-09-22',venue:'東京',number:11,name:'九月'},
  {id:'kyoto',date:'2026-10-19',venue:'京都',number:11,name:'十月'}
 ];
 data.tickets=[
  {id:'t1',raceId:'tokyo',type:'単勝',kind:'reported',memo:'',createdAt:'2026-09-22T00:00:00Z'},
  {id:'t2',raceId:'kyoto',type:'ワイド',kind:'reported',memo:'',createdAt:'2026-10-19T00:00:00Z'}
 ];
 data.lines=[
  {id:'l1',ticketId:'t1',numbers:[1],stake:1000,status:'settled',payout:1000,refund:0},
  {id:'l2',ticketId:'t2',numbers:[1,2],stake:500,status:'pending',payout:0,refund:0}
 ];
 data.simpleEntries=[
  entry('a','2026-09-22',1000,'東京','単勝','settled'),
  entry('b','2026-10-19',1000,'京都','ワイド','settled',4000),
  entry('c','2026-10-20',2000,'中山','複勝','pending'),
  entry('unknown','2026-10-20',1000,null,null,'pending')
 ];
 validateData(data);
 return data;
}

test('comparison uses recorded settlement counts and keeps pending-only rates unavailable',()=>{
 const d=sample(),before=JSON.stringify(d);
 const rows=compareCategories(d,{axis:'venue'}),list=rows.rows;
 assert.deepEqual(list.map(x=>x.label),['東京','京都','中山']);
 assert.deepEqual(list.map(x=>[x.count,x.settledCount,x.pendingCount]),[[2,2,0],[2,1,1],[1,0,1]]);
 assert.equal(list[0].profit,-1000);assert.equal(list[0].returnRate,50);
 assert.equal(list[1].profit,3000);assert.equal(list[1].returnRate,400);
 assert.equal(list[2].returnRate,null);assert.equal(list[2].settledPurchase,0);
 assert.equal(rows.unknown.count,1);assert.equal(rows.unknown.recordedPurchase,1000);
 assert.equal(rows.lowSampleCount,3);
 assert.deepEqual(quickBreakdown(d,{dimension:'venue'}).filter(x=>x.label==='京都').map(x=>[x.settledCount,x.pendingCount]),[[1,1]]);
 assert.equal(JSON.stringify(d),before,'comparison must not modify ledger');
});
test('profit / ROI sorting is deterministic, excludes unknown, and filters scope',()=>{
 const d=sample();
 assert.deepEqual(compareCategories(d,{axis:'venue',sort:'profit'}).rows.map(x=>x.label),['京都','東京','中山']);
 assert.deepEqual(compareCategories(d,{axis:'venue',sort:'returnRate'}).rows.map(x=>x.label),['京都','東京','中山']);
 assert.deepEqual(compareCategories(d,{axis:'type'}).rows.map(x=>x.label),['単勝','ワイド','複勝']);
 assert.deepEqual(compareCategories(d,{axis:'venue',prefix:'2026-09'}).rows.map(x=>x.label),['東京']);
 assert.deepEqual(compareCategories(d,{axis:'venue',venue:'京都'}).rows.map(x=>x.label),['京都']);
 assert.deepEqual(compareCategories(d,{axis:'venue',type:'ワイド'}).rows.map(x=>x.label),['京都']);
 assert.deepEqual(compareCategories(d,{axis:'type',venue:'東京'}).rows.map(x=>x.label),['単勝']);
 assert.deepEqual(compareCategories(d,{axis:'venue',prefix:'2027'}).rows,[]);
 assert.equal(compareCategories(d,{axis:'venue',prefix:'2027'}).unknown,null);
 assert.throws(()=>compareCategories(d,{axis:'other'}),/比較対象/);
 assert.throws(()=>compareCategories(d,{sort:'optimistic'}),/並び替え/);
});

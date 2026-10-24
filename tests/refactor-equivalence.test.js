import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import * as actual from '../cash-projections.js';
import {summarize as oldSummarize,emptyData} from '../core.js';
import {cashFinance as combinedFinance,makeSimpleEntry} from '../simple-ledger.js';
import {analysisCoverage as oldAnalysisCoverage,inclusiveMonthlyRows as oldInclusiveMonthlyRows} from '../analysis-quality.js';
import {compareCategories as oldCompareCategories} from '../category-compare.js';
// Frozen v2.8.0 implementation, independently read from the baseline fixture.
const source=readFileSync(new URL('./fixtures/v280-cash-projections.txt',import.meta.url),'utf8');
const baseline=vm.runInNewContext(source+';({summarize,aggregate,analysisCoverage,inclusiveMonthlyRows,compareCategories})',{oldSummarize,combinedFinance,oldAnalysisCoverage,oldInclusiveMonthlyRows,oldCompareCategories});
const json=x=>JSON.parse(JSON.stringify(x));
for(const size of [0,1,10,100])test(`v2.8.0 differential cash projections: ${size} mixed records`,()=>{
 const d=emptyData();d.simpleEntries=[];
 for(let i=0;i<size;i++){
  const date=`2026-${String(1+i%12).padStart(2,'0')}-01`,venue=i%2?'門別':'東京';
  d.races.push({id:'r'+i,date,venue,number:1,name:''});
  d.tickets.push({id:'t'+i,raceId:'r'+i,type:i%2?'単勝':'ワイド',kind:'reported',memo:'',createdAt:date+'T00:00:00Z'});
  d.lines.push({id:'l'+i,ticketId:'t'+i,numbers:i%2?[1]:[1,2],stake:1000,status:['pending','settled','void'][i%3],payout:i%3===1?1700:0,refund:i%3===2?1000:0});
  d.simpleEntries.push(makeSimpleEntry({date,venue,stake:500,payout:i%2?800:0},'q'+i));
 }
 const before=JSON.stringify(d);
 for(const name of Object.keys(actual)){
  const args=name==='summarize'?[d.lines,d.races,d.tickets]:[d];
  assert.deepEqual(json(actual[name](...args)),json(baseline[name](...args)),name);
  if(['analysisCoverage','inclusiveMonthlyRows','compareCategories'].includes(name))for(const opts of [{venue:'門別'},{type:'ワイド'},{prefix:'2026-01',sort:'profit'},{sort:'returnRate'}])assert.deepEqual(json(actual[name](d,opts)),json(baseline[name](d,opts)),name+JSON.stringify(opts));
 }
 assert.equal(JSON.stringify(d),before);
});

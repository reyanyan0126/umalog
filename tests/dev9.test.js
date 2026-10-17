import test from 'node:test';
import assert from 'node:assert/strict';
import {candidateOutcome} from '../batch-results.js';
import {reviewBets,generateBets} from '../bet-patterns.js';
const normal={normalConfirmed:true};
test('dev9: unconfirmed, exceptional and corrected results always abstain',()=>{
 for(const type of ['単勝','複勝','枠連','馬連','馬単','ワイド','三連複','三連単']){
  for(const context of [{},...['deadHeat','cancelled','scratched','excluded','refund','corrected'].map(k=>({...normal,[k]:true}))])assert.equal(candidateOutcome(type,[1,2,3],[1,2,3],context),'unknown');
 }
});
test('dev9: place uses starters at sale, not finishers or horse-number range',()=>{
 for(const n of [5,6,7]){assert.equal(candidateOutcome('複勝',[3],[1,2,3],{...normal,startersAtSale:n}),'miss');assert.equal(candidateOutcome('複勝',[2],[1,2,3],{...normal,startersAtSale:n}),'hit');}
 for(const n of [8,18])assert.equal(candidateOutcome('複勝',[3],[1,2,3],{...normal,startersAtSale:n}),'hit');
 for(const n of [undefined,null,0,4,19,7.5,'8'])assert.equal(candidateOutcome('複勝',[3],[1,2,3],{...normal,startersAtSale:n}),'unknown');
});
test('dev9: invalid combinations, frame doubles and missing result are not misses',()=>{
 for(const [type,ns] of [['単勝',[]],['単勝',[19]],['ワイド',[1,1]],['三連単',[1,2]],['枠連',[8,8]]])assert.equal(candidateOutcome(type,ns,[1,2,3],normal),'unknown');
 assert.equal(candidateOutcome('単勝',[1],[1,null,null],normal),'unknown');
});
test('dev9: duplicate review preserves deliberate different-price/method purchases',()=>{
 const lines=[{type:'馬連',numbers:[2,1],stake:100,purchaseMode:'normal'},{type:'馬連',numbers:[1,2],stake:300,purchaseMode:'box'},{type:'馬単',numbers:[1,2],stake:200}];
 const snapshot=JSON.stringify(lines),r=reviewBets(lines);assert.equal(r.total,600);assert.equal(r.count,3);assert.equal(r.duplicates.length,1);assert.equal(r.duplicates[0].count,2);assert.equal(r.duplicates[0].total,400);assert.equal(JSON.stringify(lines),snapshot);
});
test('dev9: review rejects invalid money and range and checks aggregate bounds',()=>{
 for(const stake of [0,99,150,-100,100.5])assert.throws(()=>reviewBets([{type:'単勝',numbers:[1],stake}]));
 assert.throws(()=>reviewBets([{type:'枠連',numbers:[1,9],stake:100}]));
 assert.throws(()=>reviewBets(Array.from({length:2},()=>({type:'単勝',numbers:[1],stake:1e12}))));
});
test('dev9: large repeated formation purchases are reported without removing rows',()=>{
 const bets=generateBets('三連単','formation',{groups:[[1,2,3,4],[1,2,3,4],[1,2,3,4]]});
 assert.equal(new Set(bets.map(x=>x.join(','))).size,bets.length);
 const rows=Array.from({length:10000},(_,i)=>({type:'三連単',numbers:bets[i%bets.length],stake:100}));
 const r=reviewBets(rows);assert.equal(r.total,1000000);assert.equal(r.count,10000);assert.equal(r.duplicates.length,bets.length);
});

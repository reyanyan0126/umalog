import test from 'node:test';
import assert from 'node:assert/strict';
import {selectedStakeUpdate,stakeChanges,stakeSnapshot,restoreStakeSnapshot,purchaseHistoryOverview} from '../stake-workflow.js';
const draft=()=>Array.from({length:4},(_,i)=>({id:'line-'+i,type:'三連単',numbers:[1,i+2,9],stake:100,status:'pending',payout:0,refund:0,purchaseMode:'formation'}));
test('v2 selected bulk only edits chosen rows, independent of other combinations',()=>{
 const previous=draft(),unchanged=JSON.stringify(previous),changed=selectedStakeUpdate(previous,['line-1','line-3'],200);
 assert.deepEqual(changed.map(x=>x.stake),[100,200,100,200]);
 assert.equal(JSON.stringify(previous),unchanged);
 assert.equal(changed[0],previous[0]);assert.equal(changed[2],previous[2]);
 assert.notEqual(changed[1],previous[1]);
 const snapshot=stakeSnapshot(previous);
 const undone=restoreStakeSnapshot(changed,snapshot);
 assert.deepEqual(undone,previous);
 const diff=stakeChanges(previous,changed);
 assert.equal(diff.changed,2);assert.equal(diff.oldTotal,400);assert.equal(diff.newTotal,600);
 assert.equal(diff.difference,200);assert.equal(diff.added,0);assert.equal(diff.removed,0);
 assert.deepEqual(diff.items.map(x=>x.id),['line-1','line-3']);
});
test('v2 selection amount, invalid IDs and refund protection reject atomically',()=>{
 const prior=draft(),orig=JSON.stringify(prior);
 for(const bad of [0,50,150,-100,1.2,NaN,1e13,'invalid']){
  assert.throws(()=>selectedStakeUpdate(prior,['line-1'],bad));
 }
 assert.throws(()=>selectedStakeUpdate(prior,[],200));
 assert.throws(()=>selectedStakeUpdate(prior,['missing'],200));
 assert.throws(()=>selectedStakeUpdate(prior,['line-1','line-1'],200));
 const returned=draft();returned[0].status='void';returned[0].refund=100;
 assert.throws(()=>selectedStakeUpdate(returned,['line-0','line-1'],200));
 assert.equal(JSON.stringify(prior),orig);
 assert.throws(()=>restoreStakeSnapshot(prior,stakeSnapshot(prior).slice(1)));
 assert.throws(()=>restoreStakeSnapshot(prior,[...stakeSnapshot(prior)].reverse()));
});
test('v2 difference summarizes recorded correction including added/removed',()=>{
 const a=draft(),b=a.slice(0,3).concat([{...a[3],id:'new',stake:200}]);
 const diff=stakeChanges(a,b);
 assert.equal(diff.changed,0);assert.equal(diff.added,1);assert.equal(diff.removed,1);
 assert.equal(diff.newTotal,500);
});
test('v2 purchase history distinguishes pending amount from completed profit',()=>{
 const tickets=[{id:'a'},{id:'b'}],list=[{tickets}];
 const lines=new Map([
  ['a',[{stake:100,status:'settled',payout:250,refund:0},{stake:200,status:'pending',payout:0,refund:0}]],
  ['b',[{stake:100,status:'void',payout:0,refund:100}]]
 ]);
 const s=purchaseHistoryOverview(list,lines);
 assert.equal(s.recordedPurchase,400);assert.equal(s.settledPurchase,200);
 assert.equal(s.receipts,350);assert.equal(s.pendingStake,200);assert.equal(s.pendingCount,1);
 assert.equal(s.profit,150);assert.equal(s.hasSettled,true);
 assert.equal(s.raceCount,1);assert.equal(s.ticketCount,2);
 assert.equal(purchaseHistoryOverview([] ,new Map()).hasSettled,false);
});

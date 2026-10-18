import test from 'node:test';
import assert from 'node:assert/strict';
import {setUniformStakes,setIndividualStake,stakeBreakdown,STAKE_PRESETS} from '../stake-allocation.js';

const lines=()=>[
 {id:'a',type:'三連単',numbers:[1,2,3],stake:100,status:'pending',payout:0,refund:0,purchaseMode:'formation'},
 {id:'b',type:'三連単',numbers:[1,2,4],stake:100,status:'pending',payout:0,refund:0,purchaseMode:'formation'},
 {id:'c',type:'三連単',numbers:[2,1,4],stake:100,status:'pending',payout:0,refund:0,purchaseMode:'formation'}
];
test('v1.8.1 all 100 -> only middle 200, all totals and identifiers preserved',()=>{
 const original=lines(),before=JSON.stringify(original);
 const bulk=setUniformStakes(original,100);
 const mixed=setIndividualStake(bulk,1,200);
 assert.deepEqual(mixed.map(l=>l.stake),[100,200,100]);
 assert.equal(stakeBreakdown(mixed).total,400);
 assert.equal(stakeBreakdown(mixed).nonUniform,true);
 assert.deepEqual(mixed.map(l=>l.numbers),original.map(l=>l.numbers));
 assert.deepEqual(mixed[0],original[0]);
 assert.deepEqual(mixed[2],original[2]);
 assert.notEqual(mixed[0],original[0]);
 assert.equal(JSON.stringify(original),before);
 const allAgain=setUniformStakes(mixed,500);
 assert.deepEqual(allAgain.map(l=>l.stake),[500,500,500]);
 assert.equal(stakeBreakdown(allAgain).total,1500);
 assert.equal(stakeBreakdown(allAgain).nonUniform,false);
 assert.deepEqual(STAKE_PRESETS,[100,200,500,1000]);
});
test('v1.8.1 invalid 100-unit amount and overflow are rejected atomically',()=>{
 const ls=lines(),before=JSON.stringify(ls);
 for(const amount of [0,1,50,99,150,201,-100,Infinity,NaN,1e13,'abc']){
  assert.throws(()=>setIndividualStake(ls,0,amount),String(amount));
  assert.throws(()=>setUniformStakes(ls,amount),String(amount));
 }
 assert.throws(()=>setIndividualStake(ls,9,200));
 assert.throws(()=>setIndividualStake(ls,-1,200));
 assert.throws(()=>setUniformStakes([],100));
 const tooLarge=lines();tooLarge[0].stake=1e12;
 assert.throws(()=>setIndividualStake(tooLarge,1,100));
 assert.equal(JSON.stringify(ls),before);
});
test('v1.8.1 prevent contradictory refund edits; settled payout untouched',()=>{
 const ls=lines();
 ls[0]={...ls[0],status:'settled',payout:540,refund:0};
 ls[1]={...ls[1],status:'void',payout:0,refund:100};
 ls[2]={...ls[2],status:'settled',payout:0,refund:100};
 assert.throws(()=>setUniformStakes(ls,200));
 assert.throws(()=>setIndividualStake(ls,1,200));
 assert.throws(()=>setIndividualStake(ls,2,200));
 const edited=setIndividualStake(ls,0,200);
 assert.equal(edited[0].payout,540);
 assert.equal(edited[0].refund,0);
 assert.equal(ls[0].stake,100);
 assert.equal(stakeBreakdown([]).total,0);
});

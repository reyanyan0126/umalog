import test from 'node:test';
import assert from 'node:assert/strict';
import {resultChoice,resultValue} from '../results.js';
const line={stake:500,status:'pending',payout:0,refund:0};
test('simple choices distinguish pending, miss, hit and refund',()=>{
 assert.deepEqual(resultValue(line,'hit',1200),{status:'settled',payout:1200,refund:0});
 assert.deepEqual(resultValue(line,'miss'),{status:'settled',payout:0,refund:0});
 assert.deepEqual(resultValue(line,'pending'),{status:'pending',payout:0,refund:0});
 assert.deepEqual(resultValue(line,'refund'),{status:'void',payout:0,refund:500});
 assert.equal(resultValue(line,'hit',100).payout,100);
 assert.throws(()=>resultValue(line,'hit',0));
 assert.throws(()=>resultValue(line,'hit',NaN));
});
test('legacy partial and full refunds preserve original status and amounts',()=>{
 for(const r of [{status:'settled',payout:800,refund:100},{status:'settled',payout:0,refund:500},{status:'void',payout:0,refund:500}]){
  const l={...line,...r};assert.equal(resultChoice(l),'advanced');assert.deepEqual(resultValue(l,'advanced',l.payout,l.refund,l.status),r);
 }
});
test('advanced mode rejects inconsistent values',()=>{
 assert.throws(()=>resultValue(line,'advanced',1,500,'settled'));
 assert.throws(()=>resultValue(line,'advanced',0,501,'settled'));
 assert.throws(()=>resultValue(line,'advanced',1,0,'pending'));
});
test('all simplified transitions from legacy result states stay schema-compatible',()=>{
 const originals=[line,{...line,status:'settled',payout:1200},{...line,status:'settled'},{...line,status:'void',refund:500},{...line,status:'settled',payout:800,refund:100}];
 for(const original of originals){
  const expected={pending:{status:'pending',payout:0,refund:0},miss:{status:'settled',payout:0,refund:0},hit:{status:'settled',payout:1200,refund:0},refund:{status:'void',payout:0,refund:500}};
  const snapshot=structuredClone(original);
  for(const [choice,value] of Object.entries(expected))assert.deepEqual(resultValue(original,choice,1200),value);
  assert.deepEqual(resultValue(original,'advanced',original.payout,original.refund,original.status),{status:original.status,payout:original.payout,refund:original.refund});
  assert.deepEqual(original,snapshot,'selection must not mutate stored original');
 }
});

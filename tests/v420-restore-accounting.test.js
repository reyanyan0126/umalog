import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyData,validateData} from '../core.js';
import {cashFinance,cashQuickBreakdown} from '../simple-ledger.js';

const quick=(id,stake,payout=0,refund=0)=>({id,date:'2026-10-26',stake,venue:null,number:null,type:null,name:'',memo:'',status:'settled',payout,refund});
test('financial totals remain stable after JSON backup and restore',()=>{
 const data=emptyData();
 data.simpleEntries=[quick('one',1000,2400),quick('two',500,0,500),quick('three',2000)];
 const before=cashFinance(validateData(data));
 const restored=validateData(JSON.parse(JSON.stringify(data)));
 assert.deepEqual(cashFinance(restored),before);
 assert.equal(cashQuickBreakdown(restored).reduce((sum,row)=>sum+row.profit,0),before.profit);
});
test('invalid restored quick-entry refund cannot replace validated accounting data',()=>{
 const original=emptyData();
 original.simpleEntries=[quick('one',1000,1500)];
 const before=JSON.stringify(original);
 const corrupted=JSON.parse(before);
 corrupted.simpleEntries[0].refund=2000;
 assert.throws(()=>validateData(corrupted),/返還金/);
 assert.equal(JSON.stringify(original),before);
});

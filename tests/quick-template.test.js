import test from 'node:test';
import assert from 'node:assert/strict';
import {makeSimpleEntry,recentSimpleTemplates} from '../simple-ledger.js';
const entry=(id,date,stake,venue=null,type=null,status='pending',payout=0)=>
 makeSimpleEntry({date,stake,venue,number:null,type,name:'メモは引き継がない',memo:'秘密メモ',status,payout,refund:0},id);
test('latest reusable distinct amount/venue/type combinations only',()=>{
 const older=entry('old','2026-10-17',1000,'札幌','ワイド','settled',3000);
 const newest=entry('new','2026-10-19',1000,'札幌','ワイド');
 const another=entry('another','2026-10-19',2500,'東京','複勝');
 const original=[older,newest,another],before=JSON.stringify(original);
 assert.deepEqual(recentSimpleTemplates(original,2),[
  {stake:2500,venue:'東京',type:'複勝',sourceDate:'2026-10-19'},
  {stake:1000,venue:'札幌',type:'ワイド',sourceDate:'2026-10-19'}
 ]);
 assert.equal(JSON.stringify(original),before,'original account entries stay unchanged');
 assert.deepEqual(recentSimpleTemplates([],3),[]);
 assert.deepEqual(recentSimpleTemplates(original,0),[]);
});
test('reuse candidate never contains id, settlement, payout, refund, memo, or race number',()=>{
 const result=recentSimpleTemplates([entry('paid','2026-10-18',1200,null,null,'settled',2000)]);
 assert.deepEqual(Object.keys(result[0]).sort(),['sourceDate','stake','type','venue']);
 assert.equal(result[0].stake,1200);
});
test('invalid template input is rejected',()=>{
 assert.throws(()=>recentSimpleTemplates([entry('id','2026-10-19',1000)],11));
});

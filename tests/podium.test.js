import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyData,validateData,validatePodium,aggregate} from '../core.js';

test('top-three labels are optional, ordered and never imply a payout',()=>{
 assert.deepEqual(validatePodium(['3','4','5']),[3,4,5]);
 assert.deepEqual(validatePodium(['','','']),[null,null,null]);
 assert.deepEqual(validatePodium(['2','','']),[2,null,null]);
 for(const invalid of [['3','3','5'],['','2','3'],['0','2','3'],['19','2','3'],['abc','2','3'],[1,2]])assert.throws(()=>validatePodium(invalid));
 const data=emptyData();
 data.races=[{id:'r',date:'2026-10-17',venue:'東京',number:11,name:'合成レース',podium:[3,4,5]}];
 data.tickets=[{id:'t',raceId:'r',type:'三連単',kind:'reported',memo:'',createdAt:'2026-10-17T01:00:00Z'}];
 data.lines=[{id:'l',ticketId:'t',numbers:[3,4,5],stake:500,status:'pending',payout:0,refund:0}];
 const verified=validateData(data),stats=aggregate(verified);
 assert.equal(stats.pendingStake,500);
 assert.equal(stats.settledCount,0);
 assert.equal(stats.profit,0);
 assert.equal(stats.lineRate,null);
 verified.lines[0].status='settled';
 verified.lines[0].payout=3200;
 assert.equal(aggregate(verified).profit,2700);
 verified.races[0].podium=[3,3,5];assert.throws(()=>validateData(verified));
});

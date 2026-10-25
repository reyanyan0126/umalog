import test from 'node:test';
import assert from 'node:assert/strict';
import {buildPersonalAnalytics} from '../personal-analytics.js';
test('offline analytics separates paid, missed, pending and voided tickets',()=>{
 const source={races:[{id:'r',venue:'京都'}],tickets:[{id:'t',raceId:'r',type:'三連複',aiImport:{metadata:{'芝・ダート':'芝','距離':'1800m','出走頭数':'11'}}}],lines:[
 {ticketId:'t',status:'settled',stake:100,payout:2160,refund:0},
 {ticketId:'t',status:'settled',stake:200,payout:0,refund:0},
 {ticketId:'t',status:'pending',stake:100,payout:null,refund:0},
 {ticketId:'t',status:'void',stake:100,payout:0,refund:100}
 ]};
 const result=buildPersonalAnalytics(source);
 assert.deepEqual(result.overall,{stake:300,payout:2160,refund:0,lines:2,hits:1,pending:1});
 assert.equal(result.rows.find(x=>x.axis==='競馬場').profit,1860);
 assert.equal(result.rows.find(x=>x.axis==='距離').key,'1800m');
 assert.ok(result.notes.some(x=>x.includes('未確定')));
});
test('no false confidence on sparse data',()=>{
 const result=buildPersonalAnalytics({races:[{id:'r',venue:'東京'}],tickets:[{id:'t',raceId:'r',type:'単勝'}],lines:[{ticketId:'t',status:'settled',stake:100,payout:0,refund:0}]});
 assert.equal(result.best,null);
 assert.ok(result.notes.some(x=>x.includes('10点未満')));
});

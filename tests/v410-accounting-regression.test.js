import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyData, summarize, validateData} from '../core.js';
import {cashFinance} from '../simple-ledger.js';
import {summarize as cashSummarize} from '../cash-projections.js';

const base=()=>emptyData();
const quick=(id,stake,payout=0,refund=0,status='settled')=>({
  id,date:'2026-10-26',stake,venue:null,number:null,type:null,name:'',memo:'',status,payout,refund
});
const line=(id,stake,payout=0,refund=0,status='settled')=>({
  id,ticketId:'t1',numbers:[id],stake,payout,refund,status
});

test('cash accounting: losing, winning, refunded and legacy pending quick entries',()=>{
 const data=base();
 data.simpleEntries=[
  quick('loss',1000),
  quick('win',2000,4500),
  quick('refund',500,0,500),
  quick('legacy',300,0,0,'pending')
 ];
 const x=cashFinance(data);
 assert.equal(x.recordedPurchase,3800);
 assert.equal(x.receipts,5000);
 assert.equal(x.profit,1200);
 assert.equal(x.returnRate,5000/3800*100);
 assert.equal(x.pendingCount,0);
 assert.equal(x.simpleCount,4);
});

test('cash accounting: date and venue filters do not silently count unmatched quick entries',()=>{
 const data=base();
 data.simpleEntries=[quick('a',1000,1500),{...quick('b',2000,0),date:'2025-12-31',venue:'札幌'}];
 assert.equal(cashFinance(data,{prefix:'2026'}).recordedPurchase,1000);
 assert.equal(cashFinance(data,{venue:'札幌'}).recordedPurchase,2000);
 assert.equal(cashFinance(data,{prefix:'2026',venue:'札幌'}).recordedPurchase,0);
});

test('cash projection: legacy pending detailed stake is an expense immediately',()=>{
 const lines=[line(1,1000,0,0,'pending'),line(2,2000,5000)];
 const x=cashSummarize(lines);
 assert.equal(x.purchase,3000);
 assert.equal(x.payout,5000);
 assert.equal(x.profit,2000);
 assert.equal(x.returnRate,5000/3000*100);
 assert.equal(x.pendingCount,0);
 assert.equal(x.settledCount,2);
});

test('legacy settled-only core summary remains distinct from cash projection',()=>{
 const lines=[line(1,1000,0,0,'pending'),line(2,2000,5000)];
 assert.equal(summarize(lines).purchase,2000);
 assert.equal(cashSummarize(lines).purchase,3000);
});

test('invalid refund above stake cannot pass backup validation',()=>{
 const data=base();
 data.simpleEntries=[quick('bad',1000,0,1001)];
 assert.throws(()=>validateData(data),/返還金/);
});

test('full refund and payout cannot coexist in one simple entry',()=>{
 const data=base();
 data.simpleEntries=[quick('bad',1000,100,1000)];
 assert.throws(()=>validateData(data),/全額返還/);
});

test('race-level hit rate counts one winning race once even with multiple winning tickets',()=>{
 const races=[{id:'r1'},{id:'r2'}];
 const tickets=[
  {id:'t1',raceId:'r1'},{id:'t2',raceId:'r1'},{id:'t3',raceId:'r2'}
 ];
 const lines=[
  {ticketId:'t1',stake:100,payout:200,refund:0,status:'settled'},
  {ticketId:'t2',stake:100,payout:300,refund:0,status:'settled'},
  {ticketId:'t3',stake:100,payout:0,refund:0,status:'settled'}
 ];
 const x=summarize(lines,races,tickets);
 assert.equal(x.raceCount,2);
 assert.equal(x.raceHits,1);
 assert.equal(x.raceRate,50);
 assert.equal(x.lineHits,2);
});

test('fully refunded race is excluded from the race hit denominator',()=>{
 const races=[{id:'r1'}],tickets=[{id:'t1',raceId:'r1'}];
 const lines=[{ticketId:'t1',stake:100,payout:0,refund:100,status:'void'}];
 const x=summarize(lines,races,tickets);
 assert.equal(x.raceCount,0);
 assert.equal(x.raceRate,null);
 assert.equal(x.lineCount,0);
});

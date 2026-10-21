import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyData} from '../core.js';
import {homeSummary,calendarMetricValue} from '../screen-roles.js';

test('legacy pending purchases count as home expenses',()=>{
 const d=emptyData();
 d.races=[{id:'r1',date:'2026-10-04',venue:'東京',number:1,name:''}];
 d.tickets=[{id:'t1',raceId:'r1',type:'単勝',kind:'reported',memo:'',createdAt:'2026-10-04T00:00:00Z'}];
 d.lines=[{id:'l1',ticketId:'t1',numbers:[1],stake:500,status:'pending',payout:0,refund:0}];
 const result=homeSummary(d,'2026-10');
 assert.equal(result.purchase,500);
 assert.equal(result.profit,-500);
 assert.equal(result.pendingCount,0);
});

test('calendar shows expense for legacy pending record',()=>{
 assert.equal(calendarMetricValue({purchase:0,pendingStake:500,payout:0,refund:0,settledCount:0,pendingCount:1}),-500);
});

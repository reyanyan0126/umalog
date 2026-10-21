import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyData} from '../core.js';
import {monthReview} from '../ledger-tools.js';

test('monthly review uses full stake as expense and return rate denominator',()=>{
 const d=emptyData();
 d.races=[{id:'r1',date:'2026-10-04',venue:'東京',number:1,name:''}];
 d.tickets=[{id:'t1',raceId:'r1',type:'単勝',kind:'reported',memo:'',createdAt:'2026-10-04T00:00:00Z'}];
 d.lines=[{id:'l1',ticketId:'t1',numbers:[1],stake:500,status:'pending',payout:0,refund:0}];
 const review=monthReview(d,'2026-10');
 assert.equal(review.totals.purchase,500);
 assert.equal(review.totals.profit,-500);
 assert.equal(review.totals.returnRate,0);
});

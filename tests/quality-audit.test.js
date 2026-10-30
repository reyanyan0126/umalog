import test from 'node:test';
import assert from 'node:assert/strict';
import {validateData,aggregate} from '../core.js';
import {cashFinance,cashQuickBreakdown,combinedFinance} from '../simple-ledger.js';
import {inclusiveMonthlyRows} from '../cash-projections.js';
import {ledgerMonth} from '../ledger-calendar.js';
import {monthlyCashTrend} from '../monthly-cash-trend.js';
import {qualityLedger} from './fixtures/quality-ledger.js';

test('date-filtered monthly analysis never widens scope to the whole month',()=>{
 const d=qualityLedger(100);
 const rows=inclusiveMonthlyRows(d,{prefix:'2026-01-03'});
 assert.equal(rows.length,1);
 assert.equal(rows[0].recordedPurchase,cashFinance(d,{prefix:'2026-01-03'}).recordedPurchase);
});
test('mixed simple/detailed calendar rates use the same purchase and receipts',()=>{
 const d=qualityLedger(2);d.simpleEntries[0].date=d.races[0].date;d.simpleEntries[0].payout=400;
 const f=cashFinance(d),s=ledgerMonth(d,[],'2026-01').days[0].summary;
 assert.equal(s.purchase,f.recordedPurchase);assert.equal(s.profit,f.profit);assert.equal(s.returnRate,f.returnRate);
});
for(const count of [0,100,1000,10000])test(`cash totals reconcile by day/month/year/category for ${count} synthetic records`,()=>{
 const d=validateData(qualityLedger(count)),before=JSON.stringify(d),total=cashFinance(d);
 for(const dimension of ['date','venue','type']){
  const rows=cashQuickBreakdown(d,{dimension});
  assert.equal(rows.reduce((s,r)=>s+r.recordedPurchase,0),total.recordedPurchase);
  assert.equal(rows.reduce((s,r)=>s+r.receipts,0),total.receipts);
  assert.equal(rows.reduce((s,r)=>s+r.profit,0),total.profit);
 }
 const months=inclusiveMonthlyRows(d,{prefix:'2026',limit:12});
 assert.equal(months.reduce((s,r)=>s+r.profit,0),total.profit);
 const trend=monthlyCashTrend(d,{months:12,through:'2026-12'});
 assert.equal(trend.reduce((s,r)=>s+r.purchase,0),total.recordedPurchase);
 for(const month of months){
  const days=ledgerMonth(d,[],month.month).days;
  assert.equal(days.reduce((s,r)=>s+(r.summary?.profit||0),0),month.profit);
 }
 const settled=combinedFinance(d);assert.equal(settled.profit,total.profit+settled.pendingStake);
 assert.equal(aggregate(d).pendingStake,d.lines.filter(x=>x.status==='pending').length*100);
 assert.equal(JSON.stringify(d),before);
});

test('year boundary, partial/full refunds and multiple tickets preserve both accounting modes',()=>{
 const d=qualityLedger(8);
 for(const r of d.races)r.date=r.id==='r0'?'2025-12-31':'2026-01-01';
 // Existing paid tickets may share one race. They remain separate purchases.
 const target=d.races.find(r=>r.id==='r2');d.tickets.find(t=>t.id==='t4').raceId=target.id;
 d.races=d.races.filter(r=>r.id!=='r4');
 d.lines.find(l=>l.id==='l2').refund=50;d.lines.find(l=>l.id==='l2').payout=120;
 d.lines.find(l=>l.id==='l4').refund=100;d.lines.find(l=>l.id==='l4').payout=0;
 for(const e of d.simpleEntries)e.date='2026-01-01';
 validateData(d);
 const total=cashFinance(d),previous=cashFinance(d,{prefix:'2025'}),current=cashFinance(d,{prefix:'2026'});
 assert.equal(previous.recordedPurchase,100);assert.equal(previous.profit,-100);
 assert.equal(current.recordedPurchase,700);assert.equal(total.profit,previous.profit+current.profit);
 assert.equal(combinedFinance(d,{prefix:'2025'}).profit,0);
 assert.equal(combinedFinance(d,{prefix:'2025'}).pendingStake,100);
 assert.equal(inclusiveMonthlyRows(d,{prefix:'2025-12-31'})[0].recordedPurchase,100);
 assert.equal(ledgerMonth(d,[],'2026-01').days[0].summary.profit,current.profit);
});

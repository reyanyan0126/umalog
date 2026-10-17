import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyData} from '../core.js';
import {ledgerMonth,smallMoney} from '../ledger-calendar.js';

const fixture=()=>{const d=emptyData();d.races=[{id:'race1',date:'2026-10-17',venue:'東京',number:11,name:'架空レース'}, {id:'race2',date:'2026-10-18',venue:'京都',number:11,name:'別の架空レース'}];
 d.tickets=[{id:'ticket1',raceId:'race1',type:'単勝',createdAt:'2026-10-17T00:00:00Z'}, {id:'ticket2',raceId:'race2',type:'ワイド',createdAt:'2026-10-18T00:00:00Z'}];
 d.lines=[{ticketId:'ticket1',status:'settled',stake:100,payout:500,refund:0},{ticketId:'ticket1',status:'pending',stake:500,payout:0,refund:0},{ticketId:'ticket1',status:'void',stake:100,payout:0,refund:100},{ticketId:'ticket2',status:'settled',stake:100,payout:0,refund:0}];return d;};
const event=(date,name,key)=>({date,name,key,grade:'GⅠ',status:'planned',approval:'pending'});

test('calendar month has Sunday-first offset and true number of days',()=>{
 const m=ledgerMonth(emptyData(),[],'2026-10');
 assert.equal(m.offset,4);assert.equal(m.days.length,31);
 assert.equal(ledgerMonth(emptyData(),[],'2026-02').offset,0);
 assert.equal(ledgerMonth(emptyData(),[],'2026-02').days.length,28);
 assert.equal(ledgerMonth(emptyData(),[],'2028-02').days.length,29);
 assert.throws(()=>ledgerMonth(emptyData(),[],'2026-13'));
});

test('separate days, confirmed net profit, refunds, and pending stake exactly',()=>{
 const d=fixture(),before=structuredClone(d);
 const m=ledgerMonth(d,[],'2026-10'),one=m.days[16],two=m.days[17];
 assert.equal(one.summary.profit,400);
 assert.equal(one.summary.purchase,200);assert.equal(one.summary.payout,500);
 assert.equal(one.summary.refund,100);assert.equal(one.summary.pendingCount,1);
 assert.equal(one.summary.pendingStake,500);assert.equal(one.tickets.length,1);
 assert.equal(two.summary.profit,-100);
 assert.equal(m.days[0].summary,null);assert.deepEqual(d,before);
});

test('pending-only is not displayed as zero profit; full refund is settled zero',()=>{
 const d=fixture();d.lines=d.lines.filter(l=>l.ticketId==='ticket1'&&l.status==='pending');
 assert.equal(ledgerMonth(d,[],'2026-10').days[16].summary.settledCount,0);
 const r=fixture();r.lines=r.lines.filter(l=>l.status==='void');
 const s=ledgerMonth(r,[],'2026-10').days[16].summary;
 assert.equal(s.settledCount,1);assert.equal(s.profit,0);
});

test('multiple graded races remain accessible on the same day without truncation',()=>{
 const events=[event('2026-10-18','架空GⅠ','a'),event('2026-10-18','架空J・GⅡ','b'),event('2026-11-01','他月','c')];
 const m=ledgerMonth(emptyData(),events,'2026-10');
 assert.equal(m.days[17].events.length,2);assert.equal(m.days.reduce((s,r)=>s+r.events.length,0),2);
});

test('compact number is only a display value; exact result stays in summary',()=>{
 assert.equal(smallMoney(0),'0');
 assert.equal(smallMoney(999),'+999');
 assert.equal(smallMoney(-1200),'−1.2千');
 assert.equal(smallMoney(1000),'+1千');
 assert.equal(smallMoney(9999),'+9.9千');
 assert.equal(smallMoney(10000),'+1万');
 assert.equal(smallMoney(10000000),'+0.1億');
 assert.equal(smallMoney(100000000),'+1億');
 assert.equal(smallMoney(12345),'+1.2万');
 assert.equal(smallMoney(-1500000),'−150万');
});

test('confirmed Japanese holidays: substitute and bridge dates; unsupported years are not fabricated',async()=>{
 const {japaneseHolidayName,HOLIDAY_YEARS}=await import('../jp-holidays.js');
 assert.deepEqual(HOLIDAY_YEARS,[2026,2027]);
 assert.equal(japaneseHolidayName('2026-05-06'),'振替休日');
 assert.equal(japaneseHolidayName('2026-09-22'),'国民の休日');
 assert.equal(japaneseHolidayName('2026-10-12'),'スポーツの日');
 assert.equal(japaneseHolidayName('2027-03-21'),'春分の日');
 assert.equal(japaneseHolidayName('2027-03-22'),'振替休日');
 assert.equal(japaneseHolidayName('2027-01-11'),'成人の日');
 assert.equal(japaneseHolidayName('2026-10-17'),null);
 assert.equal(japaneseHolidayName('2028-03-20'),null);
 assert.equal(ledgerMonth(emptyData(),[],'2027-03').days[21].holiday,'振替休日');
});

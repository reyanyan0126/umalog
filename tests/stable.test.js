import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyData} from '../core.js';
import {ledgerInsights,monthlyTrend} from '../ledger-trends.js';
import {companionState,stageArtwork} from '../growth-companion.js';
function fixture(){
 const d=emptyData();d.growthV2={version:2,legacyExp:0,dayExp:0,careExp:0,bond:35,lastDay:'2026-10-18',careDay:'2026-10-18',careCount:1,learned:[],reviewWeeks:[],reviewExp:0,clockWarning:false};
 d.races=[{id:'r1',date:'2026-09-12',venue:'東京',number:8},{id:'r2',date:'2026-10-18',venue:'京都',number:9}];
 d.tickets=[{id:'t1',raceId:'r1',type:'ワイド'},{id:'t2',raceId:'r2',type:'複勝'}];
 d.lines=[{id:'l1',ticketId:'t1',numbers:[1,2],status:'settled',stake:100,payout:250,refund:0},{id:'l2',ticketId:'t2',numbers:[3],status:'pending',stake:200,payout:0,refund:0}];return d;
}
test('dev34 trend splits confirmed, pending, and receipt by month, remains read-only',()=>{
 const d=fixture(),before=JSON.stringify(d),trends=monthlyTrend(d,2);
 assert.deepEqual(trends.map(t=>t.month),['2026-09','2026-10']);
 assert.deepEqual(trends.map(t=>[t.purchase,t.receipts,t.profit,t.pending]),[[100,250,150,0],[0,0,0,200]]);
 const note=ledgerInsights(d,2);assert.ok(note.lines.some(x=>x.includes('200円')));
 assert.ok(note.minimumSample);assert.equal(JSON.stringify(d),before);
});
test('dev35 companion art and mood depend only on stage, care and bond',()=>{
 const d=fixture(),snapshot=JSON.stringify(d);
 assert.equal(companionState(d,'2026-10-18').id,'friend');
 assert.equal(companionState(d,'2026-10-18').remaining,2);
 assert.equal(stageArtwork(0),'./assets/companion-0.svg');
 assert.equal(stageArtwork(4),'./assets/companion-4.svg');
 assert.throws(()=>stageArtwork(-1));
 d.lines[0].payout=1000000;d.lines[0].stake=100;
 assert.equal(companionState(d,'2026-10-18').id,'friend');
 assert.notEqual(JSON.stringify(d),snapshot);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyData} from '../core.js';
import {recentPurchaseTemplates,copyPurchaseTemplate} from '../bet-patterns.js';

test('v1.4: recent ticket shortcut is read-only and resets payouts/results',()=>{
 const d=emptyData();d.races.push({id:'r',date:'2026-10-04',venue:'札幌',number:7,name:'old'});
 d.tickets.push({id:'t',raceId:'r',type:'ワイド',kind:'reported',memo:'',createdAt:'2026-10-04T05:00:00Z'});
 d.lines.push({id:'a',ticketId:'t',numbers:[1,2],stake:100,purchaseMode:'box',status:'settled',payout:640,refund:0});
 d.lines.push({id:'b',ticketId:'t',numbers:[1,3],stake:200,purchaseMode:'normal',status:'settled',payout:0,refund:0});
 const before=JSON.stringify(d),templates=recentPurchaseTemplates(d);
 assert.equal(templates.length,1);assert.equal(templates[0].total,300);
 let i=0;const copied=copyPurchaseTemplate(templates[0],()=>String(++i));
 assert.deepEqual(copied.map(l=>[l.id,l.stake,l.status,l.payout,l.refund]),[['1',100,'pending',0,0],['2',200,'pending',0,0]]);
 copied[0].numbers[0]=9;assert.equal(d.lines[0].numbers[0],1);
 assert.equal(JSON.stringify(d),before);
 assert.equal(recentPurchaseTemplates({...d,lines:Array.from({length:201},(_,j)=>({...d.lines[0],id:String(j)}))}).length,0);
 assert.throws(()=>copyPurchaseTemplate({...templates[0],type:'馬連',lines:[{numbers:[2,2],stake:100}]}));
});
test('v1.4: skips empty/unlinked tickets and selects most recent',()=>{
 const d=emptyData();d.races=[{id:'r1',date:'2026-10-01'},{id:'r2',date:'2026-10-03'}];
 d.tickets=[{id:'t1',raceId:'r1',type:'単勝',createdAt:'2026-10-01T00:00:00Z'},{id:'t2',raceId:'r2',type:'単勝',createdAt:'2026-10-03T00:00:00Z'},{id:'empty',raceId:'r2',type:'単勝',createdAt:'2026-10-04T00:00:00Z'}];
 d.lines=[{id:'a',ticketId:'t1',numbers:[1],stake:100},{id:'b',ticketId:'t2',numbers:[2],stake:100}];
 assert.deepEqual(recentPurchaseTemplates(d).map(t=>t.id),['t2','t1']);
});

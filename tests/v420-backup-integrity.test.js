import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyData,validateData,removeTicket,backupFreshness,backupFileName} from '../core.js';

function ledger(){
 const d=emptyData();
 d.races=[{id:'race1',date:'2026-10-26',venue:'東京',number:11,name:'テスト'}];
 d.tickets=[{id:'ticket1',raceId:'race1',type:'単勝',kind:'reported',memo:'',createdAt:'2026-10-26T00:00:00.000Z'}];
 d.lines=[{id:'line1',ticketId:'ticket1',numbers:[1],stake:1000,payout:2300,refund:0,status:'settled'}];
 d.simpleEntries=[{id:'quick1',date:'2026-10-26',stake:500,venue:null,number:null,type:null,name:'',memo:'',status:'settled',payout:0,refund:0}];
 return d;
}
test('JSON backup round-trip preserves detailed and quick financial records',()=>{
 const original=validateData(ledger());
 const exported=JSON.stringify(original);
 const restored=validateData(JSON.parse(exported));
 assert.deepEqual(restored.races,original.races);
 assert.deepEqual(restored.tickets,original.tickets);
 assert.deepEqual(restored.lines,original.lines);
 assert.deepEqual(restored.simpleEntries,original.simpleEntries);
 assert.equal(restored.lines[0].payout,2300);
});
test('invalid backup does not mutate the existing in-memory ledger',()=>{
 const original=validateData(ledger());
 const before=JSON.stringify(original);
 const corrupted=JSON.parse(before);
 corrupted.lines[0].refund=corrupted.lines[0].stake+1;
 assert.throws(()=>validateData(corrupted),/返還額/);
 assert.equal(JSON.stringify(original),before);
});
test('deleting a detailed ticket removes its orphaned race but preserves quick entries',()=>{
 const data=validateData(ledger());
 removeTicket(data,'ticket1');
 assert.equal(data.races.length,0);
 assert.equal(data.tickets.length,0);
 assert.equal(data.lines.length,0);
 assert.equal(data.simpleEntries.length,1);
 assert.equal(data.simpleEntries[0].stake,500);
 assert.doesNotThrow(()=>validateData(data));
});
test('backup freshness detects an export older than the last ledger save',()=>{
 assert.equal(backupFreshness('2026-10-25T10:00:00Z','2026-10-26T10:00:00Z').kind,'outdated');
 assert.equal(backupFreshness(null,'2026-10-26T10:00:00Z').kind,'missing');
});
test('backup filenames include Japan-local date and time',()=>{
 assert.equal(backupFileName(new Date('2026-10-25T15:01:02.123Z')),'umalog-backup-2026-10-26_00-01-02.123.json');
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {validateEntryDraft} from '../entry-drafts.js';

const draft=()=>({
 version:1,key:'new',race:{date:'2026-10-26',venue:'東京',number:'11',name:'テスト'},
 lines:[],fields:Object.fromEntries(['type','mode','numbers','stake','duplicate','memo','saveNextRace','allowUnfinished'].map(k=>[k,''])),
 updatedAt:'2026-10-26T00:00:00.000Z',baseSignature:''
});
test('iPhone draft accepts a valid partially completed input',()=>{
 assert.doesNotThrow(()=>validateEntryDraft(draft()));
});
test('draft refuses duplicate line identifiers before restoring editing state',()=>{
 const d=draft();
 const line={id:'one',type:'単勝',numbers:[1],stake:100,payout:0,refund:0,status:'pending'};
 d.lines=[line,{...line}];
 assert.throws(()=>validateEntryDraft(d),/買い目ID/);
});
test('draft refuses invalid dates and negative stakes',()=>{
 const d=draft();d.race.date='2026-02-30';
 assert.throws(()=>validateEntryDraft(d),/レース/);
 const e=draft();e.lines=[{id:'one',type:'単勝',numbers:[1],stake:-100,payout:0,refund:0,status:'pending'}];
 assert.throws(()=>validateEntryDraft(e),/購入額/);
});

test('draft keys reject empty and oversized identifiers',()=>{
 const empty=draft();empty.key='';
 assert.throws(()=>validateEntryDraft(empty),/下書きの形式/);
 const long=draft();long.key='a'.repeat(121);
 assert.throws(()=>validateEntryDraft(long),/下書きの形式/);
 const boundary=draft();boundary.key='a'.repeat(120);
 assert.doesNotThrow(()=>validateEntryDraft(boundary));
});

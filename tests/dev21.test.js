import test from 'node:test';
import assert from 'node:assert/strict';
import {validateEntryDraft} from '../entry-drafts.js';
const item=()=>({version:1,key:'new',updatedAt:'2026-10-18T00:00:00.000Z',baseSignature:'',
 race:{date:'2026-10-18',venue:'京都',number:'10',name:'サンプル'},
 lines:[{id:'x-1',numbers:[1,3],type:'ワイド',purchaseMode:'normal',stake:100,status:'settled',payout:NaN,refund:0}],
 fields:{type:'ワイド',mode:'normal',numbers:'1 3',stake:'100',duplicate:'separate',memo:'確認',saveNextRace:'0',allowUnfinished:'0'},
 advanced:{groups:[[],[],[]]}}
);
test('draft accepts unfinished actual receipt and preserves NaN for IDB structuredClone',()=>{
 const d=item();assert.equal(validateEntryDraft(d),d);const copy=structuredClone(d);assert.ok(Number.isNaN(copy.lines[0].payout));
});
test('draft rejects invalid race, duplicate IDs, mismatched combinations and excessive amounts',()=>{
 for(const invalid of [
  d=>d.race.date='2026-02-30',
  d=>d.race.venue='無効',
  d=>d.race.number='13',
  d=>d.lines[0].numbers=[3,1],
  d=>d.lines.push({...d.lines[0]}),
  d=>d.lines[0].stake=125,
  d=>d.fields.memo='a'.repeat(4001),
  d=>d.lines[0].refund=110
 ]){const d=item();invalid(d);assert.throws(()=>validateEntryDraft(d));}
});
test('historic ticket rows can still be temporarily saved, permanent schema stays version 1',()=>{
 const d=item();delete d.lines[0].purchaseMode;assert.equal(validateEntryDraft(d),d);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {assertExpectedRevision,nextLedgerRevision,readLedgerRevision} from '../ledger-revision.js';

test('first save starts at revision one',()=>assert.equal(nextLedgerRevision(undefined,0),1));
test('matching revision increments exactly once',()=>assert.equal(nextLedgerRevision(7,7),8));
test('unconditional save still rejects corrupt stored revision',()=>{
 for(const value of [-1,1.5,NaN,Infinity,'7',null,Number.MAX_SAFE_INTEGER]){
  assert.throws(()=>nextLedgerRevision(value),/更新番号/);
 }
});
test('stale tab cannot overwrite a newer revision',()=>{
 assert.throws(()=>nextLedgerRevision(8,7),error=>error.code==='STALE_LEDGER');
});
test('invalid caller revisions fail before opening the database',()=>{
 for(const value of [-1,0.5,NaN,Infinity,'1',undefined,Number.MAX_SAFE_INTEGER+1]){
  assert.throws(()=>assertExpectedRevision(value),/更新番号/);
 }
 assert.doesNotThrow(()=>assertExpectedRevision(null));
 assert.doesNotThrow(()=>assertExpectedRevision(0));
});
test('safe upper boundary does not overflow',()=>{
 assert.equal(nextLedgerRevision(Number.MAX_SAFE_INTEGER-1),Number.MAX_SAFE_INTEGER);
 assert.throws(()=>nextLedgerRevision(Number.MAX_SAFE_INTEGER),/更新番号/);
});

test('reading a missing revision supports existing pre-revision databases',()=>{
 assert.equal(readLedgerRevision(undefined),0);
 assert.equal(readLedgerRevision(4),4);
});
test('reading a corrupted revision must not silently reset it to zero',()=>{
 for(const value of [null,'',-1,NaN,Infinity,1.5,'4']){
  assert.throws(()=>readLedgerRevision(value),/更新番号/);
 }
});

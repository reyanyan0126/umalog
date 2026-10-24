import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validateSimpleEntries as fromCore} from '../core.js';
import {validateSimpleEntries as fromSimple} from '../simple-ledger.js';
const core=readFileSync(new URL('../core.js',import.meta.url),'utf8');
test('simple entry validation has one implementation without circular imports',()=>{
 assert.equal(fromCore,fromSimple);
 assert.doesNotMatch(core,/from ['"]\.\/simple-ledger\.js['"]/);
});
test('valid empty ledger retains original reference and undefined returns empty',()=>{
 const entries=[];assert.equal(fromCore(entries),entries);assert.deepEqual(fromCore(undefined),[]);
});
test('invalid simple entry rejects unchanged',()=>{
 assert.throws(()=>fromCore([{id:'x'}]),/購入日が不正/);
});

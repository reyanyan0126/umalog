import test from 'node:test';import assert from 'node:assert/strict';
import {emptyData} from '../core.js';import {snapshotOf,decodeSnapshot,checksum} from '../backup-integrity.js';
test('snapshot detects corruption including syntactically valid changes',()=>{const s=snapshotOf(emptyData(),1);assert.doesNotThrow(()=>decodeSnapshot(s));s.json=s.json.replace('うまたま','changed');assert.throws(()=>decodeSnapshot(s),/整合性/);});
test('legacy JSON generations remain readable without a checksum',()=>{const s=snapshotOf(emptyData(),2);delete s.checksum;assert.doesNotThrow(()=>decodeSnapshot(s));});
test('malformed generation and JSON are rejected',()=>{for(const s of [null,{json:'{}',revision:1,savedAt:'x'},{json:'{',revision:1,savedAt:new Date().toISOString()}])assert.throws(()=>decodeSnapshot(s));});

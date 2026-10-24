import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../db.js',import.meta.url),'utf8');
test('save never uses nonstandard IndexedDB transaction readyState',()=>{
 assert.doesNotMatch(source,/tx\\.readyState/);
});
test('save keeps a guarded transaction abort on synchronous write failure',()=>{
 assert.match(source,/catch\\(error\\)\\{problem=error;try\\{tx\\.abort\\(\\);\\}/);
 assert.match(source,/tx\\.onabort=\\(\\)=>reject\\(problem\\|\\|tx\\.error/);
});
test('accounting database schema remains version 1',()=>{
 assert.match(source,/VERSION=1,STORE='state'/);
});

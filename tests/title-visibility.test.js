import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=name=>readFileSync(new URL('../'+name,import.meta.url),'utf8');
test('title has one visibility mechanism and no inline lifecycle scripts',()=>{
 assert.match(read('style.css'),/\.launch-screen\[hidden\]\s*\{display:none!important\}/);
 assert.doesNotMatch(read('style.css'),/body:has\(#home:target\)\s*\.launch-screen/);
 assert.doesNotMatch(read('index.html'),/<script>/);
 assert.doesNotMatch(read('app.js'),/MutationObserver|splash\.style\.display/);
});

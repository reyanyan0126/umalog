import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=name=>readFileSync(new URL('../'+name,import.meta.url),'utf8');
test('title has one visibility mechanism and no inline lifecycle scripts',()=>{
 assert.match(read('style.css'),/\.launch-screen\[hidden\]\s*\{display:none!important\}/);
 assert.doesNotMatch(read('style.css'),/body:has\(#home:target\)\s*\.launch-screen/);
 assert.equal((read('index.html').match(/<script>/g)||[]).length,1,'only the dedicated startup recovery script may be inline');
 assert.match(read('index.html'),/sessionStorage\.getItem\(key\)/);
 assert.match(read('index.html'),/if\(start\.disabled\)failed/);
 assert.doesNotMatch(read('app.js'),/splash\.style\.display/);
});

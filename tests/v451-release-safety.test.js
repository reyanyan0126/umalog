import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
for(const path of ['index.html','publish/index.html']){
 test(path+' inline scripts parse as JavaScript',()=>{
  const html=read(path);
  const scripts=[...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)];
  assert.ok(scripts.length>0,'expected startup script');
  for(const [,source] of scripts)assert.doesNotThrow(()=>new vm.Script(source,{filename:path}));
 });
}
test('verified deploy waits for quality and browser acceptance',()=>{
 const workflow=read('.github/workflows/verified-pages-release.yml');
 assert.match(workflow,/needs:\s*\[quality, acceptance\]/);
 assert.match(workflow,/branches:\s*\[main\]/);
 assert.match(workflow,/node tests\/offline-pwa\.cjs/);
 assert.match(workflow,/node tests\/startup-smoke\.cjs/);
});
test('release manifests match and contain the expected patch version',()=>{
 const a=JSON.parse(read('release.json')),b=JSON.parse(read('publish/release.json'));
 assert.deepEqual(a,b);
 assert.equal(a.version,'4.5.5');
});

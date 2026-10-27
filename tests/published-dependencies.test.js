import test from 'node:test';
import assert from 'node:assert/strict';
import {readdirSync,readFileSync,existsSync} from 'node:fs';

test('all published JavaScript imports resolve to published files',()=>{
 const base=new URL('../publish/',import.meta.url);
 for(const name of readdirSync(base).filter(name=>name.endsWith('.js'))){
  const code=readFileSync(new URL(name,base),'utf8');
  for(const match of code.matchAll(/(?:from\s*|import\s*\()['"]((?:\.\/|\.\.\/)[^'"]+\.js)['"]/g)){
   const dependency=new URL(match[1],new URL(name,base));
   assert.ok(existsSync(dependency),name+' missing '+match[1]);
  }
 }
});

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

test('installed release precaches every published JavaScript dependency',async()=>{
 const {default:vm}=await import('node:vm');
 for(const prefix of ['', 'publish/']){
  const base=new URL('../'+prefix,import.meta.url),listeners={};let assets=[];
  vm.runInNewContext(readFileSync(new URL('sw.js',base),'utf8'),{
   self:{registration:{scope:'https://example.test/umalog/'},addEventListener:(type,fn)=>listeners[type]=fn},
   caches:{open:async()=>({addAll:async requests=>{assets=requests.map(r=>r.url);}})},
   Request:class{constructor(url){this.url=url;}}
  });
  let installed;listeners.install({waitUntil:p=>installed=p});await installed;
  for(const name of readdirSync(new URL('../publish/',import.meta.url)).filter(n=>n.endsWith('.js'))){
   if(name==='sw.js')continue;
   assert.ok(assets.includes('./'+name),prefix+'offline cache missing '+name);
  }
 }
});

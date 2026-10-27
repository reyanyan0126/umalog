const fs=require('node:fs');
const path=require('node:path');
const {spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'..');
const folders=['.','tests','scripts'];
let checked=0;
for(const folder of folders){
 const dir=path.join(root,folder);
 if(!fs.existsSync(dir))continue;
 for(const name of fs.readdirSync(dir)){
  if(!/\.(js|cjs|mjs)$/.test(name))continue;
  const file=path.join(dir,name);
  if(!fs.statSync(file).isFile())continue;
  const result=spawnSync(process.execPath,['--check',file],{encoding:'utf8'});
  if(result.status!==0){
   process.stderr.write('Syntax check failed: '+path.relative(root,file)+'\n'+(result.stderr||result.stdout));
   process.exit(1);
  }
  checked++;
 }
}
console.log('Syntax OK: '+checked+' JavaScript files');

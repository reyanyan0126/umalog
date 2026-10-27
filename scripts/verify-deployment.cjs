const fs=require('node:fs'),crypto=require('node:crypto');
(async()=>{
 const base=process.env.PAGE_URL;if(!base||!process.env.GITHUB_SHA)throw new Error('PAGE_URL and GITHUB_SHA required');
 const get=async path=>{const r=await fetch(new URL(path+'?verify='+Date.now(),base),{signal:AbortSignal.timeout(15000),cache:'no-store'});if(!r.ok)throw new Error(path+': '+r.status);return r.text();};
 const build=JSON.parse(await get('build.json'));if(build.commit!==process.env.GITHUB_SHA)throw new Error('Deployed commit does not match tested commit');
 for(const name of ['index.html','app.js','db.js','backup-integrity.js','backup-manager.js','sw.js','release.json','rescue.html','recovery.html']){
  const actual=await get(name),expected=fs.readFileSync(name,'utf8');
  if(actual!==expected)throw new Error('Deployed file mismatch: '+name);
 }
 console.log('PASS public files match tested commit',build.commit);
})().catch(e=>{console.error(e);process.exitCode=1;});

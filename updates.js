// Registration, update checks and controller changes share one lifecycle.
export function createUpdates({serviceWorker, onOffer, onStatus, canReload, reload, isOnline=()=>globalThis.navigator?.onLine!==false}) {
 let registration, registering, refreshing=false;
 let controlled=!!serviceWorker?.controller;
 serviceWorker?.addEventListener('controllerchange',()=>{
  if(!controlled){controlled=true;return;}
  if(refreshing)return;
  if(!canReload()) {onStatus('更新を適用しました。入力を保存後に再読み込みしてください。');return;}
  refreshing=true;
  reload();
 });
 const offer=()=>{if(registration?.waiting)onOffer();};
 async function register(){
  if(!serviceWorker)return null;
  if(!registering)registering=serviceWorker.register('./sw.js',{scope:'./',updateViaCache:'none'}).then(reg=>{
   registration=reg;
   reg.addEventListener('updatefound',()=>{
    const worker=reg.installing;
    worker?.addEventListener('statechange',()=>{if(worker.state==='installed')offer();});
   });
   offer();return reg;
  }).catch(error=>{registering=null;throw error;});
  return registering;
 }
 function apply(){
  if(!canReload()){onStatus('入力内容を保存してから更新してください。');return false;}
  if(!registration?.waiting)return false;
  onStatus('新しいバージョンを適用しています…');
  registration.waiting.postMessage({type:'SKIP_WAITING'});
  return true;
 }
 async function check(){
  onStatus('更新を確認しています…');
  try{
   if(!isOnline())throw new Error('offline');
   const reg=await deadline(register());
   if(!reg){onStatus('更新機能に対応していません。');return;}
   await deadline(reg.update());
   const worker=reg.installing;
   if(worker)await new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>finish(new Error('update timeout')),15000);
    function finish(error){clearTimeout(timer);worker.removeEventListener('statechange',changed);error?reject(error):resolve();}
    function changed(){if(worker.state==='redundant')finish(new Error('update failed'));else if(['installed','activated'].includes(worker.state))finish();}
    worker.addEventListener('statechange',changed);changed();
   });
   if(reg.waiting)apply();
   else onStatus('最新版の確認が完了しました。');
  }catch{onStatus('更新を確認できませんでした。通信状態を確認してください。');}
 }
 return {register,check,apply};
}

function deadline(promise){
 let timer;
 return Promise.race([promise,new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('update timeout')),15000);})]).finally(()=>clearTimeout(timer));
}

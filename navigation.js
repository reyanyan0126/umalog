// One owner for the URL, rendered route and title visibility.
// All transitions (including browser Back) wait for unsaved-input handling.
export function createNavigation({window:win, render, beforeLeave=async()=>true, onError=()=>{}}) {
 let current=win.location.hash||'#home', queue=Promise.resolve();
 const normalize=hash=>hash&&hash!=='#'?(hash.startsWith('#')?hash:'#'+hash):'#home';
 function navigate(hash,{replace=false}={}) {
  const target=normalize(hash);
  const task=queue.then(async()=>{
   let allowed=true;
   try{if(target!==current)allowed=await beforeLeave();}catch(error){win.history.replaceState(null,'',current);throw error;}
   if(!allowed) {
    win.history.replaceState(null,'',current);
    return false;
   }
   // replaceState does not emit hashchange: render is explicitly part of this commit.
   if(replace||win.location.hash===target)win.history.replaceState(null,'',target);
   else win.history.pushState(null,'',target);
   current=target;
   render(target);
   return true;
  });
  queue=task.catch(()=>{});
  return task;
 }
 win.addEventListener('hashchange',()=>{
  // A browser Back/Forward action has already changed the URL. If the user
  // declines to leave an edited screen, navigate() restores the prior hash.
  navigate(win.location.hash,{replace:true}).catch(onError);
 });
 // pushState/replaceState are intentionally used by navigate() to avoid a
 // second hashchange render and duplicate beforeLeave confirmation.
 return {
  navigate,
  start(){
   let seen=false;
   try{seen=win.sessionStorage.getItem('umalog-title-seen')==='1';}catch{}
   current=seen?normalize(win.location.hash):'#title';
   win.history.replaceState(null,'',current);
   render(current);
  }
 };
}

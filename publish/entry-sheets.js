// Accessible single-layer bottom-sheet controller. Closing keeps the draft intact.
export function mountEntrySheets({form,purchase,outcomes,backdrop,onOpen=()=>{}}){
 let active=null,returnFocus=null,previousOverflow='';
 const originalPurchasing=purchase.getAttribute('aria-labelledby');
 for(const [panel,title]of [[purchase,'entryPurchaseTitle'],[outcomes,'entryOutcomeTitle']]){
  panel.classList.add('entry-sheet');panel.hidden=true;panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');panel.setAttribute('aria-labelledby',title);panel.tabIndex=-1;
 }
 backdrop.hidden=true;
 function close(){
  if(!active)return;
  active.hidden=true;active=null;backdrop.hidden=true;document.body.classList.remove('entry-sheet-open');document.body.style.overflow=previousOverflow;
  const focus=returnFocus;returnFocus=null;if(focus?.isConnected)focus.focus({preventScroll:true});
 }
 function open(which,trigger){
  const target=which==='purchase'?purchase:which==='outcomes'?outcomes:null;
  if(!target)return;
  if(active)close();
  returnFocus=trigger||document.activeElement;previousOverflow=document.body.style.overflow;
  target.hidden=false;active=target;backdrop.hidden=false;document.body.classList.add('entry-sheet-open');document.body.style.overflow='hidden';
  target.scrollTop=0;target.focus({preventScroll:true});onOpen(which);
 }
 for(const panel of [purchase,outcomes]){
  const head=document.createElement('div');head.className='entry-sheet-head';
  const title=document.createElement('span');title.textContent=panel===purchase?'買い目を追加・修正':'結果・払戻を入力';
  const closeButton=document.createElement('button');closeButton.type='button';closeButton.className='quiet sheet-close';closeButton.textContent='閉じる';
  closeButton.onclick=close;
  head.append(title,closeButton);panel.prepend(head);
 }
 backdrop.onclick=close;
 form.addEventListener('keydown',e=>{
  if(!active)return;
  if(e.key==='Escape'){e.preventDefault();close();return;}
  if(e.key!=='Tab')return;
  const all=[...active.querySelectorAll('button,input,select,textarea,a[href],summary,[tabindex]:not([tabindex="-1"])')]
   .filter(el=>!el.disabled&&!el.closest('[hidden]')&&el.getClientRects().length);
  if(!all.length){e.preventDefault();active.focus();return;}
  const first=all[0],last=all[all.length-1];
  if(e.shiftKey&&(document.activeElement===first||document.activeElement===active)){e.preventDefault();last.focus();}
  else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
 });
 return {open,close,get active(){return active;}};
}

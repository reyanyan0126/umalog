// Tap-based ticket-number picker. Preserves the existing validated text field as
// an accessible fallback for keyboard entry and previously saved combinations.
const pickCount=type=>['単勝','複勝'].includes(type)?1:['三連複','三連単'].includes(type)?3:2;
const maxNumber=type=>type==='枠連'?8:18;
const positional=(type,mode)=>mode==='normal'&&['馬単','三連単','枠連'].includes(type);
const stepTitle=(type,i)=>['馬単','三連単'].includes(type)?(i+1)+'着':(i+1)+'枠目';
const parseValues=s=>String(s).trim().split(/[\s,、・\-→]+/).filter(Boolean).map(Number).filter(Number.isInteger);

export function mountNumberPad(host,input,typeSelector,modeSelector){
 let activeSlot=0;
 const render=()=>{
  const type=typeSelector.value,mode=modeSelector.value,k=pickCount(type),limit=maxNumber(type),slots=positional(type,mode);
  const values=parseValues(input.value);
  const selection=values.map((n,i)=>slots?stepTitle(type,i)+': '+n:n).join(slots?' / ':'・');
  host.replaceChildren();
  host.hidden=mode!=='normal'&&mode!=='box';
  if(host.hidden)return;
  const title=document.createElement('div');title.className='number-pad-title';
  title.textContent=slots?'順番に番号を選択':'番号をタップして選択';
  host.append(title);
  if(slots){
   const steps=document.createElement('div');steps.className='number-pad-steps';
   for(let i=0;i<k;i++){
    const b=document.createElement('button');b.type='button';b.className='quiet number-pad-step';
    b.textContent=stepTitle(type,i)+': '+(values[i]||'—');
    b.setAttribute('aria-pressed',String(i===activeSlot));b.onclick=()=>{activeSlot=i;render();};steps.append(b);
   }
   host.append(steps);
  }
  const grid=document.createElement('div');grid.className='number-pad-grid';
  grid.setAttribute('role','group');grid.setAttribute('aria-label',type==='枠連'?'枠番を選択':'馬番を選択');
  for(let n=1;n<=limit;n++){
   const b=document.createElement('button');b.type='button';b.className='number-pad-choice quiet';b.textContent=String(n);
   const chosen=values.includes(n);b.setAttribute('aria-pressed',String(chosen));b.setAttribute('aria-label',(type==='枠連'?'枠番':'馬番')+n+(chosen?' 選択済み':''));
   b.onclick=()=>{
    let next=parseValues(input.value);
    if(slots){
     next=next.slice(0,k);
     if(type!=='枠連'&&next.some((x,i)=>x===n&&i!==activeSlot)){host.querySelector('.number-pad-title').textContent='同じ馬番は選べません';return;}
     next[activeSlot]=n;
     const empty=Array.from({length:k},(_,i)=>i).find(i=>!next[i]);
     activeSlot=empty===undefined?(activeSlot+1)%k:empty;
    }else{
     next=next.filter(x=>x>=1&&x<=limit);
     if(next.includes(n))next=next.filter(x=>x!==n);
     else if(mode==='box'||next.length<k)next.push(n);
     else{host.querySelector('.number-pad-title').textContent='番号を変更するには選択済みを外してください';return;}
    }
    input.value=next.join(' ');
    input.dispatchEvent(new Event('input',{bubbles:true}));
    render();
   };
   grid.append(b);
  }
  host.append(grid);
  const status=document.createElement('p');status.className='number-pad-selected';status.setAttribute('aria-live','polite');
  status.textContent=selection||'未選択';host.append(status);
 };
 input.addEventListener('input',render);
 typeSelector.addEventListener('change',()=>{activeSlot=0;render();});
 modeSelector.addEventListener('change',()=>{activeSlot=0;render();});
 render();
 return {refresh:render};
}

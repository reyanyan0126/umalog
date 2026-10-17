// Advanced tap picker for nagashi (axis-flow) and formation.
// Pure combination validation is in bet-patterns.js; this module only manages UI state.
import {generateBets} from './bet-patterns.js';

const triple=t=>t==='三連複'||t==='三連単';
const ordered=t=>t==='馬単'||t==='三連単';
const singular=t=>t==='単勝'||t==='複勝';
const limit=t=>t==='枠連'?8:18;
const make=(tag,text,className='')=>{const e=document.createElement(tag);e.textContent=text;if(className)e.className=className;return e;};

export function mountAdvancedPattern(host,manualInput,typeSelect,modeSelect,normalPad){
 let axes=[],partners=[],groups=[[],[],[]],axisCount=1,position='first',active=0;
 const reset=()=>{axes=[];partners=[];groups=[[],[],[]];axisCount=1;position='first';active=0;};
 const selection=()=>modeSelect.value==='flow'?{axes:[...axes],partners:[...partners],axisCount,position}:{groups:groups.slice(0,triple(typeSelect.value)?3:2).map(g=>[...g])};
 const render=()=>{
  const type=typeSelect.value,mode=modeSelect.value,advanced=mode==='flow'||mode==='formation';
  host.hidden=!advanced;manualInput.closest('label').hidden=advanced;
  if(!advanced){host.replaceChildren();return;}
  host.replaceChildren();
  const isTriple=triple(type),isOrdered=ordered(type),count=isTriple?3:2;
  if(mode==='flow'){
   const config=make('div','','pattern-config');
   if(isTriple){
    const label=make('label','軸の数');
    const select=make('select','');select.id='flowAxisCount';
    for(const [value,name] of [[1,'1頭軸'],[2,'2頭軸']]){
     const option=make('option',name);option.value=String(value);option.selected=axisCount===value;select.append(option);
    }
    select.onchange=()=>{axisCount=Number(select.value);axes=[];active=0;render();};label.append(select);config.append(label);
   }
   if(isOrdered){
    const label=make('label',isTriple&&axisCount===2?'軸の固定位置':'着順の買い方');
    const select=make('select','');select.id='flowPosition';
    const placements=isTriple&&axisCount===2
      ?[['first','1・2着に軸'],['second','1・3着に軸'],['third','2・3着に軸'],['multi','2頭軸マルチ']]
      :isTriple
      ?[['first','1着固定'],['second','2着固定'],['third','3着固定'],['multi','1頭軸マルチ']]
      :[['first','1着固定'],['second','2着固定'],['multi','表裏（マルチ）']];
    if(!placements.some(x=>x[0]===position))position='first';
    for(const [value,name] of placements){const option=make('option',name);option.value=value;option.selected=position===value;select.append(option);}
    select.onchange=()=>{position=select.value;render();};label.append(select);config.append(label);
   }
   if(config.childElementCount)host.append(config);
  }
  const labels=mode==='flow'?['軸','相手']:Array.from({length:count},(_,i)=>isOrdered?(i+1)+'着':isTriple?String.fromCharCode(65+i)+'組':'組'+(i+1));
  const tabs=make('div','','pattern-tabs');tabs.setAttribute('role','group');tabs.setAttribute('aria-label','番号選択のグループ');
  for(let i=0;i<labels.length;i++){
   const g=mode==='flow'?(i===0?axes:partners):groups[i];
   const button=make('button',labels[i]+' '+(g.length?g.join('・'):'—'),'quiet pattern-tab');
   button.type='button';button.dataset.patternTab=String(i);
   button.setAttribute('aria-pressed',String(active===i));
   button.onclick=()=>{active=i;render();};tabs.append(button);
  }
  host.append(tabs);
  const label=mode==='flow'?(active===0?'軸の番号（'+(isTriple?axisCount:1)+'頭'+(isOrdered&&axisCount===2?'・タップ順に着順指定':'')+'）':'相手の番号'):
    labels[active]+'で選ぶ番号';
  host.append(make('div',label,'number-pad-title'));
  const grid=make('div','','number-pad-grid pattern-grid');
  grid.setAttribute('role','group');grid.setAttribute('aria-label',label);
  const bucket=mode==='flow'?(active===0?axes:partners):groups[active];
  for(let n=1;n<=limit(type);n++){
   const button=make('button',String(n),'number-pad-choice quiet');button.type='button';
   button.dataset.patternNumber=String(n);
   button.setAttribute('aria-pressed',String(bucket.includes(n)));
   button.setAttribute('aria-label',(type==='枠連'?'枠番':'馬番')+n+(bucket.includes(n)?' 選択済み':''));
   button.onclick=()=>{
    const index=bucket.indexOf(n);
    if(index>=0)bucket.splice(index,1);
    else if(mode==='flow'&&active===0&&axes.length>=axisCount){
     host.querySelector('.pattern-status').textContent='軸を変更するときは選択済みを外してください';return;
    }else bucket.push(n);
    if(!(mode==='flow'&&active===0&&isOrdered&&axisCount===2))bucket.sort((a,b)=>a-b);
    if(mode==='flow'&&active===0&&axes.length===axisCount)active=1;
    dirtyChange();render();
   };
   grid.append(button);
  }
  host.append(grid);
  const tools=make('div','','pattern-actions');
  const clear=make('button','この組をクリア','quiet');clear.type='button';
  clear.onclick=()=>{bucket.length=0;dirtyChange();render();};tools.append(clear);host.append(tools);
  const status=make('p','', 'pattern-status');status.setAttribute('role','status');host.append(status);
  try{
   const count=generateBets(type,mode,selection()).length;
   status.textContent='生成予定 '+count+'点';
  }catch{status.textContent='各組の番号を選ぶと点数が表示されます';}
 };
 const dirtyChange=()=>host.dispatchEvent(new Event('input',{bubbles:true}));
 const change=()=>{reset();for(const option of modeSelect.options)if(option.value==='flow'||option.value==='formation')option.disabled=singular(typeSelect.value);if(singular(typeSelect.value)&&['flow','formation'].includes(modeSelect.value))modeSelect.value='normal';normalPad?.refresh();render();};
 typeSelect.addEventListener('change',change);
 modeSelect.addEventListener('change',change);
 change();
 return {selection,refresh:render};
}

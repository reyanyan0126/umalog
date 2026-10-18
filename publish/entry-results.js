// Post-race entry: outcomes remain a draft until one atomic ledger save.
import {check,money,summarize} from './core.js';
import {resultChoice,resultValue} from './results.js';

const yen=n=>n.toLocaleString('ja-JP')+'円';
const signed=n=>(n>0?'+':'')+yen(n);
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const labelNumber=l=>l.numbers.join(['馬単','三連単'].includes(l.type)?'→':'－');

export function mountEntryResults(host,{onDirty=()=>{}}={}){
 let lines=[],visible=50;
 const selections=new Map();
 const choice=l=>selections.get(l.id)||(l.status==='void'?'refund':resultChoice(l));
 const choices=[['pending','結果を選ぶ'],['miss','不的中'],['hit','的中'],['refund','全額返還'],['advanced','一部返還・詳細']];
 const opts=value=>choices.map(([id,text])=>`<option value="${id}" ${value===id?'selected':''}>${text}</option>`).join('');

 function values(){
  return lines.map(l=>{
   const c=choice(l);
   const state=c==='advanced'?'settled':l.status;
   return {...l,...resultValue(l,c,l.payout,l.refund,state)};
  });
 }
 function updateSummary(){
  const label=host.querySelector('#entryResultSummary');
  if(!label)return;
  const missing=lines.filter(l=>choice(l)==='pending').length;
  const decided=lines.length-missing;
  try{
   const rows=values(),s=summarize(rows);
   label.textContent=lines.length===0?'まず買い目を追加してください。':
    missing?`結果入力 ${decided}/${lines.length}点。残り${missing}点を入力してください（収支は未確定）。`:
    `全${lines.length}点入力済み · 購入 ${yen(s.purchase)} · 払戻 ${yen(s.payout)} · 返還 ${yen(s.refund)} · 収支 ${signed(s.profit)}`;
  }catch(error){label.textContent=`結果入力 ${decided}/${lines.length}点 · ${error.message}`;}
 }
 function render(next){
  lines=next;
  const valid=new Set(lines.map(l=>l.id));
  for(const key of selections.keys())if(!valid.has(key))selections.delete(key);
  const show=lines.slice(0,visible);
  host.innerHTML=`<div class="entry-result-tools"><button type="button" class="quiet" id="entryAllMiss">結果未入力の買い目をまとめて不的中にする</button></div><p id="entryResultSummary" class="help" role="status" aria-live="polite"></p><div class="entry-result-rows">${show.map((l,i)=>{
   const c=choice(l);
   return `<div class="entry-result-row" data-entry-result-row="${i}"><div class="entry-result-heading"><b>${esc(l.type)} ${labelNumber(l)}</b><small>購入 ${yen(l.stake)}</small></div><label>馬券の結果<select data-entry-outcome="${i}" aria-label="買い目${i+1}の結果">${opts(c)}</select></label><label data-entry-receipt-wrap ${c!=='hit'&&c!=='advanced'?'hidden':''}>実際の払戻金（円）<input data-entry-receipt="${i}" type="number" min="0" step="1" inputmode="numeric" value="${Number.isFinite(l.payout)?l.payout:''}"></label><label data-entry-refund-wrap ${c!=='advanced'?'hidden':''}>返還金（円）<input data-entry-refund="${i}" type="number" min="0" max="${l.stake}" step="1" inputmode="numeric" value="${Number.isFinite(l.refund)?l.refund:''}"></label><p data-entry-full-refund ${c==='refund'?'':'hidden'} class="help">返還 ${yen(l.stake)}（購入額と同額）</p></div>`;
  }).join('')}</div>${lines.length>visible?`<button type="button" id="entryResultMore" class="quiet full">さらに50点を表示（残り ${lines.length-visible}点）</button>`:''}`;
  host.querySelector('#entryAllMiss').onclick=()=>{
   for(const l of lines)if(choice(l)==='pending'){selections.set(l.id,'miss');Object.assign(l,{status:'settled',payout:0,refund:0});}
   render(lines);onDirty();
  };
  if(host.querySelector('#entryResultMore'))host.querySelector('#entryResultMore').onclick=()=>{visible+=50;render(lines);};
  updateSummary();
 }
 host.addEventListener('change',e=>{
  const i=e.target.dataset.entryOutcome;
  if(i===undefined)return;
  const l=lines[Number(i)],c=e.target.value;
  selections.set(l.id,c);
  if(c==='pending')Object.assign(l,{status:'pending',payout:0,refund:0});
  else if(c==='miss')Object.assign(l,{status:'settled',payout:0,refund:0});
  else if(c==='refund')Object.assign(l,{status:'void',payout:0,refund:l.stake});
  else if(c==='hit')Object.assign(l,{status:'settled',refund:0,payout:l.payout||0});
  else if(c==='advanced')l.status='settled';
  else{check(false,'結果を選択してください。');}
  const row=e.target.closest('[data-entry-result-row]');
  row.querySelector('[data-entry-receipt-wrap]').hidden=!['hit','advanced'].includes(c);
  row.querySelector('[data-entry-refund-wrap]').hidden=c!=='advanced';
  row.querySelector('[data-entry-full-refund]').hidden=c!=='refund';
  // Preserve the native iOS picker: do not recreate or refocus its select on change.
  updateSummary();onDirty();
 });
 host.addEventListener('input',e=>{
  const index=e.target.dataset.entryReceipt??e.target.dataset.entryRefund;
  if(index===undefined)return;
  const key=e.target.dataset.entryReceipt===undefined?'refund':'payout';
  lines[Number(index)][key]=e.target.value===''?NaN:Number(e.target.value);
  updateSummary();onDirty();
 });
 return {render,values,updateSummary,reveal(index){
  if(!Number.isInteger(index)||index<0||index>=lines.length)return null;
  if(index>=visible){visible=Math.ceil((index+1)/50)*50;render(lines);}
  return host.querySelector('[data-entry-outcome="'+index+'"]');
 },reset(next=lines){selections.clear();render(next);}};
}

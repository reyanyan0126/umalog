// Fast post-race results. Keeps one row per paid purchase, including repeats.
const yen=n=>Number(n).toLocaleString('ja-JP')+'円';
const fmt=l=>l.numbers.join(['馬単','三連単'].includes(l.type)?'→':'－');
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function mountFastResults(host,{onChange,onAdvanced}){
 let lines=[],visible=50,confirming=false;
 const status=l=>l.status==='pending'?'未入力':l.status==='void'?'返還':l.refund>0?'一部返還':Number.isNaN(l.payout)?'払戻金を入力':l.payout>0?'的中':'不的中';
 const pending=()=>lines.filter(l=>l.status==='pending').length;
 const hitCount=()=>lines.filter(l=>l.status==='settled'&&l.payout>0).length;
 function render(next=lines){
  lines=next;const missing=pending();
  host.innerHTML=`<div class="fast-outcome-header"><b>的中した買い目を選択</b><small>的中 ${hitCount()}点 · 未入力 ${missing}点 / 全${lines.length}点</small></div>
  <p class="help">複数選択できます。払戻は実際の受取額を買い目ごとに入力。返還は別に指定します。</p>
  <div class="fast-bet-list">${lines.slice(0,visible).map((l,i)=>`<div class="fast-bet-row" data-fast-row="${i}">
   <div class="fast-bet-name"><b>${esc(l.type)} ${fmt(l)}</b><small>購入 ${yen(l.stake)} · ${status(l)}</small></div>
   <div class="fast-bet-actions"><button type="button" data-fast-hit="${i}" class="${l.status==='settled'&&(l.payout>0||Number.isNaN(l.payout))?'selected':''}" aria-pressed="${l.status==='settled'&&(l.payout>0||Number.isNaN(l.payout))}">的中</button><button type="button" data-fast-refund="${i}" class="${l.status==='void'?'selected':''}" aria-pressed="${l.status==='void'}">返還</button></div>
   ${l.status==='settled'&&l.payout!==0?`<label class="fast-payout">払戻金（実際の受取額・円）<input data-fast-payout="${i}" type="number" min="1" step="1" inputmode="numeric" value="${Number.isFinite(l.payout)?l.payout:''}" placeholder="金額を入力"></label>`:''}
   ${l.status==='settled'&&l.refund>0?`<small>一部返還 ${yen(l.refund)}</small>`:''}
   <button type="button" class="fast-detail-link" data-fast-advanced="${i}">一部返還・詳細</button>
  </div>`).join('')}</div>
  ${lines.length>visible?`<button type="button" class="quiet full" id="fastMore">さらに50点を表示（残り ${lines.length-visible}点）</button>`:''}
  <div class="fast-confirm"><button type="button" id="fastConfirm" class="quiet full" ${missing===0?'disabled':''}>未入力の${missing}点を不的中として確定</button>
  ${confirming&&missing?`<div id="fastConfirmWarning" role="group" aria-label="一括不的中の最終確認"><p class="help">未入力の${missing}点だけを不的中にします。的中・返還・入力済みの行は変更しません。</p><button type="button" class="full" id="fastApplyMiss">確認して確定</button><button type="button" class="quiet full" id="fastCancelMiss">戻る</button></div>`:''}</div>`;
  const more=host.querySelector('#fastMore');if(more)more.onclick=()=>{visible+=50;render();};
  host.querySelector('#fastConfirm').onclick=()=>{confirming=true;render();};
  const apply=host.querySelector('#fastApplyMiss');if(apply)apply.onclick=()=>{for(const l of lines)if(l.status==='pending')Object.assign(l,{status:'settled',payout:0,refund:0});confirming=false;onChange({rerender:true});render();};
  const cancel=host.querySelector('#fastCancelMiss');if(cancel)cancel.onclick=()=>{confirming=false;render();};
 }
 host.addEventListener('click',e=>{
  const b=e.target.closest('button[data-fast-hit],button[data-fast-refund],button[data-fast-advanced]');
  if(!b)return;
  const index=Number(b.dataset.fastHit??b.dataset.fastRefund??b.dataset.fastAdvanced),l=lines[index];if(!l)return;
  if(b.dataset.fastAdvanced!==undefined){onAdvanced(index);return;}
  if(b.dataset.fastHit!==undefined){
   if(l.status==='settled'&&(l.payout>0||Number.isNaN(l.payout))){Object.assign(l,{status:'pending',payout:0,refund:0});}
   else Object.assign(l,{status:'settled',payout:Number.NaN,refund:0});
  }else{
   if(l.status==='void')Object.assign(l,{status:'pending',payout:0,refund:0});
   else Object.assign(l,{status:'void',payout:0,refund:l.stake});
  }
  confirming=false;onChange({rerender:true});render();
 });
 host.addEventListener('input',e=>{
  if(e.target.dataset.fastPayout===undefined)return;
  const l=lines[Number(e.target.dataset.fastPayout)];
  l.payout=e.target.value===''?NaN:Number(e.target.value);
  onChange({rerender:false});
  const count=host.querySelector('.fast-outcome-header small');if(count)count.textContent=`的中 ${hitCount()}点 · 未入力 ${pending()}点 / 全${lines.length}点`;
  const label=e.target.closest('[data-fast-row]')?.querySelector('.fast-bet-name small');if(label)label.textContent=`購入 ${yen(l.stake)} · ${status(l)}`;
 });
 return {render,stats:()=>({pending:pending(),hits:hitCount(),count:lines.length})};
}

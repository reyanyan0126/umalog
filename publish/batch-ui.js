// Candidate detection is separate from explicit, atomic accounting changes.
import {raceCandidates} from './batch-results.js';
import {resultValue} from './results.js';
import {money} from './core.js';
const yen=n=>n.toLocaleString('ja-JP')+'円';
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const combo=r=>r.numbers.join(['馬単','三連単'].includes(r.type)?'→':'－');
export function mountRaceBatch(host,{getData,raceId,getPodium,onSave,onDirty,guard}){
 host.innerHTML=`<section class="card batch-settle"><h2>レース全体の結果入力</h2>
 <div class="grid"><label>公式結果の状態<select id="batchRaceState"><option value="unknown">未確認・未確定</option><option value="normal">確定・同着／取消／返還なし</option><option value="exception">同着・取消・除外・返還・不成立・訂正あり</option></select></label>
 <label>発売開始時の頭数<select id="batchStarters"><option value="">不明（複勝は要確認）</option>${Array.from({length:14},(_,i)=>`<option value="${i+5}">${i+5}頭</option>`).join('')}</select></label></div>
 <button type="button" id="batchPreview" class="quiet full">1〜3着から的中候補を確認</button><div id="batchBody"></div></section>`;
 const previewButton=host.querySelector('#batchPreview'),body=host.querySelector('#batchBody');let submitting=false,edited=false;
 const context=()=>({normalConfirmed:host.querySelector('#batchRaceState').value==='normal',startersAtSale:Number(host.querySelector('#batchStarters').value)||null});
 const fingerprint=()=>JSON.stringify([getPodium(),context()]);
 host.querySelectorAll('select').forEach(s=>s.onchange=()=>{onDirty();const c=body.querySelector('#batchConfirm');if(c)c.checked=false;});
 previewButton.onclick=guard(()=>{
  if(submitting)return;
  if(edited&&!confirm('入力中の一括結果を破棄して候補を作り直しますか？'))return;
  const candidates=raceCandidates(getData(),raceId,getPodium(),context()),pending=candidates.filter(r=>r.status==='pending'),snapshot=fingerprint();edited=false;
  const state=pending.map(row=>({row,choice:row.candidate==='hit'?'hit':'skip',payout:'',refund:''}));
  const counts=key=>candidates.filter(r=>r.candidate===key).length;
  body.innerHTML=`<p class="help" id="batchSummary" role="status">未入力 ${pending.length}点 · 的中候補 ${counts('hit')}点 · 要確認 ${counts('unknown')}点 · 不的中候補 ${counts('miss')}点 · 精算済み ${counts('settled')}点</p>
  <p class="help">候補は参考です。払戻は100円あたりの配当ではなく、購入分の受取総額を入力してください。例外・枠連・情報不足は要確認。精算済みの訂正は個別入力から行えます。</p>
  <form id="batchForm" novalidate><div id="batchGroups"></div>
  ${pending.length?'<p class="help" id="batchCounts" role="status"></p><label class="batch-confirm"><input type="checkbox" id="batchConfirm" required>公式の確定結果・払戻・返還と保存対象を確認しました</label><button type="submit" class="full accent">確認した結果を一括保存</button>':'<p class="help">未入力の買い目はありません。</p>'}</form>`;
  const form=body.querySelector('#batchForm'),groups=form.querySelector('#batchGroups');
  const invalidate=()=>{edited=true;onDirty();const c=form.querySelector('#batchConfirm');if(c)c.checked=false;};
  const updates=()=>state.flatMap(({row,choice,payout,refund})=>{
   if(choice==='skip')return [];
   const result=resultValue(row,choice,choice==='hit'||choice==='advanced'?Number(payout):0,choice==='advanced'?Number(refund):0,'settled');
   if(choice==='advanced'&&(payout.trim()===''||refund.trim()===''))throw new Error('個別返還の払戻・返還額を入力してください（なしは0）。');
   return [{id:row.lineId,...result}];
  });
  const recount=()=>{
   const el=form.querySelector('#batchCounts');if(!el)return;
   const selected=state.filter(s=>s.choice!=='skip').length;
   let text=`保存対象 ${selected}点／保留 ${state.length-selected}点`;
   try{const rows=updates(),p=money(rows.reduce((n,r)=>n+r.payout,0)),r=money(rows.reduce((n,r)=>n+r.refund,0));text+=` · 払戻 ${yen(p)} · 返還 ${yen(r)}`;}catch{text+=' · 金額の入力・確認が必要です';}
   el.textContent=text;
  };
  const rowHTML=i=>{const {row:r,choice,payout,refund}=state[i];return `<div class="batch-row" data-batch-row="${i}"><div class="batch-title"><b>${esc(r.type)} ${esc(combo(r))}</b><small>購入 ${yen(r.stake)}</small></div>
   <label>処理<select data-batch-choice="${i}" aria-label="${r.type} ${combo(r)} の判定">${[['skip','保留'],['hit','的中'],['miss','不的中'],['refund','全額返還'],['advanced','個別返還']].map(([v,t])=>`<option value="${v}" ${choice===v?'selected':''}>${t}</option>`).join('')}</select></label>
   <label data-batch-payout-wrap ${['hit','advanced'].includes(choice)?'':'hidden'}>払戻総額<input data-batch-payout="${i}" aria-label="買い目${i+1}の実際の払戻額" type="number" min="0" step="1" inputmode="numeric" value="${payout}"></label>
   <label data-batch-refund-wrap ${choice==='advanced'?'':'hidden'}>返還額<input data-batch-refund="${i}" aria-label="買い目${i+1}の返還額" type="number" min="0" step="1" inputmode="numeric" value="${refund}"></label></div>`;};
  for(const [key,label] of [['hit','的中候補'],['unknown','要確認'],['miss','不的中候補'],['settled','精算済み']]){
   const indices=state.map((s,i)=>s.row.candidate===key?i:-1).filter(i=>i>=0),settled=candidates.filter(r=>r.candidate==='settled'),count=key==='settled'?settled.length:indices.length;
   const section=document.createElement('details');section.dataset.batchGroup=key;section.open=key==='hit'||key==='unknown';section.innerHTML=`<summary>${label} ${count}点</summary><div class="batch-rows"></div>`;groups.append(section);
   if(key==='miss'&&count){const select=document.createElement('button');select.type='button';select.className='quiet';select.id='batchSelectMisses';select.textContent=`不的中候補 ${count}点を保存対象にする`;select.onclick=()=>{indices.forEach(i=>{if(state[i].choice==='skip')state[i].choice='miss';const el=form.querySelector('[data-batch-choice="'+i+'"]');if(el)el.value=state[i].choice;});invalidate();recount();};section.insertBefore(select,section.lastElementChild);}
   let shown=0;const rows=section.querySelector('.batch-rows'),more=document.createElement('button');more.type='button';more.className='quiet full';
   const append=()=>{const end=Math.min(shown+50,count);for(;shown<end;shown++){if(key==='settled'){const r=settled[shown];rows.insertAdjacentHTML('beforeend',`<p>${esc(r.type)} ${esc(combo(r))} · 購入 ${yen(r.stake)} · 払戻 ${yen(r.payout)} · 返還 ${yen(r.refund)}</p>`);}else rows.insertAdjacentHTML('beforeend',rowHTML(indices[shown]));}more.textContent=`さらに50点（残り ${count-shown}点）`;more.hidden=shown>=count;};more.onclick=append;section.append(more);append();
  }
  form.onchange=e=>{const i=e.target.dataset.batchChoice;if(i===undefined)return;const s=state[Number(i)];s.choice=e.target.value;const row=e.target.closest('[data-batch-row]');row.querySelector('[data-batch-payout-wrap]').hidden=!['hit','advanced'].includes(s.choice);row.querySelector('[data-batch-refund-wrap]').hidden=s.choice!=='advanced';invalidate();recount();};
  form.oninput=e=>{for(const [attr,key] of [['batchPayout','payout'],['batchRefund','refund']])if(e.target.dataset[attr]!==undefined){state[Number(e.target.dataset[attr])][key]=e.target.value;invalidate();recount();}};
  form.onsubmit=guard(async e=>{
   e.preventDefault();if(submitting)return;
   if(!form.querySelector('#batchConfirm')?.checked)throw new Error('結果の確認にチェックしてください。');
   if(fingerprint()!==snapshot)throw new Error('着順・条件が変更されました。もう一度候補を確認してください。');
   const rows=updates();if(!rows.length)throw new Error('保存する結果を選んでください。');
   money(rows.reduce((n,r)=>n+r.payout,0));money(rows.reduce((n,r)=>n+r.refund,0));
   submitting=true;const button=form.querySelector('[type=submit]');button.disabled=true;previewButton.disabled=true;
   try{await onSave(rows,getPodium());edited=false;}finally{submitting=false;button.disabled=false;previewButton.disabled=false;}
  });recount();
 });
}

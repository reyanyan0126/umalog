// Explicit preview → user checks actual payout → single-transaction ledger update.
// No provider calls, no automatic payouts, and no changes to already-settled lines.
import {raceCandidates} from './batch-results.js';
import {resultValue} from './results.js';

const yen=n=>n.toLocaleString('ja-JP')+'円';
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

export function mountRaceBatch(host,{getData,raceId,getPodium,onSave,onDirty,guard}){
 host.innerHTML='<section class="card batch-settle"><h2>このレースをまとめて入力</h2><button type="button" id="batchPreview" class="quiet full">1〜3着から的中候補を確認</button><div id="batchBody"></div></section>';
 const previewButton=host.querySelector('#batchPreview'),body=host.querySelector('#batchBody');
 let snapshot=null;
 previewButton.onclick=guard(()=>{
  const podium=getPodium(),candidates=raceCandidates(getData(),raceId,podium);
  const pending=candidates.filter(r=>r.status==='pending');
  if(!pending.length){body.innerHTML='<p class="help">このレースに未入力の買い目はありません。</p>';return;}
  snapshot=JSON.stringify(podium);
  const visible=pending.slice(0,300),hidden=pending.length-visible.length;
  const hits=visible.filter(x=>x.candidate==='hit').length;
  const misses=visible.filter(x=>x.candidate==='miss').length;
  body.innerHTML=`<p class="help" id="batchSummary" role="status">未入力 ${pending.length}点 · 的中候補 ${hits}点 · 不的中候補 ${misses}点${hidden?' · 今回は先頭300点のみ':''}</p>
  <p class="help">候補は通常着順の参考表示です。同着・出走頭数の少ない複勝・取消・返還・枠連は公式結果を確認し、必要なら判定を変更してください。払戻は実際の受取総額を入力。</p>
  <form id="batchForm"><div class="batch-rows">${visible.map((r,i)=>`<div class="batch-row" data-batch-row="${i}">
   <div class="batch-title"><b>${esc(r.type)} ${esc(r.numbers.join(['馬単','三連単'].includes(r.type)?'→':'－'))}</b><small>購入 ${yen(r.stake)} · ${r.candidate==='hit'?'的中候補':r.candidate==='miss'?'不的中候補':'要確認'}</small></div>
   <label>判定<select data-batch-choice="${i}" aria-label="${r.type} ${r.numbers.join('−')} の判定">
    <option value="skip" ${r.candidate==='unknown'?'selected':''}>保留</option>
    <option value="hit" ${r.candidate==='hit'?'selected':''}>的中</option>
    <option value="miss" ${r.candidate==='miss'?'selected':''}>不的中</option>
    <option value="refund">全額返還</option>
   </select></label>
   <label data-batch-payout-wrap ${r.candidate==='hit'?'':'hidden'}>払戻<input data-batch-payout="${i}" aria-label="買い目${i+1}の実際の払戻額" type="number" min="1" step="1" inputmode="numeric" placeholder="実際の払戻額"></label>
   </div>`).join('')}</div><label class="batch-confirm"><input type="checkbox" id="batchConfirm" required>候補と実際の払戻を確認しました</label>
   <p class="help" id="batchCounts" role="status"></p><button type="submit" class="full accent">確認した結果を一括保存</button></form>`;
  const form=body.querySelector('#batchForm');
  const recount=()=>{
   const modes=[...form.querySelectorAll('[data-batch-choice]')].map(e=>e.value);
   form.querySelector('#batchCounts').textContent=`保存対象 ${modes.filter(x=>x!=='skip').length}点／保留 ${hidden+modes.filter(x=>x==='skip').length}点`;
  };
  form.querySelectorAll('[data-batch-choice]').forEach(select=>select.onchange=()=>{
   const row=select.closest('[data-batch-row]');
   row.querySelector('[data-batch-payout-wrap]').hidden=select.value!=='hit';onDirty();recount();
  });
  form.oninput=onDirty;
  form.onsubmit=guard(async e=>{
   e.preventDefault();
   if(!form.querySelector('#batchConfirm').checked)throw new Error('結果の確認にチェックしてください。');
   if(JSON.stringify(getPodium())!==snapshot)throw new Error('着順が変更されました。もう一度候補を確認してください。');
   const updates=[];
   for(let i=0;i<visible.length;i++){
    const row=visible[i],choice=form.querySelector('[data-batch-choice="'+i+'"]').value;
    if(choice==='skip')continue;
    const payoutField=form.querySelector('[data-batch-payout="'+i+'"]');
    const payout=choice==='hit'?payoutField.value.trim()===''?0:Number(payoutField.value):0;
    const result=resultValue(row,choice,payout);
    updates.push({id:row.lineId,...result});
   }
   if(!updates.length)throw new Error('保存する結果を選んでください。');
   await onSave(updates,getPodium());
  });
  recount();
 });
}

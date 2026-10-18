// Single-line correction: confirmation before atomic save, never updates sibling purchases.
import {check,money} from './core.js';
const yen=n=>n.toLocaleString('ja-JP')+'円';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

export function lineCorrectionValues(line,mode,stake,payout,refund){
 money(stake,true);
 if(mode==='pending'){check(line.status==='pending','確定済み結果を未入力へ戻す操作はできません。');return {stake,status:'pending',payout:0,refund:0};}
 if(mode==='miss')return {stake,status:'settled',payout:0,refund:0};
 if(mode==='refund')return {stake,status:'void',payout:0,refund:stake};
 if(mode==='hit'){money(payout);check(payout>0,'的中した払戻金を1円以上で入力してください。');return {stake,status:'settled',payout,refund:0};}
 check(mode==='advanced','結果区分を選択してください。');
 money(payout);money(refund);check(refund<=stake,'返還金は購入額を超えられません。');
 check(!(refund===stake&&payout>0),'全額返還と払戻金は同時に登録できません。');
 check(payout>0||refund>0,'一部返還・詳細結果には払戻金か返還金を指定してください。');
 return {stake,status:refund===stake&&payout===0?'void':'settled',payout,refund};
}

export function openLineCorrection({line,ticket,onSave,onClose=()=>{}}){
 const initial=line.status==='pending'?'pending':line.status==='void'?'refund':line.refund>0?'advanced':line.payout>0?'hit':'miss';
 const dialog=document.createElement('dialog');dialog.className='correction-dialog';
 dialog.innerHTML=`<form id="correctionForm" class="correction-form" novalidate><div class="row"><h2>買い目の訂正</h2><button type="button" id="correctionClose" class="quiet">閉じる</button></div>
 <p class="help">${esc(ticket.type)} · ${line.numbers.join(['馬単','三連単'].includes(ticket.type)?'→':'－')}。この1点だけを変更します。</p>
 <label>購入金額（円）<input id="correctStake" type="number" min="100" step="100" inputmode="numeric" required value="${line.stake}"></label>
 <label>結果<select id="correctMode"><option value="miss">不的中</option><option value="hit">的中</option><option value="refund">全額返還</option><option value="advanced">一部返還・詳細</option>${line.status==='pending'?'<option value="pending">旧記録：未入力</option>':''}</select></label>
 <label id="correctPayoutWrap">実際の払戻金（円）<input id="correctPayout" type="number" min="0" step="1" inputmode="numeric" value="${line.payout}"></label>
 <label id="correctRefundWrap">返還金（円）<input id="correctRefund" type="number" min="0" step="1" inputmode="numeric" value="${line.refund}"></label>
 <div class="correction-preview"><p class="help" id="correctionBefore">変更前：購入 ${yen(line.stake)} ／ 払戻 ${yen(line.payout)} ／ 返還 ${yen(line.refund)}</p><div id="correctionPreview" role="status"></div><p id="correctionDifference" class="help"></p></div>
 <button id="correctionReview" class="full" type="button">変更内容を確認</button>
 <div id="correctionConfirm" hidden><p class="help">この1点の金額・結果を変更し、日別・月別集計を更新します。ほかの買い目は変更しません。</p><button id="correctionSave" type="submit" class="full accent">この内容で訂正を保存</button></div>
 </form>`;
 document.body.append(dialog);
 const el=id=>dialog.querySelector('#'+id),form=el('correctionForm');
 let baseline=JSON.stringify([initial,line.stake,line.payout,line.refund]),working=null,reviewSignature='',saving=false;
 el('correctMode').value=initial;
 const signature=()=>JSON.stringify([el('correctMode').value,el('correctStake').value,el('correctPayout').value,el('correctRefund').value]);
 function evaluate(){
  let result=null;
  try{
   const read=id=>{const v=el(id).value.trim();check(v!==''&&/^\d+$/.test(v),'金額を0以上の整数で入力してください。');return Number(v);};
   const stake=read('correctStake'),mode=el('correctMode').value;
   const payout=mode==='hit'||mode==='advanced'?read('correctPayout'):0;
   const refund=mode==='advanced'?read('correctRefund'):0;
   result=lineCorrectionValues(line,mode,stake,payout,refund);
   el('correctionPreview').textContent=`変更後：購入 ${yen(stake)} ／ 払戻 ${yen(result.payout)} ／ 返還 ${yen(result.refund)} ／ ${result.status==='pending'?'収支未計算':'収支 '+(result.payout+result.refund-stake>=0?'+':'')+yen(result.payout+result.refund-stake)}`;
   const diff=result.payout+result.refund-stake-(line.payout+line.refund-line.stake);
   el('correctionDifference').textContent=line.status==='pending'||result.status==='pending'?'未入力が含まれるため確定収支の差額は保存後に再計算します。':'確定収支の差額 '+(diff>0?'+':'')+yen(diff)+'（該当する1点のみ）';
  }catch(error){el('correctionPreview').textContent=error.message;}
  return result;
 }
 function update(){el('correctPayoutWrap').hidden=!['hit','advanced'].includes(el('correctMode').value);el('correctRefundWrap').hidden=el('correctMode').value!=='advanced';working=evaluate();el('correctionConfirm').hidden=true;}
 function close(){
  if(saving)return;
  if(signature()!==baseline&&!window.confirm('未保存の訂正内容を破棄しますか？'))return;
  dialog.close();dialog.remove();onClose();
 }
 el('correctionClose').onclick=close;
 dialog.addEventListener('cancel',e=>{e.preventDefault();close();});
 form.addEventListener('input',update);form.addEventListener('change',update);
 el('correctionReview').onclick=()=>{working=evaluate();if(!working)return;reviewSignature=signature();el('correctionConfirm').hidden=false;};
 form.onsubmit=async e=>{
  e.preventDefault();if(saving)return;
  try{
   check(!el('correctionConfirm').hidden&&reviewSignature===signature(),'訂正内容を再確認してください。');
   const record=evaluate();check(record,'入力した金額を確認してください。');saving=true;el('correctionSave').disabled=true;
   await onSave(record);dialog.close();dialog.remove();onClose();
  }catch(error){saving=false;el('correctionSave').disabled=false;el('correctionPreview').textContent=error.message;console.error(error);}
 };
 update();baseline=signature();dialog.showModal();el('correctStake').focus({preventScroll:true});
 return dialog;
}

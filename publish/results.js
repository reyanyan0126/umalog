import {check,money,summarize} from './core.js';

// UI choices never change the persisted schema.
export function resultChoice(line){
  if(line.status==='pending')return 'miss';
  if(line.refund>0)return 'advanced'; // preserve even legacy settled full refunds
  return line.payout>0?'hit':'miss';
}
export function resultValue(line,choice,payout=0,refund=0,status=line.status){
  if(choice==='miss')return {status:'settled',payout:0,refund:0};
  if(choice==='refund')return {status:'void',payout:0,refund:line.stake};
  if(choice==='hit'){money(payout);check(payout>0,'的中で受け取った金額を1円以上で入力してください。');return {status:'settled',payout,refund:0};}
  check(choice==='advanced','結果を選択してください。');
  money(payout);money(refund);
  check(['settled','void'].includes(status),'結果の状態が不正です。');
  check(refund<=line.stake,'返還額が購入額を超えています。');
  check(status!=='void'||(!payout&&refund===line.stake),'全額返還では購入額だけが戻ります。');
  check(!(refund===line.stake&&payout>0),'全額返還に払戻は設定できません。');
  return {status,payout,refund};
}

export function mountResults(form,lines,{save,onDirty,notify,guard}){
  const yen=n=>n.toLocaleString('ja-JP')+'円';
  const rows=lines.map(l=>({...l,choice:resultChoice(l)}));
  form.innerHTML='<section class="card"><h2>購入した馬券の結果を記録</h2><p class="help">レース後に手入力します。払戻は実際に受け取った合計額（100円あたりの配当ではありません）。返還は取消などで購入額が戻ることで、的中には含めません。</p><div id="resultRows"></div><p id="resultPreview" role="status"></p><button type="submit" class="full accent">結果を保存・集計に反映</button></section>';
  const container=form.querySelector('#resultRows');
  const choices=[['hit','的中'],['miss','不的中'],['refund','出走取消などで返金'],['advanced','詳細入力（一部返還など）']];
  const select=(values,current)=>values.map(([v,label])=>`<option value="${v}" ${v===current?'selected':''}>${label}</option>`).join('');
  function values(){return rows.map(r=>({...r,...resultValue(r,r.choice,r.payout,r.refund,r.status)}));}
  function preview(){try{const s=summarize(values());form.querySelector('#resultPreview').textContent=`保存後のこの記録の収支：${(s.profit>0?'+':'')+yen(s.profit)}`;}catch(e){form.querySelector('#resultPreview').textContent=e.message;}}
  function draw(){container.innerHTML=rows.map((r,i)=>`<div class="line" data-result-row="${i}"><div class="line-head">${r.numbers.join('－')} <small>購入 ${yen(r.stake)}</small></div><label>馬券の結果<select data-choice="${i}">${select(choices,r.choice)}</select></label><label data-payout-wrap ${!['hit','advanced'].includes(r.choice)?'hidden':''}>的中で受け取った金額（払戻）<input data-payout="${i}" type="number" min="0" step="1" inputmode="numeric" value="${r.payout}"></label><div data-advanced-wrap ${r.choice!=='advanced'?'hidden':''}><label>詳細な状態<select data-state="${i}">${select([['settled','通常'],['void','全額返還のみ']],r.status)}</select></label><label>取消などで戻った金額（返還）<input data-refund="${i}" type="number" min="0" max="${r.stake}" step="1" inputmode="numeric" value="${r.refund}"></label></div><p data-refund-note ${r.choice==='refund'?'':'hidden'}>返還 ${yen(r.stake)}（自動入力）</p></div>`).join('');preview();}
  // Never replace or refocus an open native picker. iOS Safari can reopen its menu.
  container.addEventListener('change',e=>{
    const i=e.target.dataset.choice;
    if(i===undefined)return;
    const row=rows[Number(i)],element=e.target.closest('[data-result-row]');
    row.choice=e.target.value;
    onDirty();
    element.querySelector('[data-payout-wrap]').hidden=!['hit','advanced'].includes(row.choice);
    element.querySelector('[data-advanced-wrap]').hidden=row.choice!=='advanced';
    element.querySelector('[data-refund-note]').hidden=row.choice!=='refund';
    preview();
  });
  container.addEventListener('input',e=>{for(const key of ['payout','refund','state']){const i=e.target.dataset[key];if(i!==undefined){rows[i][key==='state'?'status':key]=key==='state'?e.target.value:(e.target.value===''?NaN:Number(e.target.value));onDirty();preview();}}});
  form.onsubmit=guard(async e=>{e.preventDefault();await save(values().map(({choice,...r})=>r));});
  draw();
}

import {check,money,summarize,summaryWager} from './core.js';

// UI choices never change the persisted schema.
export function resultChoice(line){
  if(line.status==='pending')return 'pending';
  if(line.refund>0)return 'advanced'; // preserve even legacy settled full refunds
  return line.payout>0?'hit':'miss';
}
export function resultValue(line,choice,payout=0,refund=0,status=line.status){
  if(choice==='pending')return {status:'pending',payout:0,refund:0};
  if(choice==='miss')return {status:'settled',payout:0,refund:0};
  if(choice==='refund')return {status:'void',payout:0,refund:line.stake};
  if(choice==='hit'){money(payout);check(payout>0,'的中で受け取った金額を1円以上で入力してください。');return {status:'settled',payout,refund:0};}
  check(choice==='advanced','結果を選択してください。');
  money(payout);money(refund);
  check(['pending','settled','void'].includes(status),'結果の状態が不正です。');
  check(refund<=line.stake,'返還額が購入額を超えています。');
  check(status!=='pending'||(!payout&&!refund),'未入力には受取額を設定できません。');
  check(status!=='void'||(!payout&&refund===line.stake),'全額返還では購入額だけが戻ります。');
  check(!(refund===line.stake&&payout>0),'全額返還に払戻は設定できません。');
  return {status,payout,refund};
}

export function mountResults(form,lines,{save,onDirty,notify,guard}){
 if(lines.length===1&&lines[0].summary===true){
  const line=lines[0],paid=line.status==='pending'?'':String(line.payout);
  form.innerHTML=`<section class="card"><h2>収支の入力・訂正</h2>
  <label>購入合計額<input id="summaryStake" type="number" min="100" step="100" inputmode="numeric" required value="${line.stake}"></label>
  <label>払戻額<input id="summaryPayout" type="number" min="0" step="1" inputmode="numeric" placeholder="結果未入力なら空欄" value="${paid}"></label>
  <details ${line.refund?'open':''}><summary>返還がある場合</summary><label>返還額<input id="summaryRefund" type="number" min="0" step="1" inputmode="numeric" value="${line.refund}"></label></details>
  <p id="resultPreview" role="status"></p><button type="submit" class="full accent">収支を保存</button></section>`;
  const q=key=>form.querySelector(key);
  const compute=()=>summaryWager(q('#summaryStake').value,q('#summaryPayout').value,q('#summaryRefund').value);
  const preview=()=>{try{const v=compute();q('#resultPreview').textContent=v.status==='pending'?'払戻は未入力':'収支 '+(v.payout+v.refund-v.stake>0?'+':'')+(v.payout+v.refund-v.stake).toLocaleString('ja-JP')+'円';}catch(e){q('#resultPreview').textContent=e.message;}};
  form.oninput=()=>{onDirty();preview();};
  form.onsubmit=guard(async e=>{e.preventDefault();await save([{...line,...compute()}]);});
  preview();return;
 }
  const yen=n=>n.toLocaleString('ja-JP')+'円';
  const rows=lines.map(l=>({...l,choice:resultChoice(l)}));
  form.innerHTML='<section class="card"><h2>購入した馬券の結果を記録</h2><p class="help">レース後に手入力します。払戻は実際に受け取った合計額（100円あたりの配当ではありません）。返還は取消などで購入額が戻ることで、的中には含めません。</p><button type="button" id="zero" class="quiet full">未入力をまとめて不的中にする</button><p class="help">未入力の買い目だけを変更します。的中・返還はそのまま保持します。</p><div id="resultRows"></div><p id="resultPreview" role="status"></p><button type="submit" class="full accent">結果を保存・集計に反映</button></section>';
  const container=form.querySelector('#resultRows');
  const choices=[['pending','未入力'],['hit','的中'],['miss','不的中'],['refund','出走取消などで返金'],['advanced','詳細入力（一部返還など）']];
  const select=(values,current)=>values.map(([v,label])=>`<option value="${v}" ${v===current?'selected':''}>${label}</option>`).join('');
  function values(){return rows.map(r=>({...r,...resultValue(r,r.choice,r.payout,r.refund,r.status)}));}
  function preview(){try{const s=summarize(values());form.querySelector('#resultPreview').textContent=`保存後のこの記録の収支：${s.settledCount?(s.profit>0?'+':'')+yen(s.profit):'未計算'} ／ 未入力 ${s.pendingCount}点`;}catch(e){form.querySelector('#resultPreview').textContent=e.message;}}
  function draw(){container.innerHTML=rows.map((r,i)=>`<div class="line" data-result-row="${i}"><div class="line-head">${r.numbers.join('－')} <small>購入 ${yen(r.stake)}</small></div><label>馬券の結果<select data-choice="${i}">${select(choices,r.choice)}</select></label><label data-payout-wrap ${!['hit','advanced'].includes(r.choice)?'hidden':''}>的中で受け取った金額（払戻）<input data-payout="${i}" type="number" min="0" step="1" inputmode="numeric" value="${r.payout}"></label><div data-advanced-wrap ${r.choice!=='advanced'?'hidden':''}><label>詳細な状態<select data-state="${i}">${select([['pending','未入力'],['settled','結果確定'],['void','全額返還のみ']],r.status)}</select></label><label>取消などで戻った金額（返還）<input data-refund="${i}" type="number" min="0" max="${r.stake}" step="1" inputmode="numeric" value="${r.refund}"></label></div><p data-refund-note ${r.choice==='refund'?'':'hidden'}>返還 ${yen(r.stake)}（自動入力）</p></div>`).join('');preview();}
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
  form.querySelector('#zero').onclick=()=>{for(const r of rows)if(r.choice==='pending')r.choice='miss';onDirty();draw();notify('未入力を不的中にしました。保存すると反映されます。');};
  form.onsubmit=guard(async e=>{e.preventDefault();await save(values().map(({choice,...r})=>r));});
  draw();
}

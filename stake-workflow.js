// v2.0.0. Pure local accounting helpers; never submit wagers.
import {check,money,summarize} from './core.js';
import {stakeBreakdown} from './stake-allocation.js';
export function selectedStakeUpdate(lines,ids,amount){
 check(Array.isArray(lines)&&lines.length>0,'買い目を追加してください。');
 const selected=new Set(ids);
 check(selected.size>0&&selected.size===ids.length,'変更する買い目を選択してください。');
 const candidates=new Set(lines.map(l=>l.id));
 check([...selected].every(id=>candidates.has(id)),'選択中の買い目が見つかりません。');
 const next=money(Number(amount),true);
 const output=lines.map(l=>{
  if(!selected.has(l.id))return l;
  check((l.refund??0)<=next,'返還金より少ない購入額には変更できません。');
  check(l.status!=='void'||l.stake===next,'全額返還済みの買い目は詳細から訂正してください。');
  check(!(l.status==='settled'&&l.refund===l.stake&&l.refund>0&&l.stake!==next),'全額返還済みの買い目は詳細から訂正してください。');
  return {...l,stake:next};
 });
 stakeBreakdown(output);
 return output;
}
export function stakeSnapshot(lines){
 check(Array.isArray(lines),'買い目が不正です。');
 return lines.map(l=>({id:l.id,stake:l.stake}));
}
export function restoreStakeSnapshot(lines,snapshot){
 check(Array.isArray(lines)&&Array.isArray(snapshot)&&lines.length===snapshot.length,'買い目構成が変わったため取り消せません。');
 check(lines.every((l,i)=>l.id===snapshot[i]?.id),'買い目構成が変わったため取り消せません。');
 const output=lines.map((l,i)=>({...l,stake:money(snapshot[i].stake,true)}));
 stakeBreakdown(output);
 return output;
}
export function stakeChanges(before,after){
 check(Array.isArray(before)&&Array.isArray(after),'購入記録を比較できません。');
 const original=new Map(before.map(l=>[l.id,l]));
 const changes=after.filter(l=>original.has(l.id)&&original.get(l.id).stake!==l.stake)
  .map(l=>({id:l.id,type:l.type||'',numbers:l.numbers,before:original.get(l.id).stake,after:l.stake,delta:l.stake-original.get(l.id).stake}));
 const oldTotal=before.reduce((n,l)=>n+l.stake,0),newTotal=after.reduce((n,l)=>n+l.stake,0);
 check(Number.isSafeInteger(oldTotal)&&Number.isSafeInteger(newTotal),'金額合計が不正です。');
 return {changed:changes.length,items:changes,oldTotal,newTotal,difference:newTotal-oldTotal,added:after.filter(l=>!original.has(l.id)).length,removed:before.filter(l=>!after.some(x=>x.id===l.id)).length};
}
export function purchaseHistoryOverview(items,linesByTicket){
 check(Array.isArray(items)&&linesByTicket instanceof Map,'購入履歴の形式が不正です。');
 const ids=new Set(items.flatMap(x=>x.tickets.map(t=>t.id)));
 const lines=[...ids].flatMap(id=>linesByTicket.get(id)||[]);
 const result=summarize(lines);
 const rawPurchase=lines.reduce((n,l)=>n+l.stake,0);
 check(Number.isSafeInteger(rawPurchase),'合計金額が不正です。');
 return {ticketCount:ids.size,raceCount:items.length,lineCount:lines.length,recordedPurchase:rawPurchase,
  settledPurchase:result.purchase,receipts:result.payout+result.refund,pendingStake:result.pendingStake,
  pendingCount:result.pendingCount,profit:result.profit,hasSettled:result.settledCount>0,returnRate:result.returnRate};
}

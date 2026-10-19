// dev.16–18: read-only ledger export/summary and optional monthly purchase budget.
import {aggregate,check,money,summarize,validDate,VENUES,TYPES} from './core.js';
import {combinedFinance} from './simple-ledger.js';

const monthRE=/^(20\d\d|21\d\d)-(0[1-9]|1[0-2])$/;
export function validateMonthlyBudgets(obj){
 check(obj&&typeof obj==='object'&&!Array.isArray(obj),'月間予算の設定が不正です。');
 const keys=Object.keys(obj);check(keys.length<=240,'月間予算は最大240か月分まで登録できます。');
 for(const k of keys)check(monthRE.test(k)&&Number.isSafeInteger(obj[k])&&obj[k]>0&&obj[k]<=1000000000000,'月間予算の日付または金額が不正です。');
 return obj;
}
export function setMonthlyBudget(data,month,amount){
 check(monthRE.test(month),'予算の対象月を確認してください。');
 check(Number.isSafeInteger(amount)&&amount>=0&&amount<=1000000000000,'予算は0以上の整数で指定してください。');
 const settings={...data.settings,monthlyBudgets:{...(data.settings.monthlyBudgets||{})}};
 if(amount===0)delete settings.monthlyBudgets[month];
 else settings.monthlyBudgets[month]=amount;
 validateMonthlyBudgets(settings.monthlyBudgets);
 return {...data,settings};
}
export function budgetStatus(data,month){
 check(monthRE.test(month),'対象月を確認してください。');
 const budget=data.settings.monthlyBudgets?.[month]??null;
 const ids=new Set(data.races.filter(r=>r.date.startsWith(month)).map(r=>r.id));
 const tids=new Set(data.tickets.filter(t=>ids.has(t.raceId)).map(t=>t.id));
 const rows=data.lines.filter(l=>tids.has(l.ticketId));
 const quick=(data.simpleEntries||[]).filter(e=>e.date.startsWith(month));
 const purchase=rows.reduce((s,l)=>s+l.stake,0)+quick.reduce((s,e)=>s+e.stake,0);
 const pending=rows.filter(l=>l.status==='pending').reduce((s,l)=>s+l.stake,0)+quick.filter(e=>e.status==='pending').reduce((s,e)=>s+e.stake,0);
 return {month,budget,purchase,pending,remaining:budget===null?null:budget-purchase,ratio:budget===null?null:purchase/budget*100,over:budget!==null&&purchase>budget};
}
export function raceHistory(data){
 const rows=data.races.map(race=>{
  const tickets=data.tickets.filter(t=>t.raceId===race.id);
  const ids=new Set(tickets.map(t=>t.id)),lines=data.lines.filter(l=>ids.has(l.ticketId));
  return {race,tickets,lines,summary:summarize(lines,[race],tickets),stake:lines.reduce((n,l)=>n+l.stake,0)};
 });
 return rows.sort((a,b)=>b.race.date.localeCompare(a.race.date)||b.race.venue.localeCompare(a.race.venue,'ja')||b.race.number-a.race.number);
}
function safeText(value){
 const raw=String(value??'').replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g,' ').replace(/\r?\n/g,' ');
 // Avoid spreadsheet formula execution, even if the first non-whitespace character is a trigger.
 return /^[\s\uFEFF]*[=+\-@]/.test(raw)?"'"+raw:raw;
}
function cell(v,text=false){const s=text?safeText(v):String(v??'');return '"'+s.replace(/"/g,'""')+'"';}
export const CSV_COLUMNS=['開催日','競馬場','レース番号','レース名','券種','組番','購入額','払戻金','返還金','収支','結果','メモ'];
export function ledgerCSV(data){
 const races=new Map(data.races.map(r=>[r.id,r]));
 const tickets=new Map(data.tickets.map(t=>[t.id,t]));
 const ordered=data.lines.map(l=>{const t=tickets.get(l.ticketId),r=t&&races.get(t.raceId);check(t&&r,'不正な買い目の参照が含まれています。');return {l,t,r};})
  .sort((a,b)=>a.r.date.localeCompare(b.r.date)||a.r.venue.localeCompare(b.r.venue,'ja')||a.r.number-b.r.number||a.t.type.localeCompare(b.t.type)||a.l.id.localeCompare(b.l.id));
 const rows=ordered.map(({l,t,r})=>[
  cell(r.date),cell(r.venue,true),cell(r.number),cell(r.name,true),cell(t.type,true),
  cell(l.numbers.join(['馬単','三連単'].includes(t.type)?'→':'－'),true),
  cell(l.stake),cell(l.payout),cell(l.refund),
  cell(l.status==='pending'?'':l.payout+l.refund-l.stake),
  cell(l.status==='pending'?'未入力':l.status==='void'?'全額返還':l.refund>0?'一部返還':l.payout>0?'的中':'不的中'),
  cell(t.memo,true)
 ].join(','));
 const simpleRows=(data.simpleEntries||[]).map(e=>[cell(e.date),cell(e.venue||'',true),cell(e.number??''),cell(e.name||'',true),cell(e.type||'',true),cell('',true),cell(e.stake),cell(e.payout),cell(e.refund),cell(e.status==='pending'?'':e.payout+e.refund-e.stake),cell(e.status==='pending'?'結果待ち（簡易）':'確定（簡易）'),cell(e.memo,true)].join(','));
 return '\uFEFF'+[CSV_COLUMNS.map(h=>cell(h)).join(','),...rows,...simpleRows].join('\r\n')+'\r\n';
}
export function monthReview(data,month){
 const detailed=aggregate(data,r=>r.date.startsWith(month));
 const combined=combinedFinance(data,{prefix:month});
 const totals={...detailed,purchase:combined.settledPurchase,payout:combined.payout,refund:combined.refund,profit:combined.profit,pendingCount:combined.pendingCount,pendingStake:combined.pendingStake,settledCount:combined.settledCount};
 const races=data.races.filter(r=>r.date.startsWith(month)), budget=budgetStatus(data,month);
 const settled=totals.settledCount,units=totals.lineCount;
 const days=new Set([...races.map(r=>r.date),...(data.simpleEntries||[]).filter(e=>e.date.startsWith(month)).map(e=>e.date)]).size;
 const result=settled===0?'まだ結果が確定した記録はありません。':totals.profit>0?'確定済みの収支はプラスです。':totals.profit<0?'確定済みの収支はマイナスです。':'確定済みの収支は±0円です。';
 return {month,totals,budget,days,result,warning:totals.pendingCount>0?'結果未入力の買い目・簡易支出は確定収支から除外しています。':'',notes:budget.budget===null?'月間購入予算は未設定です。':budget.over?'購入額が設定予算を超えています。':'購入額は設定予算内です。'};
}

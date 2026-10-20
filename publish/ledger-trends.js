// Pure monthly ledger facts; do not model horse-performance probabilities.
import {aggregate,validDate} from './core.js';
export function monthlyTrend(data,count=12){
 const dates=data.races.map(r=>r.date).filter(validDate).sort();
 if(!dates.length)return [];
 const last=dates.at(-1).slice(0,7),[y,m]=last.split('-').map(Number);
 const results=[];
 for(let i=count-1;i>=0;i--){
  const d=new Date(Date.UTC(y,m-1-i,1)),month=d.toISOString().slice(0,7);
  const stats=aggregate(data,r=>r.date.startsWith(month));
  results.push({month,purchase:stats.purchase,receipts:stats.payout+stats.refund,profit:stats.profit,pending:stats.pendingStake,settled:stats.settledCount});
 }
 return results;
}
export function ledgerInsights(data,months=6){
 const trend=monthlyTrend(data,months);
 const active=trend.filter(m=>m.purchase>0);
 if(!active.length)return {trend,lines:['この期間に購入記録はありません。'],minimumSample:true};
 const purchased=active.reduce((sum,m)=>sum+m.purchase,0);
 const pending=active.reduce((sum,m)=>sum+m.pending,0);
 const confirmed=active.reduce((sum,m)=>sum+m.settled,0);
 const lines=[`集計期間の記録済み購入額は${purchased.toLocaleString('ja-JP')}円です。`];

 if(confirmed<30)lines.push('記録した買い目が少ないため、回収率などの比較には大きな変動があります。');
 else lines.push('実績は過去の記録に限られ、次の結果を予測するものではありません。');
 return {trend,lines,minimumSample:confirmed<30};
}

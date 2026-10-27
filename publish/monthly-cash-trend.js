// Financial trend projections. All values derive from the cash accounting engine.
import {check} from './core.js';
import {cashFinance} from './simple-ledger.js';

export function monthlyCashTrend(data,{months=12,through=null,venue='',type=''}={}){
 check(Number.isInteger(months)&&months>=1&&months<=36,'表示月数は1〜36か月にしてください。');
 const end=through??new Date(Date.now()+9*3600000).toISOString().slice(0,7);
 check(/^\d{4}-(0[1-9]|1[0-2])$/.test(end)&&Number(end.slice(0,4))>=2000&&Number(end.slice(0,4))<=2199,'集計終了月が不正です。');
 const [year,month]=end.split('-').map(Number);
 check(year*12+month-months+1>=2000*12+1,'集計開始月が対応範囲より前です。');
 const rows=[];
 let cumulative=0;
 for(let offset=months-1;offset>=0;offset--){
  const date=new Date(Date.UTC(year,month-1-offset,1));
  const period=date.toISOString().slice(0,7);
  const totals=cashFinance(data,{prefix:period,venue,type});
  cumulative+=totals.profit;
  rows.push({month:period,purchase:totals.recordedPurchase,receipts:totals.receipts,profit:totals.profit,cumulative,returnRate:totals.returnRate,records:totals.detailCount+totals.simpleCount});
 }
 return rows;
}

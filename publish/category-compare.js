// Category comparisons are descriptive, read-only ledger summaries — not bet recommendations.
import {check} from './core.js';
import {quickBreakdown} from './simple-ledger.js';

export const CATEGORY_SORTS=['settledCount','profit','returnRate'];
export function compareCategories(data,{axis='venue',sort='settledCount',prefix='',venue='',type=''}={}){
 check(axis==='venue'||axis==='type','比較対象は競馬場または券種にしてください。');
 check(CATEGORY_SORTS.includes(sort),'並び替え条件が不正です。');
 const records=quickBreakdown(data,{prefix,venue,type,dimension:axis});
 const unknown=records.find(row=>row.label==='未指定')||null;
 const comparable=records.filter(row=>row.label!=='未指定').map(row=>({
  ...row,
  returnRate:row.settledPurchase>0?row.receipts/row.settledPurchase*100:null,
  lowSample:row.settledCount<30,
  incomplete:row.pendingCount>0
 }));
 const metric=row=>sort==='returnRate'?row.returnRate:row[sort];
 comparable.sort((a,b)=>{
  // Unsettled-only categories must not be presented as zero-yield categories.
  if((a.settledCount===0)!==(b.settledCount===0))return a.settledCount===0?1:-1;
  const x=metric(a),y=metric(b);
  if(x!==y)return (y===null?-Infinity:y)-(x===null?-Infinity:x);
  return b.settledCount-a.settledCount||b.recordedPurchase-a.recordedPurchase||a.label.localeCompare(b.label,'ja');
 });
 return {axis,sort,rows:comparable,
  unknown:unknown?{count:unknown.count,recordedPurchase:unknown.recordedPurchase,pendingCount:unknown.pendingCount}:null,
  lowSampleCount:comparable.filter(row=>row.lowSample).length};
}

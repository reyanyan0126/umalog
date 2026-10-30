import {check,summarize as oldSummarize} from './core.js';
import {cashFinance as combinedFinance,groupedCashFinance} from './simple-ledger.js';
import {analysisCoverage as oldAnalysisCoverage} from './analysis-quality.js';
import {compareCategories as oldCompareCategories} from './category-compare.js';
// Cash-flow projections: old pending records remain readable, but no cost is excluded.
export const summarize=(lines,races=[],tickets=[])=>{
 const x=oldSummarize(lines,races,tickets);
 const purchase=x.purchase+x.pendingStake,receipts=x.payout+x.refund;
 const effective=x.lineCount+x.pendingCount;
 return {...x,purchase,profit:receipts-purchase,returnRate:purchase?receipts/purchase*100:null,
  lineCount:effective,lineRate:effective?x.lineHits/effective*100:null,
  pendingCount:0,pendingStake:0,settledCount:lines.length};
};
export const aggregate=(ledger,predicate=()=>true)=>{
 const races=ledger.races.filter(predicate),ids=new Set(races.map(r=>r.id));
 const tickets=ledger.tickets.filter(t=>ids.has(t.raceId)),tids=new Set(tickets.map(t=>t.id));
 return summarize(ledger.lines.filter(l=>tids.has(l.ticketId)),races,tickets);
};
export const analysisCoverage=(ledger,opts={})=>{
 const x=oldAnalysisCoverage(ledger,opts),finance=combinedFinance(ledger,opts);
 return {...x,finance,pendingCount:0,pendingStake:0,settledCount:x.total,settledCountShare:x.total?100:null,settledShare:finance.recordedPurchase?100:null};
};
export const inclusiveMonthlyRows=(ledger,{limit=6,...opts}={})=>{
 check(Number.isInteger(limit)&&limit>=1&&limit<=24,'表示月数は1〜24か月の範囲で指定してください。');
 const grouped=groupedCashFinance(ledger,{...opts,dimension:'month'});
 return [...grouped.keys()].sort().slice(-limit).map(month=>{const c=grouped.get(month);return {month,...c,settledShare:c.recordedPurchase?100:null};});
};
export const compareCategories=(ledger,opts={})=>{
 const out=oldCompareCategories(ledger,opts);
 const convert=r=>({...r,settledPurchase:r.recordedPurchase,profit:r.receipts-r.recordedPurchase,
   returnRate:r.recordedPurchase?r.receipts/r.recordedPurchase*100:null,pendingCount:0,pendingStake:0,
   settledCount:r.count,incomplete:false});
 return {...out,rows:out.rows.map(convert).sort((a,b)=>opts.sort==='profit'?b.profit-a.profit:opts.sort==='returnRate'?(b.returnRate??-Infinity)-(a.returnRate??-Infinity):b.count-a.count),
  unknown:out.unknown?{...out.unknown,pendingCount:0}:null};
};

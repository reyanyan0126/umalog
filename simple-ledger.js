// v2.1.0 lightweight accounting entries coexist with detailed horse-racing tickets.
// They are never converted into synthetic detailed bets, so purchase totals cannot double-count.
import {check,money,validDate,VENUES,TYPES,summarize,MAX_MONEY} from './core.js';
const MAX=100000;
const allowedKeys=new Set(['id','date','stake','venue','number','type','name','memo','status','payout','refund']);
const knownString=(v,max)=>typeof v==='string'&&v.length<=max;
export function validateSimpleEntries(entries){
 check(entries===undefined||Array.isArray(entries)&&entries.length<=MAX,'簡易収支記録の形式が不正です。');
 const seen=new Set();
 for(const e of entries||[]){
  check(e&&typeof e==='object'&&!Array.isArray(e),'簡易収支記録の内容が不正です。');
  check(Object.keys(e).every(k=>allowedKeys.has(k)),'簡易記録に不明な項目があります。');
  check(knownString(e.id,100)&&e.id.length>0&&!seen.has(e.id),'簡易記録のIDが欠落・重複しています。');seen.add(e.id);
  check(validDate(e.date),'簡易記録の購入日が不正です。');
  money(e.stake,true);
  check(e.venue===null||VENUES.includes(e.venue),'簡易記録の競馬場が不正です。');
  check(e.number===null||Number.isInteger(e.number)&&e.number>=1&&e.number<=12,'簡易記録のレース番号が不正です。');
  check(e.type===null||TYPES.includes(e.type),'簡易記録の券種が不正です。');
  check(knownString(e.name,100)&&knownString(e.memo,4000),'簡易記録のメモが不正です。');
  check(['pending','settled'].includes(e.status),'簡易記録の結果入力状況が不正です。');
  money(e.payout);money(e.refund);
  check(e.refund<=e.stake,'返還金は購入額以下にしてください。');
  check(!(e.refund===e.stake&&e.payout>0),'全額返還と払戻は同時に設定できません。');
  check(e.status!=='pending'||e.payout===0&&e.refund===0,'結果未入力では払戻・返還金を保存できません。');
 }
 return entries||[];
}
export function makeSimpleEntry(input,id){
 check(typeof id==='string'&&id.length>0&&id.length<=100,'記録IDが不正です。');
 check(input&&typeof input==='object','入力内容が不正です。');
 const venue=input.venue||null,number=input.number===''||input.number===null||input.number===undefined?null:Number(input.number);
 const type=input.type||null,settled=input.status==='settled';
 const value={id,date:input.date,stake:money(Number(input.stake),true),venue,number,type,name:(input.name||'').trim(),memo:(input.memo||'').trim(),status:settled?'settled':'pending',payout:settled?money(Number(input.payout||0)):0,refund:settled?money(Number(input.refund||0)):0};
 validateSimpleEntries([value]);return value;
}

export function recentSimpleTemplates(entries,limit=3){
 check(Number.isInteger(limit)&&limit>=0&&limit<=10,'再利用候補の件数が不正です。');
 if(limit===0)return [];
 const ordered=validateSimpleEntries(entries).map((entry,index)=>({entry,index}))
  .sort((a,b)=>b.entry.date.localeCompare(a.entry.date)||b.index-a.index);
 const seen=new Set(),templates=[];
 for(const {entry} of ordered){
  const key=JSON.stringify([entry.stake,entry.venue,entry.type]);
  if(seen.has(key))continue;
  seen.add(key);
  templates.push({stake:entry.stake,venue:entry.venue,type:entry.type,sourceDate:entry.date});
  if(templates.length===limit)break;
 }
 return templates;
}
const validPeriodPrefix=prefix=>typeof prefix==='string'&&(prefix===''||/^\d{4}$/.test(prefix)&&Number(prefix)>=2000&&Number(prefix)<=2199||/^\d{4}-(0[1-9]|1[0-2])$/.test(prefix)&&Number(prefix.slice(0,4))>=2000&&Number(prefix.slice(0,4))<=2199||validDate(prefix));
export function combinedFinance(data,{prefix='',venue='',type=''}={}){
 check(validPeriodPrefix(prefix),'集計対象期間が不正です。');
 check(!venue||VENUES.includes(venue),'競馬場の指定が不正です。');
 check(!type||TYPES.includes(type),'券種の指定が不正です。');
 const raceById=new Map(data.races.map(r=>[r.id,r])),ticketById=new Map(data.tickets.map(t=>[t.id,t]));
 const detail=data.lines.filter(l=>{
  const t=ticketById.get(l.ticketId),r=t&&raceById.get(t.raceId);
  return r&&r.date.startsWith(prefix)&&(!venue||r.venue===venue)&&(!type||t.type===type);
 });
 const quick=validateSimpleEntries(data.simpleEntries).filter(e=>e.date.startsWith(prefix)&&(!venue||e.venue===venue)&&(!type||e.type===type));
 const d=summarize(detail);
 const simpleRecorded=quick.reduce((n,e)=>n+e.stake,0),allRecorded=detail.reduce((n,l)=>n+l.stake,0)+simpleRecorded;
 const settled=quick.filter(e=>e.status==='settled'),pending=quick.filter(e=>e.status==='pending');
 const sum=(rows,key)=>rows.reduce((n,e)=>n+e[key],0);
 const stakeSettled=d.purchase+sum(settled,'stake'),payout=d.payout+sum(settled,'payout'),refund=d.refund+sum(settled,'refund');
 const allReceipts=payout+refund,unknown=d.pendingStake+sum(pending,'stake'),rawNet=allReceipts-allRecorded;
 check([allRecorded,stakeSettled,payout,refund,allReceipts,unknown].every(x=>Number.isSafeInteger(x)&&x<=MAX_MONEY),'収支集計の上限を超えています。');
 return {recordedPurchase:allRecorded,receipts:allReceipts,tentativeNet:rawNet,settledPurchase:stakeSettled,payout,refund,profit:allReceipts-stakeSettled,returnRate:stakeSettled?allReceipts/stakeSettled*100:null,pendingStake:unknown,pendingCount:d.pendingCount+pending.length,settledCount:d.settledCount+settled.length,detailCount:detail.length,simpleCount:quick.length,
  coverage:{all:detail.length+quick.length,venue:detail.length+quick.filter(e=>e.venue!==null).length,number:detail.length+quick.filter(e=>e.number!==null).length,type:detail.length+quick.filter(e=>e.type!==null).length,combination:detail.length}};
}
export function quickBreakdown(data,{prefix='',dimension='venue',venue='',type=''}={}){
 check(['venue','type','date'].includes(dimension),'分析軸が不正です。');
 check(validPeriodPrefix(prefix),'集計対象期間が不正です。');
 check(!venue||VENUES.includes(venue),'競馬場の指定が不正です。');
 check(!type||TYPES.includes(type),'券種の指定が不正です。');
 const quick=validateSimpleEntries(data.simpleEntries).filter(e=>e.date.startsWith(prefix)&&(!venue||e.venue===venue)&&(!type||e.type===type));
 const raceById=new Map(data.races.map(r=>[r.id,r])),ticketById=new Map(data.tickets.map(t=>[t.id,t]));
 const buckets=new Map();
 const add=(key,stake,payout,refund,pending)=>{const k=key??'未指定';if(!buckets.has(k))buckets.set(k,{label:k,count:0,settledCount:0,pendingCount:0,recordedPurchase:0,settledPurchase:0,receipts:0,pendingStake:0});const b=buckets.get(k);b.count++;if(pending)b.pendingCount++;else b.settledCount++;b.recordedPurchase+=stake;b.settledPurchase+=pending?0:stake;b.receipts+=payout+refund;b.pendingStake+=pending?stake:0;};
 for(const l of data.lines){
  const t=ticketById.get(l.ticketId),r=t&&raceById.get(t.raceId);if(!r||!r.date.startsWith(prefix)||venue&&r.venue!==venue||type&&t.type!==type)continue;
  const key=dimension==='date'?r.date:dimension==='venue'?r.venue:t.type;
  add(key,l.stake,l.payout,l.refund,l.status==='pending');
 }
 for(const e of quick){add(dimension==='date'?e.date:e[dimension],e.stake,e.payout,e.refund,e.status==='pending');}
 return [...buckets.values()].map(b=>({...b,profit:b.receipts-b.settledPurchase})).sort((a,b)=>b.recordedPurchase-a.recordedPurchase||a.label.localeCompare(b.label,'ja'));
}

/* v2.5 cash-flow view. Legacy status fields remain valid for old backups;
   all recorded stakes are expenses immediately, and only recorded receipts are income. */
export function cashFinance(data,options={}){
 const s=combinedFinance(data,options);
 const recorded=s.recordedPurchase,receipts=s.receipts;
 return {...s,settledPurchase:recorded,profit:receipts-recorded,
  returnRate:recorded?receipts/recorded*100:null,pendingStake:0,pendingCount:0,
  settledCount:s.detailCount+s.simpleCount,tentativeNet:receipts-recorded};
}
export function cashQuickBreakdown(data,options={}){
 return quickBreakdown(data,options).map(x=>({...x,
  settledPurchase:x.recordedPurchase,profit:x.receipts-x.recordedPurchase,
  pendingCount:0,pendingStake:0,settledCount:x.count}));
}

// v2.3.0-dev.1: read-only quality and period facts across detailed and simple entries.
// All money uses the exact same settled/pending rules as combinedFinance.
import {check,VENUES,TYPES} from './core.js';
import {combinedFinance,validateSimpleEntries} from './simple-ledger.js';

const percent=(part,total)=>total>0?part/total*100:null;
const matches=(record,opts)=>record.date.startsWith(opts.prefix)&&
 (!opts.venue||record.venue===opts.venue)&&(!opts.type||record.type===opts.type);

export function analysisCoverage(data,options={}){
 const {prefix='',venue='',type=''}=options;
 const scope={prefix,venue,type};
 const finance=combinedFinance(data,scope);
 const raceById=new Map(data.races.map(r=>[r.id,r]));
 const ticketById=new Map(data.tickets.map(t=>[t.id,t]));
 let venueStake=0,typeStake=0;
 for(const line of data.lines){
  const ticket=ticketById.get(line.ticketId),race=ticket&&raceById.get(ticket.raceId);
  if(!race||!matches({date:race.date,venue:race.venue,type:ticket.type},scope))continue;
  venueStake+=line.stake;typeStake+=line.stake;
 }
 for(const row of validateSimpleEntries(data.simpleEntries)){
  if(!matches(row,scope))continue;
  if(row.venue!==null)venueStake+=row.stake;
  if(row.type!==null)typeStake+=row.stake;
 }
 const total=finance.coverage.all,settledCount=total-finance.pendingCount;
 return {finance,
  total,detailCount:finance.detailCount,simpleCount:finance.simpleCount,
  settledCount,pendingCount:finance.pendingCount,
  settledShare:percent(finance.settledPurchase,finance.recordedPurchase),
  settledCountShare:percent(settledCount,total),
  venueCount:finance.coverage.venue,
  typeCount:finance.coverage.type,
  venueShare:percent(venueStake,finance.recordedPurchase),
  typeShare:percent(typeStake,finance.recordedPurchase),
  venueCountShare:percent(finance.coverage.venue,total),
  typeCountShare:percent(finance.coverage.type,total),
  pendingStake:finance.pendingStake
 };
}

export function inclusiveMonthlyRows(data,options={}){
 const {prefix='',venue='',type='',limit=6}=options;
 check(Number.isInteger(limit)&&limit>=1&&limit<=24,'表示月数は1〜24か月の範囲で指定してください。');
 // Let combinedFinance validate the same filters as the rest of analysis.
 combinedFinance(data,{prefix,venue,type});
 const raceById=new Map(data.races.map(r=>[r.id,r]));
 const ticketById=new Map(data.tickets.map(t=>[t.id,t]));
 const months=new Set();
 for(const line of data.lines){
  const ticket=ticketById.get(line.ticketId),race=ticket&&raceById.get(ticket.raceId);
  if(race&&matches({date:race.date,venue:race.venue,type:ticket.type},{prefix,venue,type}))months.add(race.date.slice(0,7));
 }
 for(const row of validateSimpleEntries(data.simpleEntries)){
  if(matches(row,{prefix,venue,type}))months.add(row.date.slice(0,7));
 }
 return [...months].sort().slice(-limit).map(month=>{
  const finance=combinedFinance(data,{prefix:month,venue,type});
  return {month,...finance,settledShare:percent(finance.settledPurchase,finance.recordedPurchase)};
 });
}

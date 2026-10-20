// dev22-30: read-only, consistent projections for dedicated screens.
// Never infer racing ability or probabilities from personal betting receipts.
import {aggregate,summarize,TYPES,VENUES} from './core.js';
const money=n=>n.toLocaleString('ja-JP')+'円';
export function homeSummary(data,month){
 if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(month))throw new Error('表示する月が不正です。');
 const s=aggregate(data,r=>r.date.startsWith(month));
 return {month,purchase:s.purchase,payout:s.payout,refund:s.refund,profit:s.profit,settledCount:s.settledCount,pendingCount:s.pendingCount,pendingStake:s.pendingStake};
}
export function ticketIndex(data){
 const ticketsByRace=new Map(),linesByTicket=new Map();
 for(const t of data.tickets){if(!ticketsByRace.has(t.raceId))ticketsByRace.set(t.raceId,[]);ticketsByRace.get(t.raceId).push(t);}
 for(const l of data.lines){if(!linesByTicket.has(l.ticketId))linesByTicket.set(l.ticketId,[]);linesByTicket.get(l.ticketId).push(l);}
 return {ticketsByRace,linesByTicket};
}
export function raceHistoryRows(data){
 const {ticketsByRace,linesByTicket}=ticketIndex(data);
 return data.races.map(race=>{
  const tickets=ticketsByRace.get(race.id)||[],lines=tickets.flatMap(t=>linesByTicket.get(t.id)||[]);
  return {race,tickets,lines,summary:summarize(lines,[race],tickets),stake:lines.reduce((n,l)=>n+l.stake,0)};
 }).sort((a,b)=>b.race.date.localeCompare(a.race.date)||b.race.venue.localeCompare(a.race.venue,'ja')||b.race.number-a.race.number);
}
export function matchesRaceQuery(item,text){
 const q=text.normalize('NFKC').toLocaleLowerCase('ja').trim();
 if(!q)return true;
 return [item.race.date,item.race.venue,String(item.race.number),item.race.name,...item.tickets.flatMap(t=>[t.type,t.memo])]
  .some(x=>String(x||'').normalize('NFKC').toLocaleLowerCase('ja').includes(q));
}
export function typeVenueMatrix(data){
 const ticketById=new Map(data.tickets.map(t=>[t.id,t])),raceById=new Map(data.races.map(r=>[r.id,r]));
 const buckets=new Map();
 for(const l of data.lines){
  const t=ticketById.get(l.ticketId),r=t&&raceById.get(t.raceId);if(!r)continue;
  const key=r.venue+'|'+t.type;
  if(!buckets.has(key))buckets.set(key,[]);
  buckets.get(key).push(l);
 }
 return VENUES.map(venue=>({venue,types:TYPES.map(type=>{
  const lines=buckets.get(venue+'|'+type)||[],stat=summarize(lines);
  return {type,stake:lines.reduce((n,l)=>n+l.stake,0),profit:stat.profit,returnRate:stat.returnRate,settledCount:stat.settledCount,pending:stat.pendingCount,lines:lines.length,description:stat.settledCount?'収支 '+money(stat.profit):'記録なし'};
 })}));
}
export function calendarMetricValue(summary,metric='profit'){
 if(!summary)return null;
 if(metric==='purchase')return summary.purchase;
 if(metric==='receipt')return summary.payout+summary.refund;
 if(metric==='profit')return summary.settledCount?summary.profit:null;
 throw new Error('表示指標が不正です。');
}

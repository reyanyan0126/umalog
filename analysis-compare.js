// v1.5.0: read-only comparison of two adjacent calendar periods in Japan.
// Uses the same settled/pending/refund accounting as the main ledger.
import {VENUES,TYPES,addDays,aggregate,check,jstToday,summarize,validDate} from './core.js';
export function periodComparison(data,today=jstToday(),days=30){
 check(validDate(today)&&Number.isInteger(days)&&days>=1&&days<=366,'比較期間が不正です。');
 const recent={start:addDays(today,1-days),end:today};
 const prior={start:addDays(today,1-2*days),end:addDays(today,-days)};
 const within=(r,w)=>r.date>=w.start&&r.date<=w.end;
 const snapshots=[recent,prior].map(w=>({...w,summary:aggregate(data,r=>within(r,w))}));
 const current=snapshots[0].summary,previous=snapshots[1].summary;
 const ticketById=new Map(data.tickets.map(t=>[t.id,t]));
 const raceById=new Map(data.races.map(r=>[r.id,r]));
 const grouped={type:new Map(TYPES.map(k=>[k,[]])),venue:new Map(VENUES.map(k=>[k,[]]))};
 for(const line of data.lines){
  const ticket=ticketById.get(line.ticketId),race=ticket&&raceById.get(ticket.raceId);
  if(!race||!within(race,recent))continue;
  grouped.type.get(ticket.type)?.push(line);
  grouped.venue.get(race.venue)?.push(line);
 }
 const segments=key=>[...grouped[key]].map(([label,lines])=>{
  const summary=summarize(lines);
  return {label,...summary,recordedStake:summary.purchase+summary.pendingStake};
 }).filter(row=>row.recordedStake>0).sort((a,b)=>b.recordedStake-a.recordedStake||a.label.localeCompare(b.label,'ja'));
 const rateDelta=current.returnRate===null||previous.returnRate===null?null:current.returnRate-previous.returnRate;
 return {today,days,recent:snapshots[0],previous:snapshots[1],
  profitDelta:current.settledCount&&previous.settledCount?current.profit-previous.profit:null,
  rateDelta,byType:segments('type'),byVenue:segments('venue'),
  lowSample:current.lineCount<30||previous.lineCount<30};
}

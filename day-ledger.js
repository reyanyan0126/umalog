// Read-only daily ledger. No purchases or settlement fields are modified here.
import {aggregate,check,combination,raceKey,summarize,validDate} from './core.js';

export function dayLedger(data,date){
 check(validDate(date),'日付を確認してください。');
 const races=data.races.filter(r=>r.date===date).sort((a,b)=>a.venue.localeCompare(b.venue,'ja')||a.number-b.number);
 const byRace=races.map(race=>{
  const tickets=data.tickets.filter(t=>t.raceId===race.id);
  const ids=new Set(tickets.map(t=>t.id));
  const lines=data.lines.filter(l=>ids.has(l.ticketId));
  return {race,tickets,lines,summary:summarize(lines,[race],tickets)};
 });
 return {date,entries:byRace,summary:aggregate(data,r=>r.date===date),raceCount:byRace.length};
}

// Compare canonical ticket types/numbers within the SAME meeting; never merge paid purchases.
export function existingPurchaseDuplicates(data,raceInfo,lines,excludeTicketId=null){
 const race=data.races.find(r=>raceKey(r)===raceKey(raceInfo));
 if(!race)return [];
 const tickets=data.tickets.filter(t=>t.raceId===race.id&&t.id!==excludeTicketId);
 const types=new Map(tickets.map(t=>[t.id,t.type]));
 const existing=new Map();
 for(const line of data.lines){const type=types.get(line.ticketId);if(!type)continue;
  const key=type+'|'+combination(type,line.numbers).join(',');
  existing.set(key,(existing.get(key)||0)+1);
 }
 return lines.map((line,index)=>({index,type:line.type,numbers:line.numbers,found:existing.get(line.type+'|'+combination(line.type,line.numbers).join(','))||0})).filter(row=>row.found>0);
}

export function periodInsights(data){
 const dates=[...new Set(data.races.map(r=>r.date))].sort();
 const days=dates.map(date=>dayLedger(data,date)).filter(d=>d.summary.settledCount>0);
 const wins=days.filter(d=>d.summary.profit>0).length,losses=days.filter(d=>d.summary.profit<0).length;
 const neutrals=days.length-wins-losses;
 const best=days.reduce((v,d)=>!v||d.summary.profit>v.summary.profit?d:v,null);
 const worst=days.reduce((v,d)=>!v||d.summary.profit<v.summary.profit?d:v,null);
 const monthMap=new Map();
 for(const day of days){const key=day.date.slice(0,7);monthMap.set(key,(monthMap.get(key)||0)+day.summary.profit);}
 let cumulative=0;
 const cumulativeMonths=[...monthMap].sort(([a],[b])=>a.localeCompare(b)).map(([month,profit])=>({month,profit,cumulative:(cumulative+=profit)}));
 return {days:days.length,wins,losses,neutrals,winDayRate:days.length?wins/days.length*100:null,best,worst,cumulativeMonths};
}

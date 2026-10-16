// Read-only style analysis. Never modifies settlement, growth or backup data.
import {summarize,raceKey} from './core.js';
export const UNKNOWN='情報未取得';
export function distanceBand(n){return !n?UNKNOWN:n<=1400?'1400m以下':n<=1800?'1401〜1800m':n<=2200?'1801〜2200m':n<=2800?'2201〜2800m':'2801m以上';}
export function styleAnalysis(data,records=[]){
 const metadata=new Map(records.map(r=>[raceKey(r),r]));
 const races=new Map(data.races.map(r=>[r.id,r]));
 const linesByTicket=new Map();for(const l of data.lines){if(!linesByTicket.has(l.ticketId))linesByTicket.set(l.ticketId,[]);linesByTicket.get(l.ticketId).push(l);}
 const rows=data.tickets.map(t=>{const race=races.get(t.raceId),lines=linesByTicket.get(t.id)||[];return {t,race,lines,meta:metadata.get(raceKey(race)),stake:lines.reduce((s,l)=>s+l.stake,0)};});
 const totalStake=rows.reduce((s,r)=>s+r.stake,0);
 function group(key){const groups=new Map();for(const r of rows){const k=key(r);if(!groups.has(k))groups.set(k,[]);groups.get(k).push(r);}
  return [...groups].map(([label,rs])=>{const ls=rs.flatMap(r=>r.lines),stake=rs.reduce((s,r)=>s+r.stake,0),uniqueRaces=[...new Map(rs.map(r=>[r.race.id,r.race])).values()];
   return {label,records:rs.length,races:uniqueRaces.length,points:ls.length,stake,share:totalStake?stake/totalStake*100:null,averagePoints:ls.length/rs.length,averageStake:stake/rs.length,...summarize(ls,uniqueRaces,rs.map(r=>r.t))};
  }).sort((a,b)=>b.stake-a.stake||a.label.localeCompare(b.label,'ja'));}
 return {totalStake,records:rows.length,points:data.lines.length,races:new Set(rows.map(r=>r.race.id)).size,
  matchedRaces:new Set(rows.filter(r=>r.meta).map(r=>r.race.id)).size,
  groups:{type:group(r=>r.t.type),venue:group(r=>r.race.venue),condition:group(r=>r.meta?.condition||UNKNOWN),grade:group(r=>r.meta?.grade||UNKNOWN),surface:group(r=>r.meta?.surface||UNKNOWN),distance:group(r=>distanceBand(r.meta?.distance)),points:group(r=>r.lines.length<=5?'1〜5点':r.lines.length<=10?'6〜10点':'11点以上'),amount:group(r=>r.stake<=1000?'1,000円以下':r.stake<=3000?'1,001〜3,000円':r.stake<=10000?'3,001〜10,000円':'10,001円以上')}};
}
export function sampleComment(row){
 if(!row.lineCount)return '有効な確定買い目がなく、成績はまだ判断できません。';
 return `対象区分内で全行確定した有効レースは${row.raceCount}件。${row.raceCount<30?'少数の記録による参考値です。':'過去の記録の集計です。'}同一レースの買い目は独立した試行ではありません。得意条件や今後の利益は断定できません。`;
}

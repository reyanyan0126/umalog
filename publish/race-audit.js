// v1.8.0 read-only status index of saved race metadata.
// All statuses describe LOCAL records; none attest JRA verification or rights.
import {validateCalendar,meetingKey} from './calendar.js';
import {VENUES,check,raceKey} from './core.js';
export const RACE_AUDIT_LABELS=Object.freeze({
 blocked:'開催変更・中止（要確認）',
 pending:'認可前（要確認）',
 unknown:'認可状態が不明（要確認）',
 grade:'格付け未確定（要確認）',
 other:'その他（内容の保証なし）'
});
export function raceAudit(calendar){
 const data=validateCalendar(calendar);
 const meetings=new Map(data.meetings.map(m=>[meetingKey(m),m]));
 const records=data.races.map(r=>{
  const meeting=meetings.get(meetingKey(r));
  const status=['cancelled','changed'].includes(meeting?.status)||['cancelled','changed'].includes(r.status)?'blocked':
   r.approval==='pending'?'pending':
   r.approval==='unknown'?'unknown':
   r.gradeStatus==='pending'?'grade':'other';
  return {...r,key:raceKey(r),auditStatus:status,meetingStatus:meeting?.status||'unknown'};
 }).sort((a,b)=>b.date.localeCompare(a.date)||a.venue.localeCompare(b.venue,'ja')||a.number-b.number);
 const counts={all:records.length,attention:0,blocked:0,pending:0,unknown:0,grade:0,other:0};
 for(const r of records){counts[r.auditStatus]++;if(r.auditStatus!=='other')counts.attention++;}
 return {records,counts};
}
export function filterRaceAudit(audit,{status='attention',venue='all',query='',limit=40}={}){
 check(audit?.records&&audit.counts&&['all','attention',...Object.keys(RACE_AUDIT_LABELS)].includes(status),'絞り込み条件が不正です。');
 check(venue==='all'||VENUES.includes(venue),'競馬場が不正です。');
 check(typeof query==='string'&&query.length<=200,'検索文字は200文字以内です。');
 check(Number.isInteger(limit)&&limit>=1&&limit<=30000,'表示件数が不正です。');
 const search=query.trim().normalize('NFKC').toLocaleLowerCase('ja-JP');
 const matches=audit.records.filter(r=>
  (status==='all'||status==='attention'&&r.auditStatus!=='other'||status===r.auditStatus)&&
  (venue==='all'||r.venue===venue)&&
  (!search||[r.date,r.venue,String(r.number),r.name||'',r.sourceURL,r.surface||''].some(v=>v.normalize('NFKC').toLocaleLowerCase('ja-JP').includes(search)))
 );
 return {total:matches.length,visible:matches.slice(0,limit),hasMore:matches.length>limit};
}

// v1.7.1: metadata-only correction of unverified race records.
import {raceKey,check} from './core.js';
import {validateCalendar} from './calendar.js';
import {planManualRace} from './manual-race.js';
// Without a historical origin flag, these are conservatively labelled "manual-compatible"
// rather than asserting that every match came from a user.
export const eligibleManualRace=r=>r?.approval==='unknown'&&r.status==='program'&&r.sourceUpdatedAt===null&&r.condition===null&&r.grade===null&&r.proposedGrade===null&&r.gradeStatus==='unknown'&&r.startTime===null&&r.eventId===undefined;
export function editableManualRaces(calendar){
 return validateCalendar(calendar).races.filter(eligibleManualRace).sort((a,b)=>b.date.localeCompare(a.date)||a.venue.localeCompare(b.venue,'ja')||a.number-b.number);
}
export function planManualCorrection(calendar,key,input,at=new Date().toISOString()){
 const previous=validateCalendar(calendar),before=previous.races.find(r=>raceKey(r)===key);
 check(before&&eligibleManualRace(before),'このレースは手入力形式の訂正対象ではありません。開催JSONから確認してください。');
 const parsed={
  date:before.date,venue:before.venue,number:before.number,
  name:input?.name,surface:input?.surface,distance:input?.distance,sourceURL:input?.sourceURL
 };
 const without={...previous,races:previous.races.filter(r=>raceKey(r)!==key)};
 const plan=planManualRace(without,parsed,at);
 const after=plan.calendar.races.find(r=>raceKey(r)===key);
 check(after&&raceKey(after)===key,'訂正時にレース照合キーを変更できません。');
 check(['name','surface','distance','sourceURL'].some(k=>before[k]!==after[k]),'登録済みの情報と変更がありません。');
 // The primary key remains intact; do not relocate tickets or manipulate results.
 return {calendar:plan.calendar,before,after,key,changed:['name','surface','distance','sourceURL'].filter(k=>before[k]!==after[k])};
}

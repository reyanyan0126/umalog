// Small independently arranged factual selection, manually checked against the URLs below.
// Not a copy of the JRA calendar download, database, article or table layout.
// Partial coverage only. See DEV3-DATA.md for sources, scope and limitations.
import {emptyCalendar,validateCalendar,meetingKey} from './calendar.js';
import {raceKey} from './core.js';
const checked='2026-10-16T23:13:51Z';
const c=emptyCalendar();
function add({id,date,venue,name,grade,number=null,distance,surface,meetingNumber,dayNumber,startTime=null,proposedGrade=null}){const future=date.startsWith('2027'),sourceURL=future?'https://www.jra.go.jp/keiba/program/2027/pdf/henkou.pdf':`https://jra.jp/keiba/calendar2026/2026/10/${date.slice(5).replace('-','')}.html`,base={date,venue,status:future?'planned':'program',approval:future?'pending':'approved',sourceURL,sourceUpdatedAt:null,retrievedAt:checked};c.meetings.push({...base,meetingNumber,dayNumber});const r={...base,eventId:id,name,grade,number,distance,surface,startTime,condition:null,gradeStatus:proposedGrade?'pending':'confirmed',proposedGrade};if(number===null){delete r.number;c.featuredEvents.push(r);}else c.races.push(r);}
add({id:'jra-2026-fuji',date:'2026-10-17',venue:'東京',name:'富士ステークス',grade:'GⅡ',number:11,distance:1600,surface:'芝',meetingNumber:4,dayNumber:6,startTime:'15:45'});
add({id:'jra-2026-tokyo-high-jump',date:'2026-10-18',venue:'東京',name:'東京ハイジャンプ',grade:'J・GⅡ',number:9,distance:3110,surface:'障害',meetingNumber:4,dayNumber:7,startTime:'14:10'});
add({id:'jra-2026-shuka',date:'2026-10-18',venue:'京都',name:'秋華賞',grade:'GⅠ',number:11,distance:2000,surface:'芝',meetingNumber:4,dayNumber:7,startTime:'15:40'});
add({id:'jra-2026-artemis',date:'2026-10-24',venue:'東京',name:'アルテミスステークス',grade:'GⅢ',number:11,distance:1600,surface:'芝',meetingNumber:4,dayNumber:8,startTime:'15:45'});
add({id:'jra-2026-kikka',date:'2026-10-25',venue:'京都',name:'菊花賞',grade:'GⅠ',number:11,distance:3000,surface:'芝',meetingNumber:4,dayNumber:9,startTime:'15:40'});
add({id:'jra-2027-negishi',date:'2027-01-31',venue:'東京',name:'根岸ステークス',grade:'GⅢ',proposedGrade:'GⅡ',distance:1400,surface:'ダート',meetingNumber:1,dayNumber:2});
add({id:'jra-2027-ocean',date:'2027-02-27',venue:'中山',name:'オーシャンステークス',grade:'GⅢ',proposedGrade:'GⅡ',distance:1200,surface:'芝',meetingNumber:2,dayNumber:1});
add({id:'jra-2027-kyoto-jump',date:'2027-05-15',venue:'京都',name:'京都ジャンプステークス',grade:'J・GⅢ',distance:3170,surface:'障害',meetingNumber:3,dayNumber:5});
add({id:'jra-2027-fukushima-jump',date:'2027-07-03',venue:'福島',name:'福島ジャンプステークス',grade:'J・GⅢ',distance:3350,surface:'障害',meetingNumber:2,dayNumber:3});
add({id:'jra-2027-tokyo-high-jump',date:'2027-10-09',venue:'東京',name:'東京ハイジャンプ',grade:'J・GⅡ',distance:3110,surface:'障害',meetingNumber:4,dayNumber:3});
add({id:'jra-2027-hopeful',date:'2027-12-28',venue:'中山',name:'ホープフルステークス',grade:'GⅠ',distance:2000,surface:'芝',meetingNumber:5,dayNumber:9});
export const GRADED_MASTER=validateCalendar(c);
// User imports have explicit priority, including cancellations and loss of a known number.
// Stable eventId is required for simultaneous date/venue/name corrections.
export function withMaster(local){const out=structuredClone(GRADED_MASTER);for(const row of [...local.featuredEvents,...local.races].sort((a,b)=>Date.parse(a.retrievedAt)-Date.parse(b.retrievedAt))){const same=r=>(row.eventId&&r.eventId===row.eventId)||(row.number&&r.number&&raceKey(row)===raceKey(r))||(row.date===r.date&&row.venue===r.venue&&row.name===r.name);out.races=out.races.filter(r=>!same(r));out.featuredEvents=out.featuredEvents.filter(r=>!same(r));out[row.number?'races':'featuredEvents'].push(row);}const meetings=new Map(out.meetings.map(r=>[meetingKey(r),r]));for(const r of local.meetings)meetings.set(meetingKey(r),r);out.meetings=[...meetings.values()];return out;}

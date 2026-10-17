// Small independently arranged factual selection, manually checked against the URLs below.
// Not a copy of the JRA calendar download, database, article or table layout.
// 2026-10-17 onwards: extended through 2026 year end; only selected 2027 plans.
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

// Additional officially listed 2026 graded events, October 31 to year end.
// Date / venue / grade / course are from JRA's 2026 graded-race list.
// No programme number, start time or meeting sequence is inferred.
const NEXT_2026=[
  ['2026-10-31','京都','ファンタジーステークス','GⅢ',1400,'芝'],
  ['2026-11-01','東京','天皇賞（秋）','GⅠ',2000,'芝'],
  ['2026-11-07','東京','京王杯2歳ステークス','GⅡ',1400,'芝'],
  ['2026-11-07','京都','京都ジャンプステークス','J・GⅢ',3170,'障害'],
  ['2026-11-08','東京','アルゼンチン共和国杯','GⅡ',2500,'芝'],
  ['2026-11-08','京都','みやこステークス','GⅢ',1800,'ダート'],
  ['2026-11-14','東京','武蔵野ステークス','GⅢ',1600,'ダート'],
  ['2026-11-14','京都','デイリー杯2歳ステークス','GⅡ',1600,'芝'],
  ['2026-11-15','京都','エリザベス女王杯','GⅠ',2200,'芝'],
  ['2026-11-21','福島','福島記念','GⅢ',2000,'芝'],
  ['2026-11-22','京都','マイルチャンピオンシップ','GⅠ',1600,'芝'],
  ['2026-11-23','東京','東京スポーツ杯2歳ステークス','GⅡ',1800,'芝'],
  ['2026-11-28','京都','京都2歳ステークス','GⅢ',2000,'芝'],
  ['2026-11-29','東京','ジャパンカップ','GⅠ',2400,'芝'],
  ['2026-11-29','京都','京阪杯','GⅢ',1200,'芝'],
  ['2026-12-05','中山','ステイヤーズステークス','GⅡ',3600,'芝'],
  ['2026-12-05','阪神','鳴尾記念','GⅢ',1800,'芝'],
  ['2026-12-06','中京','チャンピオンズカップ','GⅠ',1800,'ダート'],
  ['2026-12-12','中京','中日新聞杯','GⅢ',2000,'芝'],
  ['2026-12-13','中山','カペラステークス','GⅢ',1200,'ダート'],
  ['2026-12-13','阪神','阪神ジュベナイルフィリーズ','GⅠ',1600,'芝'],
  ['2026-12-19','中山','ターコイズステークス','GⅢ',1600,'芝'],
  ['2026-12-20','阪神','朝日杯フューチュリティステークス','GⅠ',1600,'芝'],
  ['2026-12-26','中山','中山大障害','J・GⅠ',4100,'障害'],
  ['2026-12-26','中山','ホープフルステークス','GⅠ',2000,'芝'],
  ['2026-12-26','阪神','阪神カップ','GⅡ',1400,'芝'],
  ['2026-12-27','中山','有馬記念','GⅠ',2500,'芝']
];
const official2026='https://www.jra.go.jp/datafile/seiseki/replay/2026/jyusyo.html';
for(const [date,venue,name,grade,distance,surface] of NEXT_2026){
 const eventId='jra-2026-scheduled-'+date.slice(5)+'-'+venue+'-'+name;
 const base={date,venue,status:'planned',approval:'approved',sourceURL:official2026,sourceUpdatedAt:null,retrievedAt:checked};
 if(!c.meetings.some(m=>m.date===date&&m.venue===venue)){
  c.meetings.push({...base,meetingNumber:null,dayNumber:null});
 }
 c.featuredEvents.push({...base,eventId,name,grade,gradeStatus:'confirmed',proposedGrade:null,condition:null,number:null,distance,surface,startTime:null});
}

export const GRADED_MASTER=validateCalendar(c);
// User imports have explicit priority, including cancellations and loss of a known number.
// Stable eventId is required for simultaneous date/venue/name corrections.
export function withMaster(local){const out=structuredClone(GRADED_MASTER);for(const row of [...local.featuredEvents,...local.races].sort((a,b)=>Date.parse(a.retrievedAt)-Date.parse(b.retrievedAt))){const same=r=>(row.eventId&&r.eventId===row.eventId)||(row.number&&r.number&&raceKey(row)===raceKey(r))||(row.date===r.date&&row.venue===r.venue&&row.name===r.name);out.races=out.races.filter(r=>!same(r));out.featuredEvents=out.featuredEvents.filter(r=>!same(r));out[row.number?'races':'featuredEvents'].push(row);}const meetings=new Map(out.meetings.map(r=>[meetingKey(r),r]));for(const r of local.meetings)meetings.set(meetingKey(r),r);out.meetings=[...meetings.values()];return out;}

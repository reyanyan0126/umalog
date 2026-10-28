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
// JRA 2027 proposed graded calendar, dated schedule (approval pending).
// Dates/grades cross-checked against published 2027 calendar; no race numbers or start times inferred.
// Proposed promotions retain the current grade until official grade approval.
const PROPOSED_2027=[["2027-01-04","中山","中山金杯","GⅢ",null],["2027-01-04","京都","京都金杯","GⅢ",null],["2027-01-11","中山","フェアリーステークス","GⅢ",null],["2027-01-11","京都","シンザン記念","GⅢ",null],["2027-01-17","中山","京成杯","GⅢ",null],["2027-01-17","京都","日経新春杯","GⅡ",null],["2027-01-23","小倉","小倉牝馬ステークス","GⅢ",null],["2027-01-24","中山","アメリカジョッキークラブカップ","GⅡ",null],["2027-01-24","京都","プロキオンステークス","GⅡ",null],["2027-01-31","東京","根岸ステークス","GⅢ","GⅡ"],["2027-01-31","京都","シルクロードステークス","GⅢ",null],["2027-02-07","東京","東京新聞杯","GⅢ",null],["2027-02-07","京都","きさらぎ賞","GⅢ",null],["2027-02-13","東京","クイーンカップ","GⅢ",null],["2027-02-13","小倉","小倉ジャンプステークス","J・GⅢ",null],["2027-02-14","東京","共同通信杯","GⅢ",null],["2027-02-14","京都","京都記念","GⅡ",null],["2027-02-20","東京","ダイヤモンドステークス","GⅢ",null],["2027-02-20","阪神","阪急杯","GⅢ",null],["2027-02-21","東京","フェブラリーステークス","GⅠ",null],["2027-02-21","小倉","小倉大賞典","GⅢ",null],["2027-02-27","中山","オーシャンステークス","GⅢ","GⅡ"],["2027-02-28","中山","中山記念","GⅡ",null],["2027-02-28","阪神","チューリップ賞","GⅡ",null],["2027-03-07","中山","弥生賞ディープインパクト記念","GⅡ",null],["2027-03-07","阪神","フィリーズレビュー","GⅡ",null],["2027-03-13","中山","中山牝馬ステークス","GⅢ",null],["2027-03-13","阪神","阪神スプリングジャンプ","J・GⅡ",null],["2027-03-14","中山","スプリングステークス","GⅡ",null],["2027-03-14","中京","金鯱賞","GⅡ",null],["2027-03-20","中山","フラワーカップ","GⅢ",null],["2027-03-20","中京","ファルコンステークス","GⅢ",null],["2027-03-21","阪神","阪神大賞典","GⅡ",null],["2027-03-22","中京","愛知杯","GⅢ",null],["2027-03-27","中山","日経賞","GⅡ",null],["2027-03-27","阪神","毎日杯","GⅢ",null],["2027-03-28","中山","マーチステークス","GⅢ",null],["2027-03-28","中京","高松宮記念","GⅠ",null],["2027-04-03","中山","ダービー卿チャレンジトロフィー","GⅢ",null],["2027-04-03","阪神","チャーチルダウンズカップ","GⅢ",null],["2027-04-04","阪神","大阪杯","GⅠ",null],["2027-04-10","中山","ニュージーランドトロフィー","GⅡ",null],["2027-04-10","阪神","阪神牝馬ステークス","GⅡ",null],["2027-04-11","阪神","桜花賞","GⅠ",null],["2027-04-17","中山","中山グランドジャンプ","J・GⅠ",null],["2027-04-17","阪神","アンタレスステークス","GⅢ",null],["2027-04-18","中山","皐月賞","GⅠ",null],["2027-04-18","福島","福島牝馬ステークス","GⅢ",null],["2027-04-24","東京","青葉賞","GⅡ",null],["2027-04-25","東京","フローラステークス","GⅡ",null],["2027-04-25","京都","マイラーズカップ","GⅡ",null],["2027-05-01","東京","京王杯スプリングカップ","GⅡ",null],["2027-05-01","京都","ユニコーンステークス","GⅢ",null],["2027-05-02","京都","天皇賞（春）","GⅠ",null],["2027-05-08","東京","エプソムカップ","GⅢ",null],["2027-05-08","京都","京都新聞杯","GⅡ",null],["2027-05-09","東京","NHKマイルカップ","GⅠ",null],["2027-05-15","京都","京都ジャンプステークス","J・GⅢ",null],["2027-05-15","新潟","新潟大賞典","GⅢ",null],["2027-05-16","東京","ヴィクトリアマイル","GⅠ",null],["2027-05-22","京都","平安ステークス","GⅢ",null],["2027-05-23","東京","オークス","GⅠ",null],["2027-05-29","京都","葵ステークス","GⅢ",null],["2027-05-30","東京","日本ダービー","GⅠ",null],["2027-05-30","東京","目黒記念","GⅡ",null],["2027-06-05","函館","函館スプリントステークス","GⅢ",null],["2027-06-06","東京","安田記念","GⅠ",null],["2027-06-12","東京","東京ジャンプステークス","J・GⅢ",null],["2027-06-13","阪神","宝塚記念","GⅠ",null],["2027-06-20","東京","府中牝馬ステークス","GⅢ",null],["2027-06-20","阪神","しらさぎステークス","GⅢ",null],["2027-06-27","福島","ラジオNIKKEI賞","GⅢ",null],["2027-06-27","函館","函館記念","GⅢ",null],["2027-07-03","福島","福島ジャンプステークス","J・GⅢ",null],["2027-07-04","小倉","北九州記念","GⅢ",null],["2027-07-11","福島","七夕賞","GⅢ",null],["2027-07-18","小倉","小倉記念","GⅢ",null],["2027-07-18","札幌","クイーンステークス","GⅢ",null],["2027-07-25","新潟","関屋記念","GⅢ",null],["2027-07-25","中京","東海ステークス","GⅢ",null],["2027-08-01","新潟","アイビスサマーダッシュ","GⅢ",null],["2027-08-01","札幌","エルムステークス","GⅢ",null],["2027-08-07","函館","函館2歳ステークス","GⅢ",null],["2027-08-08","新潟","レパードステークス","GⅢ",null],["2027-08-08","中京","CBC賞","GⅢ",null],["2027-08-15","中京","中京記念","GⅢ",null],["2027-08-15","札幌","札幌記念","GⅡ",null],["2027-08-22","新潟","新潟2歳ステークス","GⅢ",null],["2027-08-22","札幌","キーンランドカップ","GⅢ","GⅡ"],["2027-08-29","新潟","新潟記念","GⅢ",null],["2027-08-29","中京","中京2歳ステークス","GⅢ",null],["2027-09-04","札幌","札幌2歳ステークス","GⅢ",null],["2027-09-05","中山","京成杯オータムハンデキャップ","GⅢ",null],["2027-09-11","中山","紫苑ステークス","GⅡ",null],["2027-09-11","阪神","チャレンジカップ","GⅢ",null],["2027-09-12","中山","セントライト記念","GⅡ",null],["2027-09-12","阪神","ローズステークス","GⅡ",null],["2027-09-18","阪神","阪神ジャンプステークス","J・GⅢ",null],["2027-09-20","中山","オールカマー","GⅡ",null],["2027-09-20","阪神","神戸新聞杯","GⅡ",null],["2027-09-25","阪神","シリウスステークス","GⅢ",null],["2027-09-26","中山","スプリンターズステークス","GⅠ",null],["2027-10-03","東京","毎日王冠","GⅡ",null],["2027-10-03","京都","京都大賞典","GⅡ",null],["2027-10-09","東京","サウジアラビアロイヤルカップ","GⅢ",null],["2027-10-10","東京","東京ハイジャンプ","J・GⅡ",null],["2027-10-11","東京","アイルランドトロフィー","GⅡ",null],["2027-10-11","京都","スワンステークス","GⅡ",null],["2027-10-16","東京","富士ステークス","GⅡ",null],["2027-10-17","京都","秋華賞","GⅠ",null],["2027-10-23","東京","アルテミスステークス","GⅢ",null],["2027-10-24","京都","菊花賞","GⅠ",null],["2027-10-30","京都","ファンタジーステークス","GⅢ",null],["2027-10-31","東京","天皇賞（秋）","GⅠ",null],["2027-11-06","東京","京王杯2歳ステークス","GⅡ",null],["2027-11-06","京都","京都ハイジャンプ","J・GⅡ",null],["2027-11-07","東京","アルゼンチン共和国杯","GⅡ",null],["2027-11-07","京都","みやこステークス","GⅢ","GⅡ"],["2027-11-13","東京","武蔵野ステークス","GⅢ","GⅡ"],["2027-11-13","京都","デイリー杯2歳ステークス","GⅡ",null],["2027-11-14","京都","エリザベス女王杯","GⅠ",null],["2027-11-20","福島","福島記念","GⅢ",null],["2027-11-20","東京","東京スポーツ杯2歳ステークス","GⅡ",null],["2027-11-21","京都","マイルチャンピオンシップ","GⅠ",null],["2027-11-27","京都","京都2歳ステークス","GⅢ",null],["2027-11-28","東京","ジャパンカップ","GⅠ",null],["2027-11-28","京都","京阪杯","GⅢ",null],["2027-12-04","中山","ステイヤーズステークス","GⅡ",null],["2027-12-04","阪神","鳴尾記念","GⅢ",null],["2027-12-05","中京","チャンピオンズカップ","GⅠ",null],["2027-12-11","中京","中日新聞杯","GⅢ",null],["2027-12-12","中山","カペラステークス","GⅢ",null],["2027-12-12","阪神","阪神ジュベナイルフィリーズ","GⅠ",null],["2027-12-18","中山","ターコイズステークス","GⅢ",null],["2027-12-19","阪神","朝日杯フューチュリティステークス","GⅠ",null],["2027-12-25","中山","中山大障害","J・GⅠ",null],["2027-12-25","阪神","阪神カップ","GⅡ",null],["2027-12-26","中山","有馬記念","GⅠ",null],["2027-12-28","中山","ホープフルステークス","GⅠ",null]];
const source2027='https://www.jra.go.jp/keiba/program/2027/index.html';
for(const [date,venue,name,grade,proposedGrade] of PROPOSED_2027){
 const base={date,venue,status:'planned',approval:'pending',sourceURL:source2027,sourceUpdatedAt:null,retrievedAt:checked};
 if(!c.meetings.some(m=>m.date===date&&m.venue===venue))c.meetings.push({...base,meetingNumber:null,dayNumber:null});
 c.featuredEvents.push({...base,eventId:'jra-2027-'+date.slice(5)+'-'+venue+'-'+name,name,grade,gradeStatus:proposedGrade?'pending':'confirmed',proposedGrade,condition:null,distance:null,surface:null,startTime:null});
}

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

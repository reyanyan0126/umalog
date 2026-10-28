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

// JRA 2026 official graded-race historical schedule, January through October 12.
// Race numbers and start times are deliberately not guessed. This is schedule metadata,
// not a results/winners/payout feed. Historic races are marked as completed calendar events.
const HISTORICAL_2026=[["2026-01-04","中山","中山金杯","GⅢ",2000,"芝"],["2026-01-04","京都","京都金杯","GⅢ",1600,"芝"],["2026-01-11","中山","フェアリーステークス","GⅢ",1600,"芝"],["2026-01-12","京都","シンザン記念","GⅢ",1600,"芝"],["2026-01-18","中山","京成杯","GⅢ",2000,"芝"],["2026-01-18","京都","日経新春杯","GⅡ",2400,"芝"],["2026-01-24","小倉","小倉牝馬ステークス","GⅢ",2000,"芝"],["2026-01-25","中山","アメリカジョッキークラブカップ","GⅡ",2200,"芝"],["2026-01-25","京都","プロキオンステークス","GⅡ",1800,"ダート"],["2026-02-01","東京","根岸ステークス","GⅢ",1400,"ダート"],["2026-02-01","京都","シルクロードステークス","GⅢ",1200,"芝"],["2026-02-10","京都","きさらぎ賞","GⅢ",1800,"芝"],["2026-02-10","東京","東京新聞杯","GⅢ",1600,"芝"],["2026-02-14","東京","クイーンカップ","GⅢ",1600,"芝"],["2026-02-14","小倉","小倉ジャンプステークス","J・GⅢ",3390,"障害"],["2026-02-15","東京","共同通信杯","GⅢ",1800,"芝"],["2026-02-15","京都","京都記念","GⅡ",2200,"芝"],["2026-02-21","東京","ダイヤモンドステークス","GⅢ",3400,"芝"],["2026-02-21","阪神","阪急杯","GⅢ",1400,"芝"],["2026-02-22","東京","フェブラリーステークス","GⅠ",1600,"ダート"],["2026-02-22","小倉","小倉大賞典","GⅢ",1800,"芝"],["2026-02-28","中山","オーシャンステークス","GⅢ",1200,"芝"],["2026-03-01","中山","中山記念","GⅡ",1800,"芝"],["2026-03-01","阪神","チューリップ賞","GⅡ",1600,"芝"],["2026-03-07","中山","中山牝馬ステークス","GⅢ",1800,"芝"],["2026-03-07","阪神","フィリーズレビュー","GⅡ",1400,"芝"],["2026-03-08","中山","弥生賞","GⅡ",2000,"芝"],["2026-03-14","阪神","阪神スプリングジャンプ","J・GⅡ",3900,"障害"],["2026-03-15","中山","スプリングステークス","GⅡ",1800,"芝"],["2026-03-15","中京","金鯱賞","GⅡ",2000,"芝"],["2026-03-21","中山","フラワーカップ","GⅢ",1800,"芝"],["2026-03-21","中京","ファルコンステークス","GⅢ",1400,"芝"],["2026-03-22","阪神","阪神大賞典","GⅡ",3000,"芝"],["2026-03-22","中京","愛知杯","GⅢ",1400,"芝"],["2026-03-28","中山","日経賞","GⅡ",2500,"芝"],["2026-03-28","阪神","毎日杯","GⅢ",1800,"芝"],["2026-03-29","中山","マーチステークス","GⅢ",1800,"ダート"],["2026-03-29","中京","高松宮記念","GⅠ",1200,"芝"],["2026-04-04","中山","ダービー卿チャレンジトロフィー","GⅢ",1600,"芝"],["2026-04-04","阪神","チャーチルダウンズカップ","GⅢ",1600,"芝"],["2026-04-05","阪神","大阪杯","GⅠ",2000,"芝"],["2026-04-11","中山","ニュージーランドトロフィー","GⅡ",1600,"芝"],["2026-04-11","阪神","阪神牝馬ステークス","GⅡ",1600,"芝"],["2026-04-12","阪神","桜花賞","GⅠ",1600,"芝"],["2026-04-18","中山","中山グランドジャンプ","J・GⅠ",4260,"障害"],["2026-04-18","阪神","アンタレスステークス","GⅢ",1800,"ダート"],["2026-04-19","中山","皐月賞","GⅠ",2000,"芝"],["2026-04-19","福島","福島牝馬ステークス","GⅢ",1800,"芝"],["2026-04-25","東京","青葉賞","GⅡ",2400,"芝"],["2026-04-26","東京","フローラステークス","GⅡ",2000,"芝"],["2026-04-26","京都","マイラーズカップ","GⅡ",1600,"芝"],["2026-05-02","東京","京王杯スプリングカップ","GⅡ",1400,"芝"],["2026-05-02","京都","ユニコーンステークス","GⅢ",1900,"ダート"],["2026-05-03","京都","天皇賞（春）","GⅠ",3200,"芝"],["2026-05-09","東京","エプソムカップ","GⅢ",1800,"芝"],["2026-05-09","京都","京都新聞杯","GⅡ",2200,"芝"],["2026-05-10","東京","NHKマイルカップ","GⅠ",1600,"芝"],["2026-05-16","京都","京都ハイジャンプ","J・GⅡ",3930,"障害"],["2026-05-16","新潟","新潟大賞典","GⅢ",2000,"芝"],["2026-05-17","東京","ヴィクトリアマイル","GⅠ",1600,"芝"],["2026-05-23","京都","平安ステークス","GⅢ",1900,"ダート"],["2026-05-24","東京","オークス","GⅠ",2400,"芝"],["2026-05-30","京都","葵ステークス","GⅢ",1200,"芝"],["2026-05-31","東京","日本ダービー","GⅠ",2400,"芝"],["2026-05-31","東京","目黒記念","GⅡ",2500,"芝"],["2026-06-07","東京","安田記念","GⅠ",1600,"芝"],["2026-06-13","東京","東京ジャンプステークス","J・GⅢ",3110,"障害"],["2026-06-13","函館","函館スプリントステークス","GⅢ",1200,"芝"],["2026-06-14","阪神","宝塚記念","GⅠ",2200,"芝"],["2026-06-21","東京","府中牝馬ステークス","GⅢ",1800,"芝"],["2026-06-21","阪神","しらさぎステークス","GⅢ",1600,"芝"],["2026-06-28","福島","ラジオNIKKEI賞","GⅢ",1800,"芝"],["2026-06-28","函館","函館記念","GⅢ",2000,"芝"],["2026-07-05","小倉","北九州記念","GⅢ",1200,"芝"],["2026-07-12","福島","七夕賞","GⅢ",2000,"芝"],["2026-07-19","小倉","小倉記念","GⅢ",2000,"芝"],["2026-07-19","函館","函館2歳ステークス","GⅢ",1200,"芝"],["2026-07-26","新潟","関屋記念","GⅢ",1600,"芝"],["2026-07-26","中京","東海ステークス","GⅢ",1400,"ダート"],["2026-08-02","新潟","アイビスサマーダッシュ","GⅢ",1000,"芝"],["2026-08-02","札幌","クイーンステークス","GⅢ",1800,"芝"],["2026-08-08","札幌","エルムステークス","GⅢ",1700,"ダート"],["2026-08-09","新潟","レパードステークス","GⅢ",1800,"ダート"],["2026-08-09","中京","CBC賞","GⅢ",1200,"芝"],["2026-08-15","新潟","新潟ジャンプステークス","J・GⅢ",3250,"障害"],["2026-08-16","中京","中京記念","GⅢ",1600,"芝"],["2026-08-16","札幌","札幌記念","GⅡ",2000,"芝"],["2026-08-23","新潟","新潟2歳ステークス","GⅢ",1600,"芝"],["2026-08-23","札幌","キーンランドカップ","GⅢ",1200,"芝"],["2026-08-30","新潟","新潟記念","GⅢ",2000,"芝"],["2026-08-30","中京","中京2歳ステークス","GⅢ",1400,"芝"],["2026-09-05","中山","京成杯オータムハンデキャップ","GⅢ",1600,"芝"],["2026-09-05","札幌","札幌2歳ステークス","GⅢ",1800,"芝"],["2026-09-06","中山","紫苑ステークス","GⅡ",2000,"芝"],["2026-09-06","阪神","セントウルステークス","GⅡ",1200,"芝"],["2026-09-12","阪神","チャレンジカップ","GⅢ",2000,"芝"],["2026-09-13","中山","セントライト記念","GⅡ",2200,"芝"],["2026-09-13","阪神","ローズステークス","GⅡ",1800,"芝"],["2026-09-19","阪神","阪神ジャンプステークス","J・GⅢ",3140,"障害"],["2026-09-20","中山","オールカマー","GⅡ",2200,"芝"],["2026-09-21","阪神","神戸新聞杯","GⅡ",2400,"芝"],["2026-09-26","阪神","シリウスステークス","GⅢ",2000,"ダート"],["2026-09-27","中山","スプリンターズステークス","GⅠ",1200,"芝"],["2026-10-04","東京","毎日王冠","GⅡ",1800,"芝"],["2026-10-04","京都","京都大賞典","GⅡ",2400,"芝"],["2026-10-10","東京","サウジアラビアロイヤルカップ","GⅢ",1600,"芝"],["2026-10-11","東京","アイルランドトロフィー","GⅡ",1800,"芝"],["2026-10-12","京都","スワンステークス","GⅡ",1400,"芝"]];
const historicalSource='https://www.jra.go.jp/datafile/seiseki/replay/2026/jyusyo.html';
for(const [date,venue,name,grade,distance,surface] of HISTORICAL_2026){
 const eventId='jra-2026-history-'+date.slice(5)+'-'+venue+'-'+name;
 const base={date,venue,status:'result',approval:'approved',sourceURL:historicalSource,sourceUpdatedAt:null,retrievedAt:checked};
 if(!c.meetings.some(m=>m.date===date&&m.venue===venue))c.meetings.push({...base,meetingNumber:null,dayNumber:null});
 c.featuredEvents.push({...base,eventId,name,grade,gradeStatus:'confirmed',proposedGrade:null,condition:null,distance,surface,startTime:null});
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

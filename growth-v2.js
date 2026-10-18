// No network, DOM, or purchase-dependent rewards.
const DAY=86400000;
const today=now=>new Date(now.getTime()+9*3600000).toISOString().slice(0,10);
const assert=(v,m)=>{if(!v)throw new Error(m);};
const isDay=s=>typeof s==='string'&&/^\d{4}-\d\d-\d\d$/.test(s)&&Number.isFinite(Date.parse(s))&&new Date(s+'T00:00:00Z').toISOString().slice(0,10)===s;

export const COMPANION_THEMES=['meadow','room','stars'];
const defaultCompanion=day=>({theme:'meadow',playDay:day,playCount:0,restDay:null,memories:[]});
export function companionProgress(g,day){
 const c=g?.companion||defaultCompanion(day);
 return {theme:c.theme,playCount:c.playDay===day?c.playCount:0,playedToday:c.memories.some(m=>m.day===day&&m.kind==='play'),restedToday:c.restDay===day,memories:c.memories.map(m=>({...m}))};
}
function remember(c,kind,day){
 if(!c.memories.some(m=>m.kind===kind&&m.day===day)){
  c.memories=[...c.memories,{day,kind}].slice(-30);
 }
}
export function validateGrowthV2(g){assert(g?.version===2,'育成v2形式が不正です。');for(const k of ['legacyExp','dayExp','careExp','bond','careCount'])assert(Number.isSafeInteger(g[k])&&g[k]>=0&&g[k]<=10000000,'育成数値が不正です。');assert(g.bond<=100&&g.careCount<=3&&isDay(g.lastDay)&&isDay(g.careDay),'お世話状態が不正です。');for(const k of ['learned','reviewWeeks'])assert(Array.isArray(g[k])&&g[k].length<=10000&&new Set(g[k]).size===g[k].length,'育成履歴が不正です。');assert(g.learned.every(x=>['単勝','複勝','枠連','馬連','馬単','ワイド','三連複','三連単'].includes(x)),'券種図鑑が不正です。');assert(g.reviewWeeks.every(isDay)&&typeof g.clockWarning==='boolean','育成日付が不正です。');assert(Number.isSafeInteger(g.reviewExp)&&g.reviewExp>=0&&g.reviewExp<=g.reviewWeeks.length*20,'振り返りEXPが不正です。');if(g.companion!==undefined){
 const c=g.companion;
 assert(c&&typeof c==='object'&&!Array.isArray(c)&&COMPANION_THEMES.includes(c.theme),'育成のお部屋が不正です。');
 assert(isDay(c.playDay)&&Number.isSafeInteger(c.playCount)&&c.playCount>=0&&c.playCount<=2,'遊びの記録が不正です。');
 assert(c.restDay===null||isDay(c.restDay),'休憩の記録が不正です。');
 assert(Array.isArray(c.memories)&&c.memories.length<=30,'思い出の記録が不正です。');
 const keys=new Set();
 for(const m of c.memories){
  assert(m&&isDay(m.day)&&['play','rest'].includes(m.kind),'思い出の内容が不正です。');
  const key=m.day+'|'+m.kind;assert(!keys.has(key),'思い出の日付が重複しています。');keys.add(key);
 }
 }
 return g;}
export function growthTotal(g){validateGrowthV2(g);return g.legacyExp+g.dayExp+g.careExp+g.learned.length*10+g.reviewExp;}
export function migrateGrowth(data,now=new Date(),savedExp=data.character.exp){if(data.growthV2){validateGrowthV2(data.growthV2);return data;}return {...data,growthV2:{version:2,legacyExp:Math.max(savedExp,data.character.exp),dayExp:0,careExp:0,bond:0,lastDay:today(now),careDay:today(now),careCount:0,learned:[],reviewWeeks:data.reviews.map(r=>r.week),reviewExp:0,clockWarning:false}};}
export function grow(data,action='time',value=null,now=new Date()){const next=structuredClone(migrateGrowth(data,now)),g=next.growthV2;validateGrowthV2(g);const day=today(now),elapsed=Math.floor((Date.parse(day)-Date.parse(g.lastDay))/DAY);g.clockWarning=elapsed<0||elapsed>30;if(elapsed>0){g.dayExp+=Math.min(elapsed,30)*3;g.lastDay=day;}const normal=day>=g.lastDay&&elapsed<=30;
 if(action==='care'&&normal){if(day>g.careDay){g.careDay=day;g.careCount=0;}if(day===g.careDay&&g.careCount<3){g.careCount++;g.careExp+=2;g.bond=Math.min(100,g.bond+1);}}
 if(['play','rest','room'].includes(action)){
  if(!g.companion)g.companion=defaultCompanion(day);
  const c=g.companion;
  if(action==='room'){assert(COMPANION_THEMES.includes(value),'お部屋の種類が不正です。');c.theme=value;}
  if(action==='play'&&normal){
   if(c.playDay!==day){c.playDay=day;c.playCount=0;}
   if(c.playCount<2){c.playCount++;g.bond=Math.min(100,g.bond+1);remember(c,'play',day);}
  }
  if(action==='rest'&&normal){c.restDay=day;remember(c,'rest',day);}
 }
 if(action==='learn'){assert(['単勝','複勝','枠連','馬連','馬単','ワイド','三連複','三連単'].includes(value),'券種が不正です。');if(!g.learned.includes(value))g.learned.push(value);}
 if(action==='review'){assert(isDay(value)&&value<day&&new Date(value+'T00:00:00Z').getUTCDay()===1&&next.reviews.some(r=>r.week===value&&r.text.trim()),'保存済みの終了週の振り返りが必要です。');const d=new Date(day+'T00:00:00Z');d.setUTCDate(d.getUTCDate()-(d.getUTCDay()+6)%7);assert(value<d.toISOString().slice(0,10),'終了した週を選んでください。');if(!g.reviewWeeks.includes(value)){g.reviewWeeks.push(value);g.reviewExp+=20;}}
 validateGrowthV2(g);return next;}
export const BOOK={単勝:'1着になる馬を選ぶ券種。',複勝:'払戻対象の着順内に入る馬を選びます。対象着順は出走頭数などによって異なります。',枠連:'1着・2着の枠番号を順不同で選びます。同じ枠同士もあります。',馬連:'1着・2着の馬番号を順不同で選びます。',馬単:'1着・2着の馬番号を着順どおりに選びます。',ワイド:'払戻対象になる2頭の組み合わせを順不同で選びます。同着時も公式払戻表を確認します。',三連複:'1着から3着の馬番号を順不同で選びます。',三連単:'1着から3着の馬番号を着順どおりに選びます。'};

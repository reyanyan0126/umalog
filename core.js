import {growthTotal,validateGrowthV2} from './growth-v2.js';
// Pure domain functions; no DOM, network or database dependency.
export const SCHEMA_VERSION = 1;
export const VENUES = ['札幌','函館','福島','新潟','東京','中山','中京','京都','阪神','小倉'];
export const TYPES = ['単勝','複勝','枠連','馬連','馬単','ワイド','三連複','三連単'];
export const STAGES = [0,40,180,400,700];
export const STAGE_NAMES = ['たまご','なぞの丸い生物','馬の気配','馬らしき生物','ちいさな馬'];
export const MAX_MONEY = 1000000000000;
export function uid(){ const a=new Uint32Array(4); crypto.getRandomValues(a); return [...a].map(n=>n.toString(16).padStart(8,'0')).join(''); }
export function emptyData(){return {schemaVersion:SCHEMA_VERSION,races:[],tickets:[],lines:[],reviews:[],settings:{name:'うまたま',motion:true},character:{exp:0,level:1,stage:0},growth:[]};}
export function check(ok,message){if(!ok)throw new Error(message);}
export function money(n,purchase=false){check(Number.isSafeInteger(n)&&n>=0&&n<=MAX_MONEY&&(!purchase||(n>0&&n%100===0)),purchase?'購入額は100円単位の正の整数にしてください。':'金額は0以上の整数にしてください。');return n;}
// Summary-only ledger entry: no individual horse/frame picks are invented.
// Blank payout means unentered, while an explicit zero means a confirmed loss.
export function summaryWager(stakeValue,payoutInput='',refundInput=''){
 const stake=money(Number(stakeValue),true);
 const blank=payoutInput===null||payoutInput===undefined||String(payoutInput).trim()==='';
 const payout=blank?0:money(Number(payoutInput));
 const refund=money(refundInput===null||refundInput===undefined||String(refundInput).trim()===''?0:Number(refundInput));
 check(refund<=stake,'返還額が購入額を超えています。');
 check(!(refund===stake&&payout>0),'全額返還に払戻は設定できません。');
 return {summary:true,numbers:[],stake,payout,refund,status:refund===stake?'void':blank&&refund===0?'pending':'settled'};
}
export function validDate(s){return typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&Number(s.slice(0,4))>=2000&&Number(s.slice(0,4))<=2199&&new Date(s+'T00:00:00Z').toISOString().slice(0,10)===s;}
export function jstToday(now=new Date()){return new Date(now.getTime()+9*3600000).toISOString().slice(0,10);}
export function weekOf(date){const d=new Date(date+'T00:00:00Z');d.setUTCDate(d.getUTCDate()-(d.getUTCDay()+6)%7);return d.toISOString().slice(0,10);}
export function addDays(date,n){const d=new Date(date+'T00:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10);}
export function raceKey(r){return `${r.date}|${r.venue}|${r.number}`;}
export function combination(type,numbers){check(TYPES.includes(type),'券種が不正です。');const count=['単勝','複勝'].includes(type)?1:['三連複','三連単'].includes(type)?3:2;
 check(Array.isArray(numbers)&&numbers.length===count,'選択数が券種と一致しません。');check(numbers.every(n=>Number.isInteger(n)&&n>=1&&n<=(type==='枠連'?8:18)),'番号の範囲が不正です。');check(type==='枠連'||new Set(numbers).size===numbers.length,'同じ馬番は選択できません。');return ['馬単','三連単'].includes(type)?[...numbers]:[...numbers].sort((a,b)=>a-b);}
export function box(type,numbers){check(Array.isArray(numbers)&&numbers.length>0&&new Set(numbers).size===numbers.length,'BOXの番号を重複なく選択してください。');numbers.forEach(n=>check(Number.isInteger(n)&&n>=1&&n<=(type==='枠連'?8:18),'番号の範囲が不正です。'));
 const k=['単勝','複勝'].includes(type)?1:['三連複','三連単'].includes(type)?3:2;check(numbers.length>=k,'BOXの選択数が不足しています。');const ordered=['馬単','三連単'].includes(type),out=[];
 function visit(a){if(a.length===k){out.push(combination(type,a));return;}for(const n of numbers){if(a.includes(n)||(!ordered&&a.length&&n<=a[a.length-1]))continue;visit([...a,n]);}}visit([]);return out;
}
export function fullRefund(l){return l.status!=='pending'&&l.payout===0&&l.refund===l.stake;}
export function aggregate(data,predicate=()=>true){const races=data.races.filter(predicate),ids=new Set(races.map(r=>r.id)),tickets=data.tickets.filter(t=>ids.has(t.raceId)),tids=new Set(tickets.map(t=>t.id)),lines=data.lines.filter(l=>tids.has(l.ticketId));return summarize(lines,races,tickets);}
export function summarize(lines,races=[],tickets=[]){const done=lines.filter(l=>l.status!=='pending'),valid=done.filter(l=>!fullRefund(l)),pending=lines.filter(l=>l.status==='pending');const sum=(ls,k)=>ls.reduce((n,l)=>n+l[k],0);const purchase=sum(done,'stake'),payout=sum(done,'payout'),refund=sum(done,'refund');let raceCount=0,raceHits=0;
 for(const r of races){const ids=new Set(tickets.filter(t=>t.raceId===r.id).map(t=>t.id));const ls=lines.filter(l=>ids.has(l.ticketId));if(!ls.length||ls.some(l=>l.status==='pending')||!ls.some(l=>!fullRefund(l)))continue;raceCount++;if(ls.some(l=>l.payout>0))raceHits++;}
 return {purchase,payout,refund,profit:payout+refund-purchase,returnRate:purchase?(payout+refund)/purchase*100:null,lineCount:valid.length,lineHits:valid.filter(l=>l.payout>0).length,lineRate:valid.length?valid.filter(l=>l.payout>0).length/valid.length*100:null,raceCount,raceHits,raceRate:raceCount?raceHits/raceCount*100:null,pendingCount:pending.length,pendingStake:sum(pending,'stake'),settledCount:done.length};}
export function growth(data,today=jstToday()){const current=weekOf(today),weeks=new Set([...data.races.map(r=>weekOf(r.date)),...data.reviews.map(r=>r.week)]);const history=[...weeks].sort().map(week=>{const stats=aggregate(data,r=>weekOf(r.date)===week),closed=week<current,all=stats.pendingCount===0&&stats.settledCount>0;
 // A requires a fully settled race, including a fully refunded race.
 const rs=data.races.filter(r=>weekOf(r.date)===week);const first=rs.some(r=>{const ids=new Set(data.tickets.filter(t=>t.raceId===r.id).map(t=>t.id));const ls=data.lines.filter(l=>ids.has(l.ticketId));return ls.length&&ls.every(l=>l.status!=='pending');});
 const a=first?10:0,b=closed&&all?10:0,c=closed&&data.reviews.some(r=>r.week===week)?20:0,eligible=closed&&all&&stats.raceCount>=3,d=eligible?(stats.returnRate>=120?40:stats.returnRate>=100?30:stats.returnRate>=80?15:0):0,e=eligible?(stats.raceRate>=50?20:stats.raceRate>=30?10:0):0;
 return {week,a,b,c,d,e,exp:a+b+c+d+e,closed,stats};});const exp=history.reduce((s,h)=>s+h.exp,0);return {character:{exp,level:1+Math.floor(exp/100),stage:STAGES.reduce((s,n,i)=>exp>=n?i:s,0)},history};}
export function recalculate(data,today=jstToday()){if(data.growthV2){const exp=growthTotal(data.growthV2);return {...data,character:{exp,level:1+Math.floor(exp/100),stage:STAGES.reduce((s,n,i)=>exp>=n?i:s,0)}};}const g=growth(data,today);return {...data,character:g.character,growth:g.history};}
export function validateData(d){check(d&&typeof d==='object'&&d.schemaVersion===SCHEMA_VERSION,'対応していないバックアップ形式・バージョンです。');for(const k of ['races','tickets','lines','reviews','growth'])check(Array.isArray(d[k])&&d[k].length<=100000,`${k}の形式が不正です。`);
 const idsets={};for(const k of ['races','tickets','lines','reviews']){idsets[k]=new Set();for(const x of d[k]){check(x&&typeof x.id==='string'&&x.id.length>0&&x.id.length<=100&&!idsets[k].has(x.id),'IDの欠落・重複があります。');idsets[k].add(x.id);}}
 const keys=new Set();for(const r of d.races){check(validDate(r.date)&&VENUES.includes(r.venue)&&Number.isInteger(r.number)&&r.number>=1&&r.number<=12&&typeof r.name==='string'&&r.name.length<=100,'レース情報が不正です。');check(!keys.has(raceKey(r)),'レースが重複しています。');keys.add(raceKey(r));}
 for(const t of d.tickets){check(idsets.races.has(t.raceId)&&TYPES.includes(t.type)&&['reported','advance'].includes(t.kind)&&typeof t.memo==='string'&&t.memo.length<=4000&&typeof t.createdAt==='string'&&Number.isFinite(Date.parse(t.createdAt)),'馬券情報が不正です。');check(d.lines.some(l=>l.ticketId===t.id),'明細がない馬券があります。');}
 for(const r of d.races)check(d.tickets.some(t=>t.raceId===r.id),'馬券がないレースがあります。');
 let total=0;for(const l of d.lines){check(idsets.tickets.has(l.ticketId),'買い目の参照先が不正です。');const t=d.tickets.find(t=>t.id===l.ticketId);check(l.summary===true?(Array.isArray(l.numbers)&&l.numbers.length===0):l.summary===undefined||l.summary===false,'買い目の形式が不正です。');if(l.summary!==true){const c=combination(t.type,l.numbers);check(JSON.stringify(c)===JSON.stringify(l.numbers),'買い目の順序が不正です。');}money(l.stake,true);check(['pending','settled','void'].includes(l.status),'精算状態が不正です。');money(l.payout);money(l.refund);check(l.refund<=l.stake,'返還額が購入額を超えています。');check(l.status!=='pending'||(l.payout===0&&l.refund===0),'未確定の金額が不正です。');check(l.status!=='void'||fullRefund(l),'無効行は全額返還のみです。');check(!(l.refund===l.stake&&l.payout>0),'全額返還に払戻は設定できません。');total+=l.stake+l.payout+l.refund;check(Number.isSafeInteger(total),'金額合計が上限を超えています。');}
 const weeks=new Set();for(const r of d.reviews){check(validDate(r.week)&&weekOf(r.week)===r.week&&typeof r.text==='string'&&r.text.trim().length>0&&r.text.length<=4000&&!weeks.has(r.week),'振り返りが不正・重複しています。');weeks.add(r.week);}
 check(d.settings&&typeof d.settings.name==='string'&&d.settings.name.length<=40&&d.settings.name.trim().length>0&&typeof d.settings.motion==='boolean','設定が不正です。');check(d.character&&Number.isSafeInteger(d.character.exp)&&d.character.exp>=0,'育成状態が不正です。');if(d.growthV2)validateGrowthV2(d.growthV2);return recalculate(d);}
export function removeTicket(data,id){data.lines=data.lines.filter(l=>l.ticketId!==id);data.tickets=data.tickets.filter(t=>t.id!==id);data.races=data.races.filter(r=>data.tickets.some(t=>t.raceId===r.id));return data;}

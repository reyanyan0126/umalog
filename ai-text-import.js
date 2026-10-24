import {VENUES,TYPES,combination,validDate,MAX_MONEY,check,raceKey,uid,validateData} from './core.js';
export const MAX_IMPORT_TEXT=1000000, MAX_LINK_LENGTH=60000;
const normalize=s=>s.normalize('NFKC').replace(/\r/g,'').replace(/：/g,':').replace(/[－―–—]/g,'-');
const value=(s,key)=>{const rows=s.split('\n').filter(x=>x.trim().startsWith(key+':'));check(rows.length<=1,key+'が重複しています。');return rows.length?rows[0].trim().slice(key.length+1).trim():null;};
const amount=(s,label)=>{check(s!==null&&/^[\d,]+(?:円)?$/.test(s),label+'は金額を明記してください。');const n=Number(s.replace(/[,円]/g,''));check(Number.isSafeInteger(n)&&n>=0&&n<=MAX_MONEY,label+'の金額が不正です。');return n;};
const optional=(s,key,max=200)=>{const v=value(s,key)||'';check(v.length<=max,key+'が長すぎます。');return v;};
export function parseAiImport(raw){
 check(typeof raw==='string'&&raw.length<=MAX_IMPORT_TEXT,'取込データは100万文字以内にしてください。');
 const s=normalize(raw).trim();check(s.startsWith('【うまログ登録データ】')&&s.endsWith('【登録データ終了】'),'うまログ登録データの開始・終了マークがありません。');
 check((s.match(/【うまログ登録データ】/g)||[]).length===1,'複数レースは一括解析してください。');
 const section=name=>{const marker='【'+name+'】',a=s.indexOf(marker);if(a<0)return '';check(s.indexOf(marker,a+1)<0,name+'が重複しています。');const b=s.indexOf('【',a+marker.length);return s.slice(a+marker.length,b<0?s.length:b).trim();};
 const header=s.slice(0,s.indexOf('【購入情報】')),date=value(header,'開催日'),venue=value(header,'競馬場'),number=Number((value(header,'レース番号')||'').replace(/R$/i,'')),type=value(header,'券種');
 check(validDate(date),'開催日をYYYY-MM-DD形式で確認して修正してください。');check(VENUES.includes(venue),'競馬場が不明です。正式な競馬場名を指定してください。');check(Number.isInteger(number)&&number>=1&&number<=12,'レース番号は1R〜12Rで指定してください。');check(TYPES.includes(type),'券種が不正です。正式名称を指定してください。');
 const receipt=optional(header,'受付番号',100),receiptTime=optional(header,'受付時刻',8),imageId=optional(header,'画像ID',200);
 check(!receiptTime||/^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(receiptTime),'受付時刻はHH:MM形式で指定してください。');
 const tickets=section('購入情報').split('\n').filter(x=>x.trim()).map((row,i)=>{
  const parts=row.trim().split(/[／/]/).map(x=>x.trim()),m=parts.shift().match(/^(\d{1,2}(?:\s*[-→>]\s*\d{1,2}){0,2})\s*:\s*([\d,]+)円$/);
  check(m,'購入情報'+(i+1)+'行目を読み取れません: '+row.slice(0,70));
  const numbers=combination(type,m[1].split(/[-→>]/).map(Number)),stake=amount(m[2],'購入額');check(stake>0&&stake%100===0,'購入額は100円単位で指定してください。');
  let hit=null,payout=null,refund=0;const seen=new Set();
  for(const part of parts){const key=/^(的中|不的中|未確定|返還|発売取消)$/.test(part)?'状態':part.startsWith('払戻')?'払戻':part.startsWith('返還')?'返還':null;check(key&&!seen.has(key),'購入情報'+(i+1)+'行目の項目が不明または重複しています: '+part);seen.add(key);if(key==='状態')hit=part;else if(key==='払戻')payout=part.replace(/^払戻\s*/,'')==='未確認'?null:amount(part.replace(/^払戻\s*/,''),'払戻');else refund=amount(part.replace(/^返還\s*/,''),'返還');}
  check(refund<=stake,'返還額が購入額を超えています。');
  const status=hit==='未確定'||(payout===null&&!['返還','発売取消'].includes(hit))?'pending':['返還','発売取消'].includes(hit)?'void':'settled';
  check(!(hit==='未確定'&&payout!==null),'未確定行に払戻額を指定しないでください。未確認を0円に置き換えないでください。');
  check(!(['的中','不的中'].includes(hit)&&payout===null),'的中・不的中の確定行には払戻額を明記してください。');
  check(status!=='pending'||((payout===null||payout===0)&&refund===0),'未確定行に払戻・返還は指定できません。');
  check(status!=='void'||(refund===stake&&(payout===null||payout===0)),'返還・発売取消行は全額返還と払戻0円を指定してください。');
  check(!(hit==='的中'&&!(payout>0)),'的中行の払戻額を確認してください。');check(!(hit==='不的中'&&payout!==0),'不的中行は払戻0円を指定してください。');check(!(refund===stake&&payout>0),'全額返還行に払戻は指定できません。');
  return {numbers,stake,payout:status==='pending'?null:payout??0,refund,status,hit};
 });
 check(tickets.length>0&&tickets.length<=10000,'買い目は1〜10000件で指定してください。');
 const keys=new Set();for(const t of tickets){const key=t.numbers.join('-');check(!keys.has(key),'同じ購入情報内で買い目が重複しています。追加購入は受付番号・時刻を分けた登録データにしてください: '+key);keys.add(key);}
 const summary=section('収支'),totalPurchase=amount(value(summary,'購入合計'),'購入合計'),pending=tickets.some(t=>t.status==='pending'),p=value(summary,'払戻合計'),totalPayout=p==='未確認'?null:amount(p,'払戻合計'),refund=amount(value(summary,'返還合計')??'0','返還合計');
 check(totalPurchase===tickets.reduce((a,t)=>a+t.stake,0),'購入合計と買い目の金額が一致しません。');check(refund===tickets.reduce((a,t)=>a+t.refund,0),'返還合計と明細が一致しません。');
 check(pending?totalPayout===null:totalPayout===tickets.reduce((a,t)=>a+t.payout,0),'未確認行がある場合は払戻合計を「未確認」にしてください。確定済みの場合は明細払戻額と払戻合計の一致を確認してください。');
 const results=section('レース結果'),metadata={};for(const key of ['芝・ダート','距離','馬場状態','出走頭数','1着','2着','3着','4着','5着','人気順位','確定配当','出典','照合状況'])metadata[key]=optional(results,key,1000);
 if(metadata['出典'])check(/^https:\/\/\S+$/.test(metadata['出典']),'出典はhttpsのURLで指定してください。');
 return {date,venue,number,type,name:optional(header,'レース名',100),receipt,receiptTime,imageId,tickets,totalPurchase,totalPayout,refund,metadata,podium:null};
}
export function parseAiBatch(raw){
 check(typeof raw==='string'&&raw.length<=MAX_IMPORT_TEXT,'取込データは100万文字以内にしてください。');
 const blocks=raw.match(/【うまログ登録データ】[\s\S]*?【登録データ終了】/g)||[];
 check(blocks.length>0&&blocks.length<=100,'登録データは1〜100ブロックで指定してください。');check(!raw.replace(/【うまログ登録データ】[\s\S]*?【登録データ終了】/g,'').trim(),'登録データの外側に読めない文字があります。');return blocks.map(parseAiImport);
}
export function decodeImportLink(hash){check(hash.length<=MAX_LINK_LENGTH,'共有リンクが長すぎます。データを分割するかファイルから取り込んでください。');const m=hash.match(/^#ai-import\?text=(.*)$/s);check(m,'共有リンクの形式が不正です。');try{return decodeURIComponent(m[1]);}catch{throw Error('共有リンクの文字コードが不正です。リンクを作り直してください。');}}
export function createImportLink(raw,base='https://reyanyan0126.github.io/umalog/'){parseAiBatch(raw);const hash='#ai-import?text='+encodeURIComponent(raw);check(hash.length<=MAX_LINK_LENGTH,'共有リンクが長すぎます。購入データを分割してください。');return base.split('#')[0]+hash;}
const receiptKey=c=>c.receipt?JSON.stringify([c.date,c.venue,c.number,c.type,c.receipt,c.receiptTime]):null;
const fingerprint=c=>JSON.stringify([raceKey(c),c.type,c.receipt,c.receiptTime,c.tickets.map(t=>[t.numbers,t.stake]).sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)))]);
export function prepareAiImport(data,candidates,{separateSimple=false}={}){
 const next=structuredClone(data);
 for(const c of candidates){
  const key=receiptKey(c),fp=fingerprint(c);
  check(!next.tickets.some(t=>t.aiImport&&(key&&t.aiImport.receiptKey===key||t.aiImport.fingerprint===fp||c.imageId&&t.aiImport.imageId===c.imageId&&t.aiImport.raceKey===raceKey(c)&&t.type===c.type)),'同一の受付番号・時刻または購入データが登録済みです。');
  const existing=next.races.find(r=>raceKey(r)===raceKey(c));
  check(!existing||!next.tickets.some(t=>t.raceId===existing.id&&t.type===c.type&&!t.aiImport&&t.memo==='AI取込・受付番号 '+c.receipt),'旧AI取込に同じ受付番号があります。履歴を確認してください。');
  check(separateSimple||!(next.simpleEntries||[]).some(e=>e.date===c.date&&(!e.venue||e.venue===c.venue)&&(!e.type||e.type===c.type)),'同日の簡単記録があります。同じ購入なら追加保存せず、履歴で確認してください。別の購入の場合のみ確認チェックを入れてください。');
  const race=existing||{id:uid(),date:c.date,venue:c.venue,number:c.number,name:c.name};if(!existing)next.races.push(race);
  const ticket={id:uid(),raceId:race.id,type:c.type,kind:c.tickets.some(l=>l.status==='pending')?'advance':'reported',memo:'AI取込'+(c.receipt?'・受付番号 '+c.receipt:'')+(c.receiptTime?' '+c.receiptTime:''),createdAt:new Date().toISOString(),aiImport:{receiptKey:key,fingerprint:fp,imageId:c.imageId,raceKey:raceKey(c),metadata:c.metadata}};
  next.tickets.push(ticket);for(const l of c.tickets)next.lines.push({id:uid(),ticketId:ticket.id,numbers:l.numbers,stake:l.stake,payout:l.payout??0,refund:l.refund,status:l.status});
 }
 return validateData(next);
}

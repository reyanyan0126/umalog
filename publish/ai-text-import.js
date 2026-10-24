import {VENUES,TYPES,combination,validDate,MAX_MONEY} from './core.js';
const normalize=s=>String(s||'').normalize('NFKC').replace(/\r/g,'').replace(/[：]/g,':').replace(/，/g,',').replace(/[－―–—]/g,'-');
const amount=s=>{if(!s||/^(未確認|不明|なし|-)$/.test(s.trim()))return null;const n=Number(s.replace(/[,円\s]/g,''));return Number.isSafeInteger(n)&&n>=0&&n<=MAX_MONEY?n:null;};
const value=(s,key)=>{const m=s.match(new RegExp('^'+key+'\\s*:\\s*(.*)$','m'));return m?m[1].trim():null;};
export function parseAiImport(raw){
 if(typeof raw!=='string'||raw.length>120000)throw Error('貼り付け文字数が多すぎます。');
 const s=normalize(raw),start=s.indexOf('【うまログ登録データ】'),end=s.indexOf('【登録データ終了】');
 if(start<0||end<start)throw Error('うまログ登録データの開始・終了マークがありません。');
 const body=s.slice(start,end),section=(name,next)=>{const a=body.indexOf('【'+name+'】');if(a<0)return '';const b=body.indexOf('【',a+1);return body.slice(a+(name.length+2),b<0?body.length:b);};
 const date=value(body,'開催日'),venue=value(body,'競馬場'),rn=value(body,'レース番号'),type=value(body,'券種');
 if(!validDate(date))throw Error('開催日が未確認です。日付を確認して修正してください。');
 if(!VENUES.includes(venue))throw Error('競馬場が不明です。対応する競馬場名を指定してください。');
 const number=Number((rn||'').replace(/R$/i,''));if(!Number.isInteger(number)||number<1||number>12)throw Error('レース番号は1R〜12Rで指定してください。');
 if(!TYPES.includes(type))throw Error('券種が不正です。単勝・複勝・馬連・ワイド・三連複などの正式名称を指定してください。');
 const purchase=section('購入情報'),rows=purchase.split('\n').map(x=>x.trim()).filter(Boolean),tickets=[];
 for(const row of rows){
  const m=row.match(/^(\d{1,2}(?:\s*[-→>]\s*\d{1,2}){0,2})\s*:\s*([\d,]+)\s*円(?:\s*[／/]\s*(的中|不的中|未確定))?(?:\s*[／/]\s*払戻\s*([\d,]+)\s*円)?/);
  if(!m)throw Error('購入情報に読めない行があります: '+row.slice(0,45));
  const numbers=combination(type,m[1].split(/[-→>]/).map(Number)),stake=amount(m[2]),payout=m[4]===undefined?null:amount(m[4]);
  if(!stake||stake%100)throw Error('購入額は100円単位で指定してください: '+row);
  tickets.push({numbers,stake,payout,hit:m[3]||null});
 }
 if(!tickets.length||tickets.length>1000)throw Error('買い目は1〜1000件で指定してください。');
 const summary=section('収支'),totalPurchase=amount(value(summary,'購入合計')),totalPayout=amount(value(summary,'払戻合計')),refund=amount(value(summary,'返還合計'))??0;
 const stake=tickets.reduce((a,t)=>a+t.stake,0);
 if(totalPurchase===null||totalPurchase!==stake)throw Error('購入合計と買い目の金額が一致しません。');
 if(totalPayout===null)throw Error('払戻合計が未確認です。0円の場合は0円と記載してください。');
 const known=tickets.reduce((a,t)=>a+(t.payout??0),0),unknown=tickets.filter(t=>t.payout===null);
 if(known>totalPayout)throw Error('明細の払戻額が払戻合計を超えています。');
 if(!unknown.length&&known!==totalPayout)throw Error('明細払戻額と払戻合計が一致しません。');
 if(unknown.length===1)unknown[0].payout=totalPayout-known;
 if(unknown.length>1&&known!==totalPayout)throw Error('払戻額の未確認行が複数あります。明細の払戻を確認してください。');
 if(unknown.length>1)unknown.forEach(t=>t.payout=0);
 if(refund!==0)throw Error('返還がある場合は買い目別の返還情報が必要です。現在の形式では登録を保留してください。');
 const keys=new Set();for(const t of tickets){const key=t.numbers.join('-');if(keys.has(key))throw Error('同じ買い目が重複しています: '+key);keys.add(key);if(t.hit==='不的中'&&t.payout>0)throw Error('不的中行に払戻金があります。');}
 const results=section('レース結果'),podium=[1,2,3].map(n=>{const m=value(results,n+'着');const x=m&&m.match(/^(\d{1,2})(?:\s|$)/);return x?Number(x[1]):null;});
 return {date,venue,number,type,name:(value(body,'レース名')||'').slice(0,100),receipt:value(body,'受付番号'),tickets,totalPurchase,totalPayout,refund,podium:podium.every(Number.isInteger)?podium:null};
}

import {VENUES,validDate,raceKey,check} from './core.js';
// Enable only after written permission, delivery contract and endpoint QA.
// No credentials or sample race records are bundled with the app.
export const RACE_PROVIDER=null;
export const emptyCatalog=()=>({version:1,records:[],lastSuccess:null,lastAttempt:null,lastCount:0,error:''});
const timestamp=v=>v===null||(typeof v==='string'&&Number.isFinite(Date.parse(v)));
export function validateRecords(records){
 check(Array.isArray(records)&&records.length<=100000,'レース情報の件数・形式が不正です。');const keys=new Set();
 return records.map(r=>{check(r&&validDate(r.date)&&VENUES.includes(r.venue)&&Number.isInteger(r.number)&&r.number>=1&&r.number<=12,'レース照合キーが不正です。');
  check(!keys.has(raceKey(r)),'レース情報が重複しています。');keys.add(raceKey(r));
  for(const k of ['name','condition','grade'])check(r[k]===null||(typeof r[k]==='string'&&r[k].length>0&&r[k].length<=100),'競走条件の形式が不正です。');
  check(r.surface===null||['芝','ダート','障害'].includes(r.surface),'馬場種別が不正です。');check(r.distance===null||(Number.isInteger(r.distance)&&r.distance>=100&&r.distance<=10000),'距離が不正です。');
  check(typeof r.source==='string'&&r.source.length>0&&r.source.length<=200&&typeof r.updatedAt==='string'&&timestamp(r.updatedAt),'情報源・更新日時がありません。');
  return {date:r.date,venue:r.venue,number:r.number,name:r.name,condition:r.condition,grade:r.grade,surface:r.surface,distance:r.distance,source:r.source,updatedAt:r.updatedAt};
 });
}
export function validateCatalog(c){check(c?.version===1&&timestamp(c.lastSuccess)&&timestamp(c.lastAttempt)&&Number.isInteger(c.lastCount)&&c.lastCount>=0&&c.lastCount<=100000&&typeof c.error==='string'&&c.error.length<=300,'保存済みレース情報の形式が不正です。');return {...c,records:validateRecords(c.records)};}
export function lookupRace(r,catalog){return catalog.records.find(m=>raceKey(m)===raceKey(r))||null;}
export function raceDescription(r,catalog){const m=lookupRace(r,catalog);return m?[m.name||'名称未取得',m.condition||'条件未取得',m.grade||'格付け未取得',m.surface||'種別未取得',m.distance?`${m.distance}m`:'距離未取得',`情報源：${m.source}`,`データ更新：${m.updatedAt}`].join(' / '):'情報未取得（開催日・競馬場・レース番号で照合）。収支はそのまま登録できます。';}
// An approved provider must deliver the normalized {records: [...]} JSON contract.
// Send no ticket/history information. Retain older dates when refreshing recent races.
export async function refreshCatalog(current,{provider=RACE_PROVIDER,fetcher=globalThis.fetch,now=new Date().toISOString(),timeoutMs=10000}={}){
 if(!provider)return {catalog:current,status:'unconfigured'};
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeoutMs);
 try{check(provider.authorized===true&&/^https:\/\//.test(provider.url),'利用許諾済みの提供元が未設定です。');
  const response=await fetcher(provider.url,{signal:controller.signal,cache:'no-store',credentials:'omit',redirect:'error'});
  check(response.ok,`レース情報の通信エラー（HTTP ${response.status}）。`);
  const text=await response.text();check(text.length<=10000000,'レース情報が大きすぎます。');const records=validateRecords(JSON.parse(text).records);
  const merged=new Map(current.records.map(r=>[raceKey(r),r]));for(const r of records)merged.set(raceKey(r),r);
  const catalog=validateCatalog({...current,records:[...merged.values()],lastAttempt:now,lastSuccess:now,lastCount:records.length,error:''});
  return {catalog,status:'success'};
 }catch(e){return {catalog:{...current,lastAttempt:now,error:controller.signal.aborted?'通信が時間内に完了しませんでした。取得済み情報は保持しています。':e instanceof SyntaxError?'提供元のJSON形式が不正です。':String(e.message||'通信に失敗しました。').slice(0,300)},status:'error'};}
 finally{clearTimeout(timer);}
}

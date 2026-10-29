import {snapshotOf,decodeSnapshot,recordCount} from './backup-integrity.js';
import {migrateGrowth} from './growth-v2.js';
import {assertExpectedRevision,nextLedgerRevision,readLedgerRevision} from './ledger-revision.js';
import {emptyCalendar,validateCalendar} from "./calendar.js";
import {emptyData,validateData,recalculate} from './core.js';
import {validateCatalog} from './race-info.js';
const DB='umalog',VERSION=1,STORE='state';
let connection;
export function openDB(){return new Promise((resolve,reject)=>{const req=indexedDB.open(DB,VERSION);req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains(STORE))req.result.createObjectStore(STORE);};req.onerror=()=>reject(req.error);req.onblocked=()=>reject(new Error('別のタブを閉じて再試行してください。'));req.onsuccess=()=>{connection=req.result;connection.onversionchange=()=>{req.result.close();connection=null;};resolve(connection);};});}
export async function load(){return (await loadWithRevision()).data;}
// One atomic write: failed validation/transaction leaves the old snapshot intact.
export async function loadWithRevision(){
 const db=connection||await openDB();
 return new Promise((resolve,reject)=>{
  const tx=db.transaction(STORE,'readonly'),store=tx.objectStore(STORE),main=store.get('main'),rev=store.get('mainRevision'),backups=store.count(IDBKeyRange.bound('ledgerBackup:','ledgerBackup:\uffff'));
  let snapshot;
  tx.oncomplete=()=>{try{if(snapshot===undefined&&(readLedgerRevision(rev.result)>0||backups.result>0))throw new Error('収支本体が見つかりません。既存バックアップを保護するため保存を停止しました。');resolve({data:snapshot!==undefined?migrateGrowth(validateData(snapshot),new Date(),snapshot.character.exp):migrateGrowth(emptyData()),revision:readLedgerRevision(rev.result)});}catch(e){reject(e);}};
  main.onsuccess=()=>{snapshot=main.result;};
  tx.onabort=()=>reject(tx.error||new Error('データを読み取れませんでした。'));
  tx.onerror=()=>reject(tx.error||new Error('データを読み取れませんでした。'));
 });
}
export async function save(input,{clearDraftKey=null,clearAllDrafts=false,expectedRevision=null,allowEmpty=false,restore=false}={}){
 assertExpectedRevision(expectedRevision);
 if(expectedRevision===null)throw new Error('読み込み済みの更新番号が必要です。');
 if(clearDraftKey!==null)draftKey(clearDraftKey);
 const data=validateData(recalculate(structuredClone(input))),db=connection||await openDB();
 const snapshot=snapshotOf(data,expectedRevision+1);
 return new Promise((resolve,reject)=>{
  const tx=db.transaction(STORE,'readwrite'),store=tx.objectStore(STORE);
  const lookup=store.get('mainRevision'),savedTime=store.get('lastMainSaveAt'),previous=store.get('main'),backupCount=store.count(IDBKeyRange.bound('ledgerBackup:','ledgerBackup:\uffff'));
  let problem;
  let applied=false;
  const maybeApplySave=()=>{
   if(applied||[lookup,savedTime,previous,backupCount].some(request=>request.readyState!=='done'))return;
   applied=true;
   applySave();
  };
  for(const request of [lookup,savedTime,previous,backupCount])request.onsuccess=maybeApplySave;
  function applySave(){try{
   const nextRevision=nextLedgerRevision(lookup.result,expectedRevision);
   const old=previous.result;
   if(old===undefined&&(expectedRevision>0||backupCount.result>0))throw new Error('収支本体が見つかりません。残存するバックアップを保護するため保存を停止しました。');
   if(old!==undefined){
    validateData(old);
    if((recordCount(old)>0&&recordCount(data)===0)||(old.races.length>0&&data.races.length===0)){
     if(restore||!allowEmpty)throw new Error('空データによる全件上書きを阻止しました。');
    }
    // Protect exact pre-migration/pre-delete bytes, including pre-backup releases.
    const oldKey='ledgerBackup:'+String(expectedRevision).padStart(16,'0');
    store.put(snapshotOf(old,expectedRevision,savedTime.result||snapshot.savedAt),oldKey);
    if(restore)store.put(snapshotOf(old,expectedRevision),'preRestoreBackup');
   }
   store.put(data,'main');store.put(nextRevision,'mainRevision');store.put(snapshot.savedAt,'lastMainSaveAt');
   store.put(snapshot,'ledgerBackup:'+String(nextRevision).padStart(16,'0'));
   // Sort numerically: older releases used 12-digit keys. Deduplicate by revision.
   const cursor=store.openCursor(IDBKeyRange.bound('ledgerBackup:','ledgerBackup:\uffff')),rows=[];
   cursor.onsuccess=()=>{try{const c=cursor.result;if(c){rows.push({key:c.key,revision:c.value.revision});c.continue();return;}
    rows.sort((a,b)=>b.revision-a.revision);const seen=new Set();let kept=0;
    for(const row of rows){if(seen.has(row.revision)||kept>=50)store.delete(row.key);else{seen.add(row.revision);kept++;}}
   }catch(e){problem=e;tx.abort();}};
   if(clearAllDrafts){const cursor=store.openCursor(IDBKeyRange.bound('entryDraft:','entryDraft:\uffff'));cursor.onsuccess=()=>{const c=cursor.result;if(c){c.delete();c.continue();}};}
   else if(clearDraftKey!==null)store.delete('entryDraft:'+clearDraftKey);
  }catch(error){problem=error;tx.abort();}};
  tx.oncomplete=()=>{
   // A committed write is not yet considered verified: re-read the durable ledger.
   (async()=>{
    const verifyTx=db.transaction(STORE,'readonly'),verifyStore=verifyTx.objectStore(STORE);
    const main=verifyStore.get('main'),revision=verifyStore.get('mainRevision'),backup=verifyStore.get('ledgerBackup:'+String(expectedRevision+1).padStart(16,'0'));
    await new Promise((resolve,reject)=>{verifyTx.oncomplete=resolve;verifyTx.onabort=()=>reject(verifyTx.error||new Error('保存後の読取に失敗しました。'));verifyTx.onerror=()=>reject(verifyTx.error||new Error('保存後の読取に失敗しました。'));});
    if(revision.result!==expectedRevision+1||!backup.result||backup.result.checksum!==snapshot.checksum||JSON.stringify(validateData(main.result))!==snapshot.json)throw new Error('保存後の照合に失敗しました。再保存せず、バックアップと保存状態を確認してください。');
    return data;
   })().then(resolve,reject);
  };
  tx.onerror=()=>reject(problem||tx.error||new Error('保存に失敗しました。元の記録を保持しています。'));
  tx.onabort=()=>reject(problem||tx.error||new Error('自動バックアップを含む保存全体を中止しました。元の記録を保持しています。'));
 });
}
export async function listBackups(){
 const db=connection||await openDB();return new Promise((resolve,reject)=>{
  const tx=db.transaction(STORE,'readonly'),s=tx.objectStore(STORE),r=s.openCursor(IDBKeyRange.bound('ledgerBackup:','ledgerBackup:\uffff')),rows=[];
  const add=(key,value)=>{try{const d=decodeSnapshot(value);rows.push({key,...value,races:d.races.length,records:recordCount(d),valid:true});}catch(e){rows.push({key,savedAt:value?.savedAt,revision:value?.revision,valid:false,error:e.message});}};
  r.onsuccess=()=>{const c=r.result;if(c){add(c.key,c.value);c.continue();}};
  const protectedCopy=s.get('preRestoreBackup');protectedCopy.onsuccess=()=>{if(protectedCopy.result!==undefined)add('preRestoreBackup',protectedCopy.result);};
  tx.oncomplete=()=>resolve(rows.sort((a,b)=>b.revision-a.revision));tx.onabort=()=>reject(tx.error);tx.onerror=()=>reject(tx.error);
 });
}

// Disposable metadata is isolated from the v1 accounting snapshot and its backups.
export async function loadCatalog(){const db=connection||await openDB();return new Promise((resolve,reject)=>{const tx=db.transaction(STORE,'readonly'),r=tx.objectStore(STORE).get('raceCatalog');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}
export async function saveCatalog(catalog){catalog=validateCatalog(catalog);const db=connection||await openDB();return new Promise((resolve,reject)=>{const tx=db.transaction(STORE,'readwrite');tx.objectStore(STORE).put(catalog,'raceCatalog');tx.oncomplete=()=>resolve(catalog);tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||new Error('レース情報を保存できませんでした。'));});}

export async function loadCalendar(){const db=connection||await openDB();return new Promise((resolve,reject)=>{const tx=db.transaction(STORE,'readonly'),r=tx.objectStore(STORE).get('meetingCalendar');r.onsuccess=()=>{try{const value=r.result||{revision:0,importedAt:null,calendar:emptyCalendar()};if(!Number.isSafeInteger(value.revision)||value.revision<0||(value.importedAt!==null&&!Number.isFinite(Date.parse(value.importedAt))))throw new Error('開催キャッシュの管理情報が不正です。');value.calendar=validateCalendar(value.calendar);resolve(value);}catch(e){reject(e);}};r.onerror=()=>reject(r.error);});}
// Compare the preview revision and write only external information in one transaction.
export async function saveCalendar(input,expectedRevision){const calendar=validateCalendar(input),db=connection||await openDB();return new Promise((resolve,reject)=>{const tx=db.transaction(STORE,'readwrite'),store=tx.objectStore(STORE),r=store.get('meetingCalendar');let result,error;r.onsuccess=()=>{if((r.result?.revision||0)!==expectedRevision){error=new Error('別の画面で更新されています。再読込して差分を確認してください。');tx.abort();return;}result={revision:expectedRevision+1,importedAt:new Date().toISOString(),calendar};store.put(result,'meetingCalendar');};tx.oncomplete=()=>resolve(result);tx.onabort=()=>reject(error||tx.error||new Error('保存を中止しました。旧データを保持しています。'));tx.onerror=()=>reject(tx.error);});}

/* Entry drafts are isolated from main and JSON backups. Storage schema remains v1. */
async function readOptionalValue(key){
 const db=connection||await openDB();
 return new Promise((resolve,reject)=>{
  const req=db.transaction(STORE,'readonly').objectStore(STORE).get(key);
  req.onsuccess=()=>resolve(req.result||null);
  req.onerror=()=>reject(req.error);
 });
}
const draftKey=key=>{if(typeof key!=='string'||key.length===0||key.length>120)throw new Error('下書きの識別子が不正です。');return 'entryDraft:'+key;};
export async function loadEntryDraft(key){return readOptionalValue(draftKey(key));}
export async function saveEntryDraft(key,value){const db=connection||await openDB();return new Promise((resolve,reject)=>{const tx=db.transaction(STORE,'readwrite');tx.objectStore(STORE).put(value,draftKey(key));tx.oncomplete=()=>resolve(value);tx.onabort=()=>reject(tx.error||new Error('下書きを保存できませんでした。'));tx.onerror=()=>reject(tx.error);});}
export async function discardEntryDraft(key){const db=connection||await openDB();return new Promise((resolve,reject)=>{const tx=db.transaction(STORE,'readwrite');tx.objectStore(STORE).delete(draftKey(key));tx.oncomplete=()=>resolve();tx.onabort=()=>reject(tx.error||new Error('下書きを破棄できませんでした。'));tx.onerror=()=>reject(tx.error);});}
export async function loadMainSaveTime(){return readOptionalValue('lastMainSaveAt');}

/* User attestation only; a share/download dialog cannot prove a backup reached external storage. */
export async function loadBackupConfirmation(){return readOptionalValue('lastBackupConfirmedAt');}
export async function confirmBackupStored(){const at=new Date().toISOString(),db=connection||await openDB();return new Promise((resolve,reject)=>{const tx=db.transaction(STORE,'readwrite');tx.objectStore(STORE).put(at,'lastBackupConfirmedAt');tx.oncomplete=()=>resolve(at);tx.onabort=()=>reject(tx.error||new Error('確認日時を保存できませんでした。'));tx.onerror=()=>reject(tx.error);});}

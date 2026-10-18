import {migrateGrowth} from './growth-v2.js';
import {emptyCalendar,validateCalendar} from "./calendar.js";
import {emptyData,validateData,recalculate} from './core.js';
import {validateCatalog} from './race-info.js';
const DB='umalog',VERSION=1,STORE='state';
let connection;
export function openDB(){return new Promise((resolve,reject)=>{const req=indexedDB.open(DB,VERSION);req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains(STORE))req.result.createObjectStore(STORE);};req.onerror=()=>reject(req.error);req.onblocked=()=>reject(new Error('別のタブを閉じて再試行してください。'));req.onsuccess=()=>{connection=req.result;connection.onversionchange=()=>connection.close();resolve(connection);};});}
export async function load(){const db=connection||await openDB();return new Promise((resolve,reject)=>{const tx=db.transaction(STORE,'readonly'),r=tx.objectStore(STORE).get('main');r.onsuccess=()=>{try{resolve(r.result?migrateGrowth(validateData(r.result),new Date(),r.result.character.exp):migrateGrowth(emptyData()));}catch(e){reject(e);}};r.onerror=()=>reject(r.error);});}
// One atomic write: failed validation/transaction leaves the old snapshot intact.
export async function loadWithRevision(){
 const db=connection||await openDB();
 return new Promise((resolve,reject)=>{
  const tx=db.transaction(STORE,'readonly'),store=tx.objectStore(STORE),main=store.get('main'),rev=store.get('mainRevision');
  let snapshot;
  tx.oncomplete=()=>{try{resolve({data:snapshot?migrateGrowth(validateData(snapshot),new Date(),snapshot.character.exp):migrateGrowth(emptyData()),revision:rev.result||0});}catch(e){reject(e);}};
  main.onsuccess=()=>{snapshot=main.result;};
  tx.onabort=()=>reject(tx.error||new Error('データを読み取れませんでした。'));
  tx.onerror=()=>reject(tx.error);
 });
}
export async function save(input,{clearDraftKey=null,clearAllDrafts=false,expectedRevision=null}={}){
 const data=validateData(recalculate(input)),db=connection||await openDB();
 return new Promise((resolve,reject)=>{
  const tx=db.transaction(STORE,'readwrite'),store=tx.objectStore(STORE),lookup=store.get('mainRevision');
  let problem;
  lookup.onsuccess=()=>{try{
   const revision=lookup.result||0;
   if(expectedRevision!==null&&revision!==expectedRevision){
    problem=new Error('別のタブで記録が更新されています。現在の入力は保存していません。JSONバックアップを取ってから画面を再読込し、変更内容を確認してください。');
    problem.code='STALE_LEDGER';tx.abort();return;
   }
   store.put(data,'main');store.put(revision+1,'mainRevision');store.put(new Date().toISOString(),'lastMainSaveAt');
   if(clearAllDrafts){
    const cursor=store.openCursor(IDBKeyRange.bound('entryDraft:','entryDraft:\uffff'));
    cursor.onsuccess=()=>{const record=cursor.result;if(record){record.delete();record.continue();}};
   }else if(clearDraftKey!==null)store.delete('entryDraft:'+clearDraftKey);
  }catch(error){problem=error;if(tx.readyState==='active')tx.abort();}};
  tx.oncomplete=()=>resolve(data);
  tx.onerror=()=>reject(problem||tx.error||new Error('保存に失敗しました。入力内容を保持しています。'));
  tx.onabort=()=>reject(problem||tx.error||new Error('保存が中止されました。入力内容を保持しています。'));
 });
}

// Disposable metadata is isolated from the v1 accounting snapshot and its backups.
export async function loadCatalog(){const db=connection||await openDB();return new Promise((resolve,reject)=>{const tx=db.transaction(STORE,'readonly'),r=tx.objectStore(STORE).get('raceCatalog');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}
export async function saveCatalog(catalog){catalog=validateCatalog(catalog);const db=connection||await openDB();return new Promise((resolve,reject)=>{const tx=db.transaction(STORE,'readwrite');tx.objectStore(STORE).put(catalog,'raceCatalog');tx.oncomplete=()=>resolve(catalog);tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||new Error('レース情報を保存できませんでした。'));});}

export async function loadCalendar(){const db=connection||await openDB();return new Promise((resolve,reject)=>{const tx=db.transaction(STORE,'readonly'),r=tx.objectStore(STORE).get('meetingCalendar');r.onsuccess=()=>{try{const value=r.result||{revision:0,importedAt:null,calendar:emptyCalendar()};if(!Number.isSafeInteger(value.revision)||value.revision<0||(value.importedAt!==null&&!Number.isFinite(Date.parse(value.importedAt))))throw new Error('開催キャッシュの管理情報が不正です。');value.calendar=validateCalendar(value.calendar);resolve(value);}catch(e){reject(e);}};r.onerror=()=>reject(r.error);});}
// Compare the preview revision and write only external information in one transaction.
export async function saveCalendar(input,expectedRevision){const calendar=validateCalendar(input),db=connection||await openDB();return new Promise((resolve,reject)=>{const tx=db.transaction(STORE,'readwrite'),store=tx.objectStore(STORE),r=store.get('meetingCalendar');let result,error;r.onsuccess=()=>{if((r.result?.revision||0)!==expectedRevision){error=new Error('別の画面で更新されています。再読込して差分を確認してください。');tx.abort();return;}result={revision:expectedRevision+1,importedAt:new Date().toISOString(),calendar};store.put(result,'meetingCalendar');};tx.oncomplete=()=>resolve(result);tx.onabort=()=>reject(error||tx.error||new Error('保存を中止しました。旧データを保持しています。'));tx.onerror=()=>reject(tx.error);});}

/* Entry drafts are isolated from main and JSON backups. Storage schema remains v1. */
const draftKey=key=>'entryDraft:'+key;
export async function loadEntryDraft(key){const db=connection||await openDB();return new Promise((resolve,reject)=>{const req=db.transaction(STORE,'readonly').objectStore(STORE).get(draftKey(key));req.onsuccess=()=>resolve(req.result||null);req.onerror=()=>reject(req.error);});}
export async function saveEntryDraft(key,value){const db=connection||await openDB();return new Promise((resolve,reject)=>{const tx=db.transaction(STORE,'readwrite');tx.objectStore(STORE).put(value,draftKey(key));tx.oncomplete=()=>resolve(value);tx.onabort=()=>reject(tx.error||new Error('下書きを保存できませんでした。'));tx.onerror=()=>reject(tx.error);});}
export async function discardEntryDraft(key){const db=connection||await openDB();return new Promise((resolve,reject)=>{const tx=db.transaction(STORE,'readwrite');tx.objectStore(STORE).delete(draftKey(key));tx.oncomplete=()=>resolve();tx.onabort=()=>reject(tx.error||new Error('下書きを破棄できませんでした。'));tx.onerror=()=>reject(tx.error);});}
export async function loadMainSaveTime(){const db=connection||await openDB();return new Promise((resolve,reject)=>{const req=db.transaction(STORE,'readonly').objectStore(STORE).get('lastMainSaveAt');req.onsuccess=()=>resolve(req.result||null);req.onerror=()=>reject(req.error);});}

/* User attestation only; a share/download dialog cannot prove a backup reached external storage. */
export async function loadBackupConfirmation(){const db=connection||await openDB();return new Promise((resolve,reject)=>{const req=db.transaction(STORE,'readonly').objectStore(STORE).get('lastBackupConfirmedAt');req.onsuccess=()=>resolve(req.result||null);req.onerror=()=>reject(req.error);});}
export async function confirmBackupStored(){const at=new Date().toISOString(),db=connection||await openDB();return new Promise((resolve,reject)=>{const tx=db.transaction(STORE,'readwrite');tx.objectStore(STORE).put(at,'lastBackupConfirmedAt');tx.oncomplete=()=>resolve(at);tx.onabort=()=>reject(tx.error||new Error('確認日時を保存できませんでした。'));tx.onerror=()=>reject(tx.error);});}

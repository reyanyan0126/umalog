import {migrateGrowth} from './growth-v2.js';
import {emptyCalendar,validateCalendar} from "./calendar.js";
import {emptyData,validateData,recalculate} from './core.js';
import {validateCatalog} from './race-info.js';
const DB='umalog',VERSION=1,STORE='state';
let connection;
export function openDB(){return new Promise((resolve,reject)=>{const req=indexedDB.open(DB,VERSION);req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains(STORE))req.result.createObjectStore(STORE);};req.onerror=()=>reject(req.error);req.onblocked=()=>reject(new Error('別のタブを閉じて再試行してください。'));req.onsuccess=()=>{connection=req.result;connection.onversionchange=()=>connection.close();resolve(connection);};});}
export async function load(){const db=connection||await openDB();return new Promise((resolve,reject)=>{const tx=db.transaction(STORE,'readonly'),r=tx.objectStore(STORE).get('main');r.onsuccess=()=>{try{resolve(r.result?migrateGrowth(validateData(r.result),new Date(),r.result.character.exp):migrateGrowth(emptyData()));}catch(e){reject(e);}};r.onerror=()=>reject(r.error);});}
// One atomic write: failed validation/transaction leaves the old snapshot intact.
export async function save(input){const data=validateData(recalculate(input)),db=connection||await openDB();return new Promise((resolve,reject)=>{const tx=db.transaction(STORE,'readwrite');tx.objectStore(STORE).put(data,'main');tx.oncomplete=()=>resolve(data);tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||new Error('保存が中止されました。'));});}

// Disposable metadata is isolated from the v1 accounting snapshot and its backups.
export async function loadCatalog(){const db=connection||await openDB();return new Promise((resolve,reject)=>{const tx=db.transaction(STORE,'readonly'),r=tx.objectStore(STORE).get('raceCatalog');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}
export async function saveCatalog(catalog){catalog=validateCatalog(catalog);const db=connection||await openDB();return new Promise((resolve,reject)=>{const tx=db.transaction(STORE,'readwrite');tx.objectStore(STORE).put(catalog,'raceCatalog');tx.oncomplete=()=>resolve(catalog);tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||new Error('レース情報を保存できませんでした。'));});}

export async function loadCalendar(){const db=connection||await openDB();return new Promise((resolve,reject)=>{const tx=db.transaction(STORE,'readonly'),r=tx.objectStore(STORE).get('meetingCalendar');r.onsuccess=()=>resolve(r.result||{revision:0,importedAt:null,calendar:emptyCalendar()});r.onerror=()=>reject(r.error);});}
// Compare the preview revision and write only external information in one transaction.
export async function saveCalendar(input,expectedRevision){const calendar=validateCalendar(input),db=connection||await openDB();return new Promise((resolve,reject)=>{const tx=db.transaction(STORE,'readwrite'),store=tx.objectStore(STORE),r=store.get('meetingCalendar');let result,error;r.onsuccess=()=>{if((r.result?.revision||0)!==expectedRevision){error=new Error('別の画面で更新されています。再読込して差分を確認してください。');tx.abort();return;}result={revision:expectedRevision+1,importedAt:new Date().toISOString(),calendar};store.put(result,'meetingCalendar');};tx.oncomplete=()=>resolve(result);tx.onabort=()=>reject(error||tx.error||new Error('保存を中止しました。旧データを保持しています。'));tx.onerror=()=>reject(tx.error);});}

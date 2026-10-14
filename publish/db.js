import {emptyData,validateData,recalculate} from './core.js';
const DB='umalog',VERSION=1,STORE='state';
let connection;
export function openDB(){return new Promise((resolve,reject)=>{const req=indexedDB.open(DB,VERSION);req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains(STORE))req.result.createObjectStore(STORE);};req.onerror=()=>reject(req.error);req.onblocked=()=>reject(new Error('別のタブを閉じて再試行してください。'));req.onsuccess=()=>{connection=req.result;connection.onversionchange=()=>connection.close();resolve(connection);};});}
export async function load(){const db=connection||await openDB();return new Promise((resolve,reject)=>{const tx=db.transaction(STORE,'readonly'),r=tx.objectStore(STORE).get('main');r.onsuccess=()=>{try{resolve(r.result?validateData(r.result):emptyData());}catch(e){reject(e);}};r.onerror=()=>reject(r.error);});}
// One atomic write: failed validation/transaction leaves the old snapshot intact.
export async function save(input){const data=validateData(recalculate(input)),db=connection||await openDB();return new Promise((resolve,reject)=>{const tx=db.transaction(STORE,'readwrite');tx.objectStore(STORE).put(data,'main');tx.oncomplete=()=>resolve(data);tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||new Error('保存が中止されました。'));});}

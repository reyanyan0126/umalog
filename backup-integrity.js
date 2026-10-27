import {validateData} from './core.js';
// Accidental corruption detection, not a cryptographic signature.
export function checksum(json){let hash=2166136261;for(let i=0;i<json.length;i++){hash^=json.charCodeAt(i);hash=Math.imul(hash,16777619);}return (hash>>>0).toString(16).padStart(8,'0');}
export function recordCount(d){return d.tickets.length+(d.simpleEntries||[]).length;}
export function snapshotOf(data,revision,savedAt=new Date().toISOString()){
 validateData(data);const json=JSON.stringify(data);validateData(JSON.parse(json));
 return {savedAt,revision,json,checksum:checksum(json)};
}
export function decodeSnapshot(snapshot){
 if(!snapshot||typeof snapshot.json!=='string'||!Number.isSafeInteger(snapshot.revision)||snapshot.revision<0||!Number.isFinite(Date.parse(snapshot.savedAt)))throw new Error('バックアップの管理情報が不正です。');
 if(snapshot.checksum!==undefined&&snapshot.checksum!==checksum(snapshot.json))throw new Error('バックアップの整合性検証に失敗しました。');
 return validateData(JSON.parse(snapshot.json));
}

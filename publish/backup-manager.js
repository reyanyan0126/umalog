import {listBackups} from './db.js';
import {decodeSnapshot,recordCount} from './backup-integrity.js';
import {backupFileName,validateData} from './core.js';
import {migrateGrowth} from './growth-v2.js';
import {cashFinance} from './simple-ledger.js';
const totals=d=>{const x=cashFinance(d);return `購入 ${x.recordedPurchase.toLocaleString('ja-JP')}円 / 払戻・返還 ${x.receipts.toLocaleString('ja-JP')}円`;};
export async function exportBackup(data){
 const json=JSON.stringify(validateData(data),null,2),name=backupFileName(),file=new File([json],name,{type:'application/json'});
 if(navigator.canShare?.({files:[file]})){
  try{await navigator.share({files:[file],title:'うまログ バックアップ'});return;}catch(e){if(e.name==='AbortError')return;}
 }
 const url=URL.createObjectURL(file),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),60000);
}
export function offerExternalBackup(data){
 let panel=document.getElementById('externalBackupPrompt');
 if(!panel){panel=document.createElement('aside');panel.id='externalBackupPrompt';panel.className='card';panel.setAttribute('aria-live','polite');document.getElementById('app').before(panel);}
 panel.replaceChildren();
 const text=document.createElement('p');text.textContent='端末内の自動バックアップを保存しました。独立した保護のため、JSONを「ファイルに保存」してください。';
 const button=document.createElement('button');button.textContent='最新JSONをファイルに保存';button.onclick=()=>exportBackup(data).catch(e=>{text.textContent=e.message;});
 const close=document.createElement('button');close.className='quiet';close.textContent='あとで';close.onclick=()=>panel.remove();panel.append(text,button,close);
}
export async function mountBackupManager(container,{commit,getData,guard,notify}){
 const section=document.createElement('details');section.id='backupManager';container.append(section);
 const heading=document.createElement('summary');heading.textContent='自動バックアップ履歴・復元';
 const help=document.createElement('p');help.className='help';help.textContent='直近50世代をこの端末のIndexedDBに保存します。保存領域の消去では全世代が失われます。iPhoneでは保存ボタン→共有→「ファイルに保存」で、このiPhone内またはiCloud Driveを選んでください。Safariとホーム画面版は同じ記録とは限りません。記録した側から書き出してください。バックアップ失敗時は収支の変更も保存しません。';
 section.append(heading,help);
 try{
  const rows=await listBackups();if(!section.isConnected)return;
  if(!rows.length){const p=document.createElement('p');p.textContent='自動バックアップはまだありません。記録の保存時に作成します。';section.append(p);}
  for(const row of rows){
   const box=document.createElement('details'),summary=document.createElement('summary');
   summary.textContent=(row.key==='preRestoreBackup'?'復元直前の保護コピー':'世代 '+row.revision)+' / '+(row.savedAt?new Date(row.savedAt).toLocaleString('ja-JP'):'日時不明');box.append(summary);
   const p=document.createElement('p');p.textContent=row.valid?`${row.races}レース / ${row.records}購入記録 / ${row.checksum?'整合性確認済み':'旧形式：構造確認済み'}`:'復元不可：'+row.error;box.append(p);
   if(row.valid){
    const d=decodeSnapshot(row),amounts=document.createElement('p'),download=document.createElement('button');amounts.textContent=totals(d);box.append(amounts);download.textContent='この世代をJSONで保存';download.onclick=guard(()=>exportBackup(d));box.append(download);
    const restore=document.createElement('button');restore.textContent='内容を確認して復元';restore.className='danger';restore.onclick=guard(async()=>{
     const current=getData();if(!confirm(`現在：${current.races.length}レース / ${recordCount(current)}購入記録 / ${totals(current)}\n復元後：${d.races.length}レース / ${recordCount(d)}購入記録 / ${totals(d)}\n現在のデータを保護コピーに保存して全件置換します。実行しますか？`))return;
     await commit(migrateGrowth(structuredClone(d),new Date(),d.character.exp),{restore:true,clearAllDrafts:true});notify('復元が完了しました。復元直前の記録も保護しています。');location.hash='home';
    });box.append(restore);
   }
   section.append(box);
  }
 }catch(e){const p=document.createElement('p');p.className='error';p.textContent='バックアップ一覧を読み込めませんでした：'+e.message;section.append(p);}
}

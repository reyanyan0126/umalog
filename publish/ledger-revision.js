// Pure validation shared by IndexedDB transactions and regression tests.
export function assertExpectedRevision(expectedRevision){
 if(expectedRevision!==null&&(!Number.isSafeInteger(expectedRevision)||expectedRevision<0))
  throw new Error('保存時の更新番号が不正です。');
}
export function nextLedgerRevision(storedRevision,expectedRevision=null){
 assertExpectedRevision(expectedRevision);
 const revision=storedRevision===undefined?0:storedRevision;
 if(!Number.isSafeInteger(revision)||revision<0||revision===Number.MAX_SAFE_INTEGER)
  throw new Error('保存データの更新番号が不正です。記録を変更せず、バックアップを確認してください。');
 if(expectedRevision!==null&&revision!==expectedRevision){
  const error=new Error('別のタブで記録が更新されています。現在の入力は保存していません。JSONバックアップを取ってから画面を再読込し、変更内容を確認してください。');
  error.code='STALE_LEDGER';
  throw error;
 }
 return revision+1;
}

export function readLedgerRevision(storedRevision){
 const revision=storedRevision===undefined?0:storedRevision;
 if(!Number.isSafeInteger(revision)||revision<0)
  throw new Error('保存データの更新番号が不正です。記録を変更せず、バックアップを確認してください。');
 return revision;
}

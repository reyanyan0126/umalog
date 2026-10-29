import {checksum} from './backup-integrity.js';
import {validateData} from './core.js';

// A post-commit verification failure must not trigger an automatic retry.
export function verifyPersistedLedger({main,revision,backup},expectedRevision,expectedJson){
 if(revision!==expectedRevision)throw new Error('保存後の更新番号が一致しません。再保存せず、保存状態を確認してください。');
 if(!backup||backup.revision!==expectedRevision||backup.json!==expectedJson||backup.checksum!==checksum(expectedJson))throw new Error('保存後のバックアップ照合に失敗しました。再保存せず、保存状態を確認してください。');
 if(JSON.stringify(validateData(main))!==expectedJson)throw new Error('保存後の収支本体照合に失敗しました。再保存せず、保存状態を確認してください。');
 return true;
}

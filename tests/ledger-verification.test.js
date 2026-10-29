import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyData} from '../core.js';
import {snapshotOf} from '../backup-integrity.js';
import {verifyPersistedLedger} from '../ledger-verification.js';

function fixture(){
 const main=emptyData(),backup=snapshotOf(main,1);
 return {main,revision:1,backup};
}
test('保存した本体・更新番号・バックアップが一致する',()=>{
 const saved=fixture();
 assert.equal(verifyPersistedLedger(saved,1,saved.backup.json),true);
});
test('別タブの更新番号を検出する',()=>{
 const saved=fixture();saved.revision=2;
 assert.throws(()=>verifyPersistedLedger(saved,1,saved.backup.json),/更新番号/);
});
test('バックアップ欠落を検出する',()=>{
 const saved=fixture();saved.backup=undefined;
 assert.throws(()=>verifyPersistedLedger(saved,1,JSON.stringify(saved.main)),/バックアップ/);
});
test('バックアップ改ざんを検出する',()=>{
 const saved=fixture();saved.backup.json+=' ';
 assert.throws(()=>verifyPersistedLedger(saved,1,JSON.stringify(saved.main)),/バックアップ/);
});
test('本体とバックアップの不一致を検出する',()=>{
 const saved=fixture();saved.main.settings.name='別の名前';
 assert.throws(()=>verifyPersistedLedger(saved,1,saved.backup.json),/収支本体/);
});

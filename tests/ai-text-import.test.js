import test from 'node:test';
import assert from 'node:assert/strict';
import {parseAiImport} from '../ai-text-import.js';
const base=`【うまログ登録データ】
開催日：2026-10-24
競馬場：京都
レース番号：1R
レース名：2歳未勝利
券種：三連複
受付番号：0001
【購入情報】
03-06-09：100円／不的中／払戻0円
03-09-11：100円／的中／払戻2,160円
【収支】
購入合計：200円
払戻合計：2,160円
返還合計：0円
【レース結果】
1着：03 馬A
2着：09 馬B
3着：11 馬C
【登録データ終了】`;
test('parses Japanese fixed text and podium',()=>{const r=parseAiImport(base);assert.equal(r.date,'2026-10-24');assert.equal(r.tickets.length,2);assert.equal(r.totalPayout,2160);assert.equal(r.metadata['1着'],'03 馬A');assert.equal(r.podium,null);});
test('supports single-win bet with a variable number of lines',()=>{const t=base.replace('三連複','単勝').replace('03-06-09','03').replace('03-09-11','11');assert.equal(parseAiImport(t).tickets[1].numbers.length,1);});
test('rejects totals that do not reconcile',()=>assert.throws(()=>parseAiImport(base.replace('購入合計：200円','購入合計：300円')),/一致/));
test('rejects missing dates rather than guessing',()=>assert.throws(()=>parseAiImport(base.replace('2026-10-24','未確認')),/開催日/));
test('rejects duplicate ticket lines',()=>assert.throws(()=>parseAiImport(base.replace('03-09-11','03-06-09')),/重複/));
test('rejects unknown payout distribution',()=>assert.throws(()=>parseAiImport(base.replace('／不的中／払戻0円','').replace('／的中／払戻2,160円','')),/未確認行/));

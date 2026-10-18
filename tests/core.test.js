import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyData,aggregate,box,combination,growth,recalculate,validateData,removeTicket,weekOf,jstToday,backupFreshness,backupFileName} from '../core.js';
function fixture(){const d=emptyData();d.races=[{id:'r1',date:'2026-10-04',venue:'東京',number:1,name:''}];d.tickets=[{id:'t1',raceId:'r1',type:'単勝',kind:'reported',memo:'',createdAt:'2026-10-04T00:00:00Z'}];d.lines=[{id:'l1',ticketId:'t1',numbers:[1],stake:500,status:'settled',payout:1200,refund:0}];return d;}
test('01: 500円→1200円 = +700円 / 240%',()=>{const s=aggregate(fixture());assert.equal(s.profit,700);assert.equal(s.returnRate,240);});
test('02: 三連複5頭BOX 10点・1000円',()=>{assert.equal(box('三連複',[1,2,3,4,5]).length,10);assert.equal(box('三連複',[1,2,3,4,5]).length*100,1000);assert.equal(box('三連単',[1,2,3,4,5]).length,60);});
test('03: ワイド2点1的中 50%',()=>{const d=fixture();d.tickets[0].type='ワイド';d.lines[0].numbers=[1,2];d.lines.push({...d.lines[0],id:'l2',numbers:[1,3],payout:0});assert.equal(aggregate(d).lineRate,50);});
test('04: 同一レース複数券種は的中1回',()=>{const d=fixture();d.tickets.push({...d.tickets[0],id:'t2',type:'複勝'});d.lines.push({...d.lines[0],id:'l2',ticketId:'t2'});assert.equal(aggregate(d).raceCount,1);assert.equal(aggregate(d).raceHits,1);});
test('05: pendingを集計除外、未確定レースもレース率除外',()=>{const d=fixture();d.lines.push({...d.lines[0],id:'l2',status:'pending',payout:0});const s=aggregate(d);assert.equal(s.purchase,500);assert.equal(s.pendingStake,500);assert.equal(s.profit,700);assert.equal(s.raceCount,0);});
test('06: settled 0は確定済み不的中',()=>{const d=fixture();d.lines[0].payout=0;const s=aggregate(d);assert.equal(s.pendingCount,0);assert.equal(s.lineRate,0);assert.equal(s.profit,-500);});
test('07: 全額返還は収支0・的中率分母から除外',()=>{for(const status of ['void','settled']){const d=fixture();Object.assign(d.lines[0],{status,payout:0,refund:500});validateData(d);const s=aggregate(d);assert.equal(s.profit,0);assert.equal(s.lineRate,null);assert.equal(s.raceRate,null);assert.equal(s.returnRate,100);}});
test('08: 編集・削除の同一集計関数で数字一致',()=>{const d=fixture();d.lines[0].payout=2000;assert.equal(aggregate(d,r=>r.date.startsWith('2026-10')).profit,aggregate(d).profit);removeTicket(d,'t1');assert.equal(aggregate(d).purchase,0);assert.equal(d.races.length,0);});
test('09: JSON roundtrip / 改変されたEXPは再計算',()=>{const d=recalculate(fixture(),'2026-10-15');d.character.exp=99999;const got=validateData(JSON.parse(JSON.stringify(d)));assert.notEqual(got.character.exp,99999);assert.deepEqual(got.lines,d.lines);});
test('11: 週間EXPは再計算しても重複なし / 3レース条件',()=>{const d=fixture();for(let i=2;i<=3;i++){d.races.push({...d.races[0],id:'r'+i,number:i});d.tickets.push({...d.tickets[0],id:'t'+i,raceId:'r'+i});d.lines.push({...d.lines[0],id:'l'+i,ticketId:'t'+i});}d.reviews.push({id:'v1',week:'2026-09-28',text:'振り返り'});let g=growth(d,'2026-10-15');assert.equal(g.character.exp,100);assert.equal(growth(recalculate(d,'2026-10-15'),'2026-10-15').character.exp,100);d.lines[2].status='pending';d.lines[2].payout=0;assert.equal(growth(d,'2026-10-15').character.exp,30);});
test('12: emptyは未計算・ゼロEXP',()=>{assert.equal(aggregate(emptyData()).returnRate,null);assert.equal(aggregate(emptyData()).lineRate,null);assert.equal(growth(emptyData()).character.exp,0);});
test('枠連ゾロ目可 / 馬番重複不可 / 順序',()=>{assert.deepEqual(combination('枠連',[2,2]),[2,2]);assert.throws(()=>combination('馬連',[2,2]));assert.deepEqual(combination('馬単',[9,1]),[9,1]);assert.deepEqual(combination('馬連',[9,1]),[1,9]);assert.throws(()=>combination('枠連',[1,9]));});
test('日本時間の月曜境界 / 未終了週はAのみ',()=>{assert.equal(jstToday(new Date('2026-10-11T15:00:00Z')),'2026-10-12');assert.equal(weekOf('2026-10-11'),'2026-10-05');assert.equal(weekOf('2026-10-12'),'2026-10-12');assert.equal(growth(fixture(),'2026-10-04').character.exp,10);assert.equal(growth(fixture(),'2026-10-05').character.exp,20);});
test('競馬しない週の振り返り20EXP / 未来週は加点なし',()=>{const d=emptyData();d.reviews=[{id:'v1',week:'2026-10-05',text:'今週は休み'}];assert.equal(growth(d,'2026-10-15').character.exp,20);assert.equal(growth(d,'2026-10-05').character.exp,0);});
test('復元のバージョン・参照・金額・状態・日付・重複を検証',()=>{for(const mutate of [d=>d.schemaVersion=2,d=>d.lines[0].ticketId='bad',d=>d.lines[0].stake=1.5,d=>d.lines[0].refund=600,d=>d.lines[0].status='pending',d=>d.races[0].date='2026-02-30',d=>d.lines.push({...d.lines[0]}),d=>d.settings.name='',d=>d.races.push({...d.races[0],id:'r2'})]){const d=fixture();mutate(d);assert.throws(()=>validateData(d));}});
test('回収率閾値80/100/120とレース的中率',()=>{for(const [payout,expected] of [[400,15],[500,30],[600,40]]){const d=fixture();d.lines[0].payout=payout;for(let i=2;i<=3;i++){d.races.push({...d.races[0],id:'r'+i,number:i});d.tickets.push({...d.tickets[0],id:'t'+i,raceId:'r'+i});d.lines.push({...d.lines[0],id:'l'+i,ticketId:'t'+i});}assert.equal(growth(d,'2026-10-15').history[0].d,expected);}});

test('v1.3.2 バックアップ確認は新しい帳簿保存で失効し、書き出し名に日本時間を付与',()=>{
 const saved='2026-10-18T08:05:00.000Z',confirmed='2026-10-18T08:06:00.000Z';
 assert.equal(backupFreshness(null,saved,Date.parse(confirmed)).kind,'missing');
 assert.equal(backupFreshness('2026-10-18T08:04:00.000Z',saved,Date.parse(confirmed)).kind,'outdated');
 assert.equal(backupFreshness(confirmed,saved,Date.parse(confirmed)).kind,'current');
 assert.equal(backupFreshness(confirmed,null,Date.parse(confirmed)).kind,'unknown');
 assert.equal(backupFreshness(confirmed,saved,Date.parse(confirmed)+31*86400000).kind,'aged');
 assert.equal(backupFreshness(confirmed,saved,Date.parse(confirmed)-86400000).days,0);
 assert.equal(backupFileName(new Date('2026-10-18T08:05:10.123Z')),'umalog-backup-2026-10-18_17-05-10.123.json');
});

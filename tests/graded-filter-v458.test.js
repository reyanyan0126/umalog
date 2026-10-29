import test from 'node:test';
import assert from 'node:assert/strict';
import {filterGradedEvents,periodEvents} from '../graded-races.js';
const events=[
 {date:'2026-10-25',venue:'京都',grade:'GI',status:'scheduled',name:'A'},
 {date:'2026-11-01',venue:'東京',grade:'GI',status:'scheduled',name:'B'},
 {date:'2027-01-10',venue:'中山',grade:'GIII',status:'scheduled',name:'C'},
 {date:'2027-01-17',venue:'中山',grade:'GII',status:'cancelled',name:'D'},
 {date:'2027-01-24',venue:'京都',grade:'J・GIII',status:'changed',name:'E'}
];
test('開催年を指定して2026と2027を分離',()=>{
 assert.equal(filterGradedEvents(events,{year:'2026'}).length,2);
 assert.equal(filterGradedEvents(events,{year:'2027'}).length,3);
});
test('格付けと競馬場の複合フィルタ',()=>{
 assert.deepEqual(filterGradedEvents(events,{year:'2027',grade:'GIII',venue:'中山'}).map(x=>x.name),['C']);
});
test('変更と中止を除外',()=>{
 assert.deepEqual(filterGradedEvents(events,{year:'2027',status:'active'}).map(x=>x.name),['C']);
});
test('変更・中止の状態を個別抽出',()=>{
 assert.deepEqual(filterGradedEvents(events,{status:'cancelled'}).map(x=>x.name),['D']);
 assert.deepEqual(filterGradedEvents(events,{status:'changed'}).map(x=>x.name),['E']);
});
test('期間と年フィルタを組み合わせる',()=>{
 const upcoming=periodEvents(events,'all','2026-10-29');
 assert.equal(filterGradedEvents(upcoming,{year:'2026'}).length,1);
});

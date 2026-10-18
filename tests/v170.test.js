import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyCalendar,validateCalendar,calendarRecords} from '../calendar.js';
import {planManualRace} from '../manual-race.js';
import {emptyData} from '../core.js';
const at='2026-10-18T10:30:00Z',input={date:'2028-05-17',venue:'京都',number:4,name:'ユーザー確認レース',surface:'芝',distance:'1600',sourceURL:'https://example.org/race/2028/4'};
test('v1.7 provenance and valid additive manual plan preserve original state',()=>{
 const calendar=emptyCalendar(),main=emptyData(),snapshot=JSON.stringify({calendar,main});
 const out=planManualRace(calendar,input,at);
 assert.equal(out.calendar.meetings.length,1);
 assert.equal(out.calendar.races.length,1);
 assert.equal(out.preview.createdMeeting,true);
 const race=out.calendar.races[0];
 assert.equal(race.status,'program');assert.equal(race.approval,'unknown');
 assert.equal(race.name,input.name);assert.equal(race.distance,1600);
 assert.equal(race.sourceURL,input.sourceURL);
 assert.equal(race.gradeStatus,'unknown');assert.equal(race.grade,null);
 assert.equal(race.retrievedAt,at);assert.equal(out.calendar.meetings[0].approval,'unknown');
 assert.equal(calendarRecords(out.calendar).length,1);
 assert.deepEqual(validateCalendar(JSON.parse(JSON.stringify(out.calendar))),out.calendar);
 assert.equal(JSON.stringify({calendar,main}),snapshot);
});
test('v1.7 rejects duplicates, cancelled/changed meeting, malicious sources and dates',()=>{
 const initial=planManualRace(emptyCalendar(),input,at).calendar;
 assert.throws(()=>planManualRace(initial,input,at),/登録済み/);
 const second=planManualRace(initial,{...input,number:5},at);
 assert.equal(second.calendar.meetings.length,1);assert.equal(second.calendar.races.length,2);
 assert.equal(second.preview.createdMeeting,false);
 for(const status of ['cancelled','changed']){
  const invalid=structuredClone(initial);invalid.meetings[0].status=status;
  assert.throws(()=>planManualRace(invalid,{...input,number:6},at),/中止・変更/);
 }
 const mods=[
  {date:'2028-02-30'},{number:'13'},{number:'3.5'},{venue:'門別'},
  {name:'x'.repeat(101)},{surface:'砂'},{distance:'-1'},{distance:'0'},
  {sourceURL:'http://example.org'},{sourceURL:'javascript:alert(1)'},
  {sourceURL:'https://test:pass@example.org/r'},{sourceURL:'https://example.org/#fragment'},{sourceURL:''}
 ];
 for(const mod of mods)assert.throws(()=>planManualRace(emptyCalendar(),{...input,...mod},at),JSON.stringify(mod));
});
test('v1.7 manual record optional fields do not synthesize race data or results',()=>{
 const result=planManualRace(emptyCalendar(),{...input,name:'',surface:'',distance:''},at);
 const race=result.calendar.races[0];
 assert.equal(race.name,null);assert.equal(race.surface,null);assert.equal(race.distance,null);
 assert.equal(race.grade,null);assert.equal(race.startTime,null);
 assert.equal('results' in result.calendar,false);
 assert.equal('payouts' in result.calendar,false);
});

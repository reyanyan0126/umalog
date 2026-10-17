import test from 'node:test';
import assert from 'node:assert/strict';
import {gradedEvents,periodEvents,gradeCode,selectable} from '../graded-races.js';
import {GRADED_MASTER,withMaster} from '../graded-master.js';
import {emptyCalendar,validateCalendar,calendarRecords} from '../calendar.js';
import {jstToday} from '../core.js';
const copy=()=>structuredClone(GRADED_MASTER);
test('master retains five confirmed 2026 race numbers and adds 27 unnumbered late-2026 events plus six 2027 plans',()=>{assert.equal(GRADED_MASTER.races.length,5);assert.equal(GRADED_MASTER.featuredEvents.length,33);assert.equal(gradedEvents(GRADED_MASTER).length,38);assert.ok(GRADED_MASTER.featuredEvents.filter(r=>r.date.startsWith('2027')).every(r=>r.number===undefined&&r.approval==='pending'));assert.ok(GRADED_MASTER.featuredEvents.filter(r=>r.date.startsWith('2026')).every(r=>r.number===undefined&&r.approval==='approved'));assert.equal(GRADED_MASTER.races.find(r=>r.eventId==='jra-2026-tokyo-high-jump').number,9);assert.equal(GRADED_MASTER.featuredEvents.filter(r=>r.proposedGrade==='GⅡ').length,2);assert.equal(calendarRecords(GRADED_MASTER).length,5);});
test('all six grade spellings supported; pending promotion retains current grade',()=>{for(const g of ['GⅠ','GⅡ','GⅢ','J・GⅠ','J・GⅡ','J・GⅢ'])assert.match(gradeCode(g),/^(J)?GI{1,3}$/);assert.equal(gradedEvents(GRADED_MASTER).find(r=>r.eventId==='jra-2027-negishi').grade,'GⅢ');});
test('JST day boundary and Monday week, next week, month and all include today',()=>{assert.equal(jstToday(new Date('2026-10-18T15:00:00Z')),'2026-10-19');const rows=['2026-10-12','2026-10-17','2026-10-18','2026-10-19','2026-10-25','2026-10-26','2026-11-01'].map(date=>({date}));assert.equal(periodEvents(rows,'week','2026-10-17').length,3);assert.equal(periodEvents(rows,'next','2026-10-17').length,2);assert.equal(periodEvents(rows,'month','2026-10-17').length,6);assert.equal(periodEvents(rows,'all','2026-10-17').length,6);});
test('same day time sort is deterministic, unknown time follows known',()=>{const c=copy(),r=c.races[0];c.races=[{...r,eventId:'b',name:'b',startTime:null},{...r,eventId:'a',name:'a',startTime:'15:00',number:10}];c.featuredEvents=[];assert.deepEqual(gradedEvents(c).map(r=>r.eventId),['a','b']);});
test('local ID-based date/name/venue correction replaces bundle without mutating inputs',()=>{const c=emptyCalendar(),old=GRADED_MASTER.races[0],m={...GRADED_MASTER.meetings.find(r=>r.date===old.date&&r.venue===old.venue),date:'2026-10-19',venue:'中山'};c.meetings=[m];c.featuredEvents=[{...old,...m,number:null,name:'訂正済み',status:'changed'}];const before=JSON.stringify(c),merged=withMaster(validateCalendar(c)),rows=gradedEvents(merged).filter(r=>r.eventId===old.eventId);assert.equal(rows.length,1);assert.equal(rows[0].number,null);assert.equal(rows[0].date,m.date);assert.equal(selectable(rows[0]),false);assert.equal(JSON.stringify(c),before);assert.equal(GRADED_MASTER.races[0].date,old.date);});
test('legacy race-key duplicate and meeting cancellation supersede bundled schedule',()=>{const c=emptyCalendar(),r=structuredClone(GRADED_MASTER.races[0]);delete r.eventId;c.races=[r];c.meetings=[{...GRADED_MASTER.meetings.find(m=>m.date===r.date&&m.venue===r.venue),status:'cancelled'}];const rows=gradedEvents(withMaster(c)).filter(x=>x.name===r.name);assert.equal(rows.length,1);assert.equal(rows[0].status,'cancelled');assert.ok(!selectable(rows[0]));assert.ok(!calendarRecords(withMaster(c)).some(x=>x.date===r.date&&x.venue===r.venue));});
test('Race optional eventId roundtrips and invalid IDs reject without schema bump',()=>{assert.deepEqual(validateCalendar(copy()),GRADED_MASTER);const c=copy();c.races[0].eventId='';assert.throws(()=>validateCalendar(c));});
test('empty catalog has no invented events',()=>{assert.deepEqual(gradedEvents(emptyCalendar()),[]);});
test('newer correction to earlier date wins over old local race key order',()=>{const c=emptyCalendar(),r=structuredClone(GRADED_MASTER.races[0]),m=GRADED_MASTER.meetings.find(x=>x.date===r.date&&x.venue===r.venue);c.meetings=[m,{...m,date:'2026-10-16'}];c.races=[{...r,date:'2026-10-16',retrievedAt:'2026-10-18T00:00:00Z'},r];const rows=gradedEvents(withMaster(c)).filter(x=>x.eventId===r.eventId);assert.equal(rows.length,1);assert.equal(rows[0].date,'2026-10-16');});

test('future schedule records have no invented race numbers and same-day meetings stay unique',()=>{
 const c=GRADED_MASTER;
 const e=c.featuredEvents.find(r=>r.date==='2026-12-27'&&r.name==='有馬記念');
 assert.equal(e.venue,'中山');assert.equal(e.grade,'GⅠ');assert.equal(e.number,undefined);
 const dec26=c.featuredEvents.filter(r=>r.date==='2026-12-26'&&r.venue==='中山');
 assert.equal(dec26.length,2);
 assert.equal(c.meetings.filter(r=>r.date==='2026-12-26'&&r.venue==='中山').length,1);
 assert.equal(calendarRecords(c).length,5);
});

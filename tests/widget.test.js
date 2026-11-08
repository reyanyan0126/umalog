import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {GRADED_MASTER} from '../graded-master.js';
import {gradedEvents,gradeCode} from '../graded-races.js';
const read = path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const feed = JSON.parse(read('widget/graded-races.json'));
const master = gradedEvents(GRADED_MASTER);
const code = read('widget/Umalog.js');
const names = [];
class Stack {
  addText(s){names.push(s);return {};}
  addStack(){return new Stack();}
  addImage(){return {};}
  setPadding(){} addSpacer(){} layoutVertically(){}
}
class Draw {
  setTextAlignedLeft(){} setTextAlignedCenter(){} setTextColor(){} setFont(){} drawTextInRect(s){names.push(s);}
  setFillColor(){} fillEllipse(){} fillRect(){} getImage(){return {};}
}
const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;
const api = await new AsyncFunction('ListWidget','DrawContext','Rect','Size','Color','Font','Request',
  code+'\nreturn {valid,monthGrid,jst,agenda,monthCells,nameLines,render,acquire,download,meta};')(
  Stack,Draw,class {},class {},class {},{systemFont(){},boldSystemFont(){}},
  class {async loadString(){this.response={statusCode:reply.status};if(reply.error) throw Error();return reply.body;}}
);
let reply;
const today='2026-11-08', now=Date.parse(today+'T12:00:00Z');
const sample = {...feed.races[0],date:today,status:'planned',name:'長い正式レース名'.repeat(5)};
test('public-only projection matches every master event',()=>{
 assert.ok(api.valid(feed));
 assert.equal(feed.races.length,master.length);
 feed.races.forEach((r,i)=>{
  const m=master[i];
  assert.deepEqual(r,{id:m.key,date:m.date,name:m.name,grade:gradeCode(m.grade),venue:m.venue,
   status:m.status,approval:m.approval,gradeStatus:m.gradeStatus,proposedGrade:m.proposedGrade?gradeCode(m.proposedGrade):null,updatedAt:m.retrievedAt});
 });
 for(const g of ['GI','GII','GIII','JGI','JGII','JGIII'])assert.ok(feed.races.some(r=>r.grade===g));
});
test('Sunday-first grid and Tokyo midnight over New Year',()=>{
 for(const [date,offset,days] of [['2026-02-01',0,28],['2024-02-01',4,29],['2026-11-01',0,30],['2026-08-01',6,31]]){
  const grid=api.monthGrid(date);
  assert.equal(grid.indexOf(1),offset);assert.equal(grid.filter(Boolean).length,days);assert.equal(grid.length,42);
 }
 assert.equal(api.jst(Date.parse('2026-12-31T14:59:59Z')),'2026-12-31');
 assert.equal(api.jst(Date.parse('2026-12-31T15:00:00Z')),'2027-01-01');
});
test('small picks next active race; medium crosses years',()=>{
 const rows=['cancelled','changed','planned','entries','program','result'].map((status,i)=>({...sample,id:String(i),status}));
 assert.deepEqual(api.agenda(rows,today,'small'),{rows:[rows[2]],more:2});
 assert.deepEqual(api.agenda([{...sample,date:'2027-01-04'}],'2026-12-31','medium').rows.map(r=>r.date),['2027-01-04']);
 assert.ok(api.meta({...sample,approval:'pending',gradeStatus:'pending'}).includes('認可前'));
 const updated={...sample,date:'2026-11-10'};
 assert.deepEqual(api.agenda([updated],today,'small').rows,[updated]);
});
test('invalid feed rejects duplicates, unknown schema, invalid dates, grades and states',()=>{
 for(const f of [{...feed,schemaVersion:2},{...feed,races:[sample,sample]},...[
  {date:'2026-02-30'},{name:' '},{grade:'X'},{status:'delay'},{updatedAt:null}
 ].map(over=>({...feed,races:[{...sample,...over}]}))])assert.equal(api.valid(f),false);
 assert.ok(api.valid({...feed,races:[]}));
});
test('fetch, cache lifetime, bad HTTP/JSON/schema, timeout and first-run offline',async()=>{
 const cache={save(e){this.latest=e;}};
 reply={status:200,body:JSON.stringify(feed)};
 assert.equal((await api.acquire(now,cache,api.download,false)).mode,'online');
 assert.equal((await api.acquire(now+100,cache,api.download,false)).mode,'cache');
 for(reply of [{status:500,body:'{}'},{status:200,body:'oops'},{status:200,body:'{}'},{error:true}]){
  const offline=await api.acquire(now+2*86400000,cache,api.download,false);
  assert.equal(offline.mode,'offline');assert.deepEqual(offline.feed,feed);assert.equal(cache.latest.time,now);
  assert.equal((await api.acquire(now,{},api.download,true)).mode,'empty');
 }
});
test('Scriptable drawing calls for three sizes, long names, overflow, stale and no data',()=>{
 for(const size of ['small','medium','large']){
  names.length=0;
  const races=Array.from({length:8},(_,i)=>({...sample,id:String(i)}));
  const w=api.render(size,{feed:{...feed,races},mode:'offline',time:now-2*86400000},now);
  if(size==='large'){assert.ok(w.backgroundImage);assert.ok(names.some(t=>t.startsWith('長い')));assert.ok(names.some(t=>/\+\d+$/.test(t)));}
  else {assert.ok(names.includes(sample.name));assert.ok(names.some(t=>t.includes('ほか')));}
  assert.ok(names.some(t=>t.includes('古い保存版')));assert.match(w.url,/#calendar$/);
  for(const f of [null,{...feed,races:[]}]){
   names.length=0;api.render(size,{feed:f,time:now},now);assert.ok(names.some(t=>/未登録|登録なし|取得できません/.test(t)));
  }
 }
});

test('full month places graded names inside the correct shared date and uses the full grid',()=>{
 const cells=api.monthCells(today,feed.races);
 assert.equal(cells.length,35);
 for(const [day,expected] of [[8,['みやこステークス','アルゼンチン共和国杯']],[14,['武蔵野ステークス','デイリー杯2歳ステークス']],[15,['エリザベス女王杯']]]){
  const cell=cells.find(c=>c.day===day);
  assert.deepEqual(cell.events.map(r=>r.name).sort(),expected.sort());
  assert.ok(Math.floor((cell.h-18)/22)>=cell.events.length);
 }
 assert.ok(cells.find(c=>c.day===8).w>cells.find(c=>c.day===10).w);
 assert.equal(cells[0].x,9);assert.ok(Math.abs(cells.at(-1).y+cells.at(-1).h-333)<0.01);
 for(const [date,weeks] of [['2026-02-01',4],['2026-08-01',6]])assert.equal(api.monthCells(date,[]).length,7*weeks);
 names.length=0;
 api.render('large',{feed,mode:'online',time:now},now);
 for(const grade of ['G1','G2','G3'])assert.ok(names.some(t=>t.startsWith(grade+' ')));
 for(const prefix of ['みやこ','アルゼン','武蔵野','デイリー','エリザベス'])assert.ok(names.some(t=>t.startsWith(prefix)));
});

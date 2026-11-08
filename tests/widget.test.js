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
const drawn = [];
const fills = [];
const texts = [];
class Ink {constructor(value){this.value=value;}}
class Box {constructor(x,y,w,h){Object.assign(this,{x,y,w,h});}}
class Stack {
  addText(s){names.push(s);const item={s,parent:this};texts.push(item);return item;}
  addStack(){return new Stack();}
  addImage(){return {};}
  setPadding(){} addSpacer(){} layoutVertically(){}
}
class Draw {
  setTextAlignedLeft(){} setTextAlignedCenter(){} setTextColor(c){this.color=c.value;} setFont(font){this.font=font;} drawTextInRect(s,rect){names.push(s);drawn.push({s,rect,color:this.color,font:this.font});}
  setFillColor(c){this.fill=c.value;} fillRect(rect){fills.push({color:this.fill,rect});} getImage(){return {};}
}
const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;
const api = await new AsyncFunction('ListWidget','DrawContext','Rect','Size','Color','Font','Request',
  code+'\nreturn {valid,monthGrid,jst,agenda,monthCells,raceTitle,romanGrade,render,acquire,download,gradeInk,displayName};')(
  Stack,Draw,Box,class {},Ink,{systemFont(){return "regular";},boldSystemFont(){return "bold";}},
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
 assert.ok(api.displayName({...sample,approval:'pending',gradeStatus:'pending'},100,8).startsWith('仮申'));
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
  else {assert.ok(names.some(t=>t.startsWith('長い') && t.endsWith('…')));assert.ok(names.some(t=>t.includes('ほか')));}
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
  assert.ok(Math.floor((cell.h-3)/22)>=cell.events.length);
 }
 assert.ok(cells.every(c=>c.w===342/7 && c.h===284/5));
 assert.deepEqual(cells.filter(c=>c.day).map(c=>c.day),Array.from({length:30},(_,i)=>i+1));
 assert.equal(cells[0].x,9);assert.ok(Math.abs(cells.at(-1).y+cells.at(-1).h-333)<0.01);
 for(const [date,weeks] of [['2026-02-01',4],['2026-08-01',6]])assert.equal(api.monthCells(date,[]).length,7*weeks);
 names.length=0;
 api.render('large',{feed,mode:'online',time:now},now);
 for(const grade of ['GⅠ','GⅡ','GⅢ'])assert.ok(names.some(t=>t===grade));
 assert.ok(names.some(t=>t.startsWith('アル')&&t.endsWith('…')));
 assert.ok(names.includes('月間 1.4'));
 for(const day of ['20','24','25','26']) assert.ok(names.includes(day));
 for(const prefix of ['みやこ','アル','武蔵野','デイ','エリ'])assert.ok(names.some(t=>t.startsWith(prefix)));
});

test('large widget reserves two-digit date width for every weekday and month length',()=>{
 for(const date of ['2026-02-08','2026-08-08','2026-11-08']){
  drawn.length=0;
  const cells=api.monthCells(date,feed.races);
  api.render('large',{feed,mode:'online',time:now},Date.parse(date));
  for(const {day,x,y,w,h} of cells.filter(c=>c.day)){
   const dateText=drawn.find(t=>t.s===String(day)&&t.rect.x>=x&&t.rect.x<x+w&&t.rect.y>=y&&t.rect.y<y+h);
   assert.ok(dateText && dateText.rect.w>=18,'date must fit '+date+' day '+day);
  }
 }
});

test('grade labels and single-line race titles in compact cells',()=>{
 assert.deepEqual(['GI','GII','GIII','JGI','JGII','JGIII'].map(api.romanGrade),['GⅠ','GⅡ','GⅢ','J・GⅠ','J・GⅡ','J・GⅢ']);
 assert.equal(api.raceTitle('京阪杯',44,7.6),'京阪杯');
 assert.equal(api.raceTitle('武蔵野ステークス',44,7.6),'武蔵野S');
 const race={...sample,name:'エリザベス女王杯',grade:'JGIII'};
 names.length=0;
 api.render('large',{feed:{...feed,races:[race]},mode:'online',time:now},now);
 const title=api.raceTitle(race.name,342/7-21-4,7.2);
 assert.ok(title.endsWith('…'));
 assert.equal(names.filter(s=>s===title).length,1);
 assert.ok(names.some(s=>s.startsWith('J・GⅢ')));
});

test('today uses same cell boundaries and every grade and name shares a single row',()=>{
 const palette={GI:'#E6B84A',GII:'#AFC9E3',GIII:'#DDA477'};
 for(const size of ['small','medium','large']){
  for(const code of ['GI','GII','GIII','JGI','JGII','JGIII']){
   drawn.length=fills.length=texts.length=names.length=0;
   const race={...sample,name:'菊花賞',grade:code};
   api.render(size,{feed:{...feed,races:[race]},mode:'online',time:now},now);
   const label=api.romanGrade(code), flat=code.replace(/^J/,'');
   assert.ok(names.every(s=>!s.includes(race.venue)));
   if(size==='large'){
    const grade=drawn.find(t=>t.s===label),name=drawn.find(t=>t.s.startsWith('菊'));
    assert.equal(grade.rect.y,name.rect.y);assert.ok(grade.rect.x+grade.rect.w<=name.rect.x+0.01);
    assert.equal(grade.color,palette[flat]);assert.equal(name.color,'#E8EBE2');
    assert.equal(grade.font,flat==='GI'?'bold':'regular');
   }else{
    const grade=texts.find(t=>t.s===label),name=texts.find(t=>t.s==='菊花賞');
    assert.equal(grade.parent,name.parent);assert.equal(grade.textColor.value,palette[flat]);
    assert.equal(grade.font,flat==='GI'?'bold':'regular');assert.equal(name.lineLimit,1);
   }
   if(size!=='small'){
    const border=fills.filter(t=>t.color==='#C5A051');assert.equal(border.length,1);
    const rect=border[0].rect, day=drawn.find(t=>t.s==='8');
    assert.equal(day.color,'#FFFFFF');assert.equal(day.font,'bold');
    if(size==='large'){
     const c=api.monthCells(today,[race]).find(c=>c.date===today);
     assert.deepEqual(rect,new Box(c.x,c.y,c.w-0.65,c.h-0.65));
    }else assert.deepEqual(rect,new Box(0,30,18,15));
   }
  }
 }
});

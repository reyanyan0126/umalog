import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {execFileSync} from 'node:child_process'
import {shift,weeks,selectMonth,monthKey,loadSchedule,validFeed,sixHours} from '../widget/scripting/calendar.js'
const feed=JSON.parse(readFileSync(new URL('../widget/graded-races.json',import.meta.url)))
const now=Date.parse('2026-11-08T12:00:00Z')
function memory(){const m=new Map();return {set:(k,v)=>m.set(k,v),get:k=>m.get(k),remove:k=>m.delete(k)}}
test('interactive month navigation, repeat press, JST midnight and reset',()=>{
 const store=memory()
 selectMonth(shift('2026-12',1),now,store);assert.equal(store.get(monthKey),'2027-01')
 selectMonth('2027-01',now,store);assert.equal(store.get(monthKey),'2027-01')
 selectMonth('2027-13',now,store);assert.equal(store.get(monthKey),'2027-01')
 selectMonth(shift('2027-01',-1),now,store);assert.equal(store.get(monthKey),'2026-12')
 selectMonth('2027-01',Date.parse('2026-12-31T15:00:00Z'),store);assert.equal(store.get(monthKey),undefined)
 selectMonth('2028-02',now,store);selectMonth('today',now,store);assert.equal(store.get(monthKey),undefined)
 for(const [m,h,n] of [['2026-02',4,28],['2024-02',5,29],['2026-11',5,30],['2026-08',6,31]]){
  const grid=weeks(m);assert.equal(grid.length,h);assert.ok(grid.every(w=>w.length===7));assert.equal(grid.flat().filter(Boolean).length,n)
 }
})
test('public schedule, cached navigation, invalid data and initial offline',async()=>{
 const store=memory();assert.ok(validFeed(feed))
 const first=await loadSchedule(now,store,async()=>feed);assert.deepEqual(first.rows,feed.races)
 assert.ok(first.rows.filter(r=>r.date==='2026-11-08').length>=2)
 let called=0;await loadSchedule(now+1000,store,async()=>{called++;return {}});assert.equal(called,0)
 const offline=await loadSchedule(now+sixHours,store,async()=>({}));assert.match(offline.note,/保存版/);assert.equal(offline.rows.length,feed.races.length)
 assert.deepEqual((await loadSchedule(now,memory(),async()=>{throw Error()})).rows,[])
})
test('iPhone import archive includes all entry points and the exact shared feed',()=>{
 execFileSync('python3',['-c',`
import sys, io, zipfile, json
from pathlib import Path
sys.path.insert(0,'tools')
from build_scripting_widget import build
buf=io.BytesIO();build(buf)
with zipfile.ZipFile(buf) as z:
 assert set(z.namelist())=={'script.json','index.tsx','widget.tsx','app_intents.tsx','calendar.js','graded-races.json'}
 assert json.loads(z.read('script.json'))['name']=='うまログ月送り'
 assert z.read('graded-races.json')==Path('widget/graded-races.json').read_bytes()
`])
})
test('equal columns and week rows fill the grid with symmetric margins',async()=>{
 const {monthLayout}=await import('../widget/scripting/calendar.js')
 for(const width of [292,329,364])for(const height of [311,345,382])for(const n of [4,5,6])for(const footer of [false,true]){
  const v=monthLayout(width,height,n,footer)
  assert.ok(Math.abs(7*v.cellWidth+6*v.gap+20-width)<0.001)
  const used=v.header+v.sectionGap+v.weekdays+n*(v.gap+v.cellHeight)+(footer?14:0)
  assert.ok(Math.abs(used-v.contentHeight)<0.001)
  assert.ok(v.cellHeight>=30 && v.contentWidth>=102+60+62+12)
 }
})

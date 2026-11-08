// Variables used by Scriptable.
// icon-color: teal; icon-glyph: calendar-alt;
const BASE = 'https://reyanyan0126.github.io/umalog/';
const HOUR = 3600000;
const DAY = 24 * HOUR;
const labels = {planned:'予定', program:'番組', entries:'出馬表', result:'結果', changed:'変更確認', cancelled:'中止'};
const paper = '#E8EBE2', muted = '#B1BDB2', accent = '#A9C6AC';
const jst = time => new Date(Number(time) + 9 * HOUR).toISOString().slice(0,10);
const short = date => date.slice(5).replace('-', '/');
const gradeOK = value => /^(J)?G(I|II|III)$/.test(value);
const stamp = value => typeof value === 'string' && /^\d{4}-\d\d-\d\dT.*(?:Z|[+-]\d\d:\d\d)$/.test(value) && Number.isFinite(Date.parse(value));
function valid(feed) {
  if (!feed || feed.schemaVersion !== 1 || feed.timezone !== 'Asia/Tokyo' ||
      !stamp(feed.generatedAt) || !Array.isArray(feed.races)) return false;
  const ids = new Set();
  return feed.races.every(r => {
    if (!r || ![r.id,r.name,r.venue].every(s => typeof s === 'string' && s.trim()) ||
        ids.has(r.id) || !/^\d{4}-\d\d-\d\d$/.test(r.date) ||
        !Number.isFinite(Date.parse(r.date)) || new Date(r.date).toISOString().slice(0,10) !== r.date ||
        !gradeOK(r.grade) || !Object.prototype.hasOwnProperty.call(labels,r.status) ||
        !['approved','pending','unknown'].includes(r.approval) ||
        !['confirmed','pending','unknown'].includes(r.gradeStatus) ||
        !(r.proposedGrade === null || gradeOK(r.proposedGrade)) || !stamp(r.updatedAt)) return false;
    ids.add(r.id);
    return true;
  });
}
function monthGrid(today) {
  const [year,month] = today.split('-').map(Number);
  const offset = new Date(Date.UTC(year,month-1,1)).getUTCDay();
  const days = new Date(Date.UTC(year,month,0)).getUTCDate();
  return Array.from({length:42}, (_,i) => i >= offset && i < offset+days ? i-offset+1 : null);
}
function agenda(races,today,size) {
  const active = r => !['changed','cancelled','result'].includes(r.status);
  const future = races.filter(r => r.date >= today).sort((a,b)=>a.date.localeCompare(b.date));
  let list;
  if (size === 'small') {
    const next = future.find(active);
    list = future.filter(r => next && r.date === next.date && active(r));
  } else {
    list = future.filter(r=>r.status !== 'result');
    // The next populated month is included when the current month has no remaining races.
    if (list.length) list = list.filter(r => r.date.slice(0,7) === list[0].date.slice(0,7));
  }
  const limit = {small:1,medium:3}[size];
  return {rows:list.slice(0,limit), more:Math.max(0,list.length-limit)};
}
function cacheFiles() {
  const fm = FileManager.local();
  const paths = [0,1].map(i=>fm.joinPath(fm.libraryDirectory(),'umalog-graded-v1-'+i+'.json'));
  function read(path) {
    try {
      const entry = JSON.parse(fm.readString(path));
      if (Number.isFinite(entry.time) && valid(entry.feed)) return {...entry,path};
    } catch (_) {}
    return null;
  }
  const latest = paths.map(read).filter(Boolean).sort((a,b)=>b.time-a.time)[0];
  return {latest, save: entry => fm.writeString(paths.find(p=>p!==latest?.path),JSON.stringify(entry))};
}
async function acquire(now,cache,download,force) {
  const old = cache.latest;
  if (!force && old && now >= old.time && now-old.time < 6*HOUR) return {...old,mode:'cache'};
  try {
    const feed = await download();
    if (!valid(feed)) throw Error('invalid schedule');
    const entry = {feed,time:now};
    try { cache.save(entry); } catch (_) {}
    return {...entry,mode:'online'};
  } catch (_) {
    return old ? {...old,mode:'offline'} : {feed:null,mode:'empty'};
  }
}
async function download() {
  const req = new Request(BASE+'widget/graded-races.json');
  req.timeoutInterval = 8;
  const raw = await req.loadString();
  if (req.response.statusCode !== 200) throw Error('HTTP '+req.response.statusCode);
  return JSON.parse(raw);
}
function text(parent,value,size,color=paper,bold=false,lines=1) {
  const t = parent.addText(value);
  t.font = bold ? Font.boldSystemFont(size) : Font.systemFont(size);
  t.textColor = new Color(color);
  t.lineLimit = lines;
  t.minimumScaleFactor = 0.82;
  return t;
}
const gradeColors={GI:'#E6B84A',GII:'#AFC9E3',GIII:'#DDA477'};
const gradeInk=code=>gradeColors[code.replace(/^J/,'')];
const isGradeOne=code=>code.replace(/^J/,'')==='GI';
function highlightToday(d,x,y,w,h) {
  const edge=0.8;
  d.setFillColor(new Color('#C5A051'));
  d.fillRect(new Rect(x,y,w,h));
  d.setFillColor(new Color('#304336'));
  d.fillRect(new Rect(x+edge,y+edge,w-2*edge,h-2*edge));
}
function calendar(parent,today,races) {
  const days = new Set(races.filter(r=>!['cancelled','changed'].includes(r.status)).map(r=>r.date));
  const d = new DrawContext();
  d.size = new Size(126,105);
  d.respectScreenScale = true;
  d.opaque = false;
  d.setTextAlignedCenter();
  function cell(label,x,y,color,bold) {
    d.setTextColor(new Color(color));
    d.setFont(bold ? Font.boldSystemFont(10) : Font.systemFont(10));
    d.drawTextInRect(label,new Rect(x,y,18,14));
  }
  [...'日月火水木金土'].forEach((s,i)=>cell(s,i*18,0,muted,false));
  monthGrid(today).forEach((day,i)=>{
    if (!day) return;
    const key = today.slice(0,8)+String(day).padStart(2,'0');
    const x = i%7*18, y = 15+Math.floor(i/7)*15;
    if (key===today) highlightToday(d,x,y,18,15);
    cell(String(day),x,y,key===today?'#FFFFFF':days.has(key)?accent:paper,key===today||days.has(key));
    if (days.has(key)) {
      d.setFillColor(new Color(accent));
      d.fillRect(new Rect(x+6,y+12,6,1));
    }
  });
  parent.addImage(d.getImage()).imageSize = new Size(126,105);
}
// Keep the grid independent of the schedule, including on multi-race weekends.
function monthCells(today, races) {
  const prefix = today.slice(0,8);
  const byDate = new Map();
  for (const race of races.filter(r=>r.date.startsWith(prefix))) {
    if (!byDate.has(race.date)) byDate.set(race.date,[]);
    byDate.get(race.date).push(race);
  }
  const grid = monthGrid(today);
  const weeks = Math.ceil((grid.findIndex(Boolean) + grid.filter(Boolean).length)/7);
  const w=342/7, h=284/weeks;
  return grid.slice(0,weeks*7).map((day,i)=>{
    const date=day ? prefix+String(day).padStart(2,'0') : null;
    const col=i%7, week=Math.floor(i/7);
    return {date,day,events:byDate.get(date)||[],col,week,x:9+col*w,y:49+week*h,w,h};
  });
}
const romanGrade = code => code.replace(/^J/,'J・').replace(/I+$/,n=>['','Ⅰ','Ⅱ','Ⅲ'][n.length]);
function raceTitle(name,width,size) {
  // Reserve the width of the ellipsis before adding the final glyph.
  const clean=name.replace(/\s+/g,' ').trim();
  const advance=c=>c==='.'?0.35:/[ -~]/.test(c)?0.85:1.04;
  const length=s=>Array.from(s).reduce((n,c)=>n+advance(c)*size,0);
  if(length(clean)<=width) return clean;
  const short=clean.replace(/（/g,'(').replace(/）/g,')').replace(/ステークス/g,'S').replace(/カップ/g,'C');
  if(length(short)<=width) return short;
  let result='',used=length('…');
  for(const c of short){
    used+=advance(c)*size;
    if(used>width) break;
    result+=c;
  }
  return result+'…';
}
function largeCalendar(today,state,now) {
  const cells=monthCells(today,state.feed?.races || []);
  const d=new DrawContext();
  d.size=new Size(360,360); d.opaque=true; d.respectScreenScale=true;
  const fill=(x,y,w,h,color)=>{
    d.setFillColor(new Color(color));d.fillRect(new Rect(x,y,w,h));
  };
  const label=(s,x,y,w,size,color,bold=false)=>{
    d.setTextColor(new Color(color));d.setFont(bold?Font.boldSystemFont(size):Font.systemFont(size));
    d.drawTextInRect(s,new Rect(x,y,w,size+3));
  };
  fill(0,0,360,360,'#19271F');
  label(Number(today.slice(5,7))+'月',14,9,46,17,paper,true);
  label(today.slice(0,4)+'年',60,14,62,11,muted);
  label('うまログ(仮)',279,14,72,10,accent,false);
  for (const cell of cells) {
    const {x,y,w,h,events,day,date,col,week}=cell;
    if (!week) {
      d.setTextAlignedCenter();
      label('日月火水木金土'[col],x,33,w,10,col===0?'#CFAB9F':col===6?'#B2C2CB':muted,true);
      d.setTextAlignedLeft();
    }
    fill(x,y,w-0.65,h-0.65,events.length?'#28392E':'#223128');
    if (!day) continue;
    if(date===today) highlightToday(d,x,y,w-0.65,h-0.65);
    label(String(day),x+3,y+1,19,10.5,date===today?'#FFFFFF':paper,true);
    if (!events.length) continue;
    const firstRow=15, rowHeight=10.5;
    const capacity=Math.floor((h-firstRow-1)/rowHeight);
    if(events.length>capacity) label('+'+(events.length-capacity),x+22,y+1,w-24,8,muted);
    events.slice(0,capacity).forEach((race,i)=>{
      const top=y+firstRow+i*rowHeight;
      const gradeWidth=race.grade.startsWith('J')?21:13;
      const nameWidth=w-gradeWidth-4;
      label(romanGrade(race.grade),x+2,top,gradeWidth,race.grade.startsWith('J')?6.3:7,gradeInk(race.grade),isGradeOne(race.grade));
      label(displayName(race,nameWidth,7.2),x+2+gradeWidth,top,nameWidth,7.2,paper);
    });
  }
  const rows=cells.flatMap(c=>c.events);
  let footer=state.feed?(rows.length?'':'今月の重賞登録なし'):'予定を取得できません。通信後に再実行';
  if(state.feed){
    const stamp=rows.length?Math.min(...rows.map(r=>Date.parse(r.updatedAt))):Date.parse(state.feed.generatedAt);
    footer=[footer,state.mode==='offline'?(now-state.time>DAY?'古い保存版':'保存版'):'',
      (rows.length?'資料 ':'配信 ')+short(jst(stamp))+(now-stamp>=30*DAY?'・要確認':'')].filter(Boolean).join('  ');
  }
  label(footer,14,337,250,9,muted);
  label('月間 1.4',301,337,48,9,muted,true);
  return d.getImage();
}
function displayName(race,width,size) {
  const state={cancelled:'中止',changed:'変更',result:'済'}[race.status]||'';
  const note=state||(race.approval==='pending'?'仮':'');
  const mark=note+(race.gradeStatus==='pending'?'申':'');
  return raceTitle((mark?mark+' ':'')+race.name,width,size);
}
function render(size,state,now) {
  const today = jst(now), races = state.feed?.races || [];
  const w = new ListWidget();
  w.setPadding(10,12,10,12);
  w.backgroundColor = new Color('#19271F');
  w.url = BASE+'#calendar';
  const midnight = Date.parse(today+'T00:00:00+09:00')+DAY;
  w.refreshAfterDate = new Date(Math.min(midnight,state.mode==='offline'||!state.feed ? now+HOUR : state.time+6*HOUR));
  if(size==='large') {
    w.backgroundImage=largeCalendar(today,state,now);
    return w;
  }
  text(w,'うまログ   '+Number(today.slice(0,4))+'年'+Number(today.slice(5,7))+'月',size==='small'?11:13,accent,true);
  w.addSpacer(4);
  const body = w.addStack();
  if (size!=='small') { calendar(body,today,races); body.addSpacer(9); }
  const list = body.addStack();
  list.layoutVertically();
  const {rows,more} = agenda(races,today,size);
  if (!rows.length) text(list,state.feed?'次の重賞は未登録':'予定を取得できません。通信後に再実行',13,paper,true,3);
  rows.forEach((r,i)=>{
    if(i) list.addSpacer(2);
    const row=list.addStack();
    text(row,short(r.date),9,muted);
    row.addSpacer(3);
    text(row,romanGrade(r.grade),10,gradeInk(r.grade),isGradeOne(r.grade));
    row.addSpacer(3);
    const fontSize=size==='small'?11:10;
    text(row,displayName(r,size==='small'?76:100,fontSize),fontSize,paper);

  });
  if(more) text(list,(size==='small'?'同日 ':'')+'ほか'+more+'件',10,muted);
  w.addSpacer();
  if (state.feed) {
    const old = now-state.time>DAY;
    const sync = state.mode==='offline' ? (old?'古い保存版':'保存版')+' '+short(jst(state.time)) : '';
    const source = rows.length ? rows.reduce((a,r)=>Math.min(a,Date.parse(r.updatedAt)),Infinity) : Date.parse(state.feed.generatedAt);
    const age = Math.floor((now-source)/DAY);
    text(w,[sync,(rows.length?'資料 ':'配信 ')+jst(source).slice(2).replace(/-/g,'/')+(age>=30?'・要確認':'')].filter(Boolean).join('  '),9,muted);
  }
  return w;
}
if (typeof Script !== 'undefined') {
  const now = Date.now();
  const state = await acquire(now,cacheFiles(),download,!config.runsInWidget);
  const family = config.runsInWidget && ['small','medium','large'].includes(config.widgetFamily) ? config.widgetFamily : 'large';
  const widget = render(family,state,now);
  Script.setWidget(widget);
  if (!config.runsInWidget) await widget.presentLarge();
  Script.complete();
}

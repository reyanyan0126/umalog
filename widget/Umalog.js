// Variables used by Scriptable.
// icon-color: teal; icon-glyph: calendar-alt;
const BASE = 'https://reyanyan0126.github.io/umalog/';
const HOUR = 3600000;
const DAY = 24 * HOUR;
const labels = {planned:'予定', program:'番組', entries:'出馬表', result:'結果', changed:'変更確認', cancelled:'中止'};
const paper = '#F2F6F5', muted = '#B0C1C3', accent = '#76E3C0';
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
    if (key===today) {
      d.setFillColor(new Color(accent));
      d.fillEllipse(new Rect(x+2,y-1,14,14));
    }
    cell(String(day),x,y,key===today?'#101C20':days.has(key)?accent:paper,days.has(key));
    if (days.has(key)) {
      d.setFillColor(new Color(accent));
      d.fillRect(new Rect(x+6,y+12,6,1));
    }
  });
  parent.addImage(d.getImage()).imageSize = new Size(126,105);
}
// A single canvas fills the large family. Column widths follow the days on
// which races actually occur; week heights follow the busiest date in each row.
function monthCells(today, races) {
  const prefix = today.slice(0,8);
  const byDate = new Map();
  for (const race of races.filter(r=>r.date.startsWith(prefix))) {
    if (!byDate.has(race.date)) byDate.set(race.date,[]);
    byDate.get(race.date).push(race);
  }
  const grid = monthGrid(today);
  const weeks = Math.ceil((grid.findIndex(Boolean) + grid.filter(Boolean).length)/7);
  const columns = Array(7).fill(0), weights = Array(weeks).fill(1);
  const cells = grid.slice(0,weeks*7).map((day,i)=>{
    const date = day ? prefix+String(day).padStart(2,'0') : null;
    const events = byDate.get(date) || [], col=i%7, week=Math.floor(i/7);
    if (events.length) columns[col]=1;
    weights[week]=Math.max(weights[week],1+Math.min(3,events.length)*0.85);
    return {date,day,events,col,week};
  });
  function edges(weights,start,span,min=0) {
    const sum=weights.reduce((a,b)=>a+b,0), points=[start];
    for (const weight of weights) points.push(points[points.length-1]+min+weight/sum*(span-min*weights.length));
    return points;
  }
  const xs=edges(columns.some(Boolean)?columns:Array(7).fill(1),9,342,16), ys=edges(weights,49,284);
  return cells.map(c=>({...c,x:xs[c.col],y:ys[c.week],w:xs[c.col+1]-xs[c.col],h:ys[c.week+1]-ys[c.week]}));
}
function nameLines(name,width,lines,size=10) {
  // Treat Japanese glyphs as full-width; leave a small margin for native fonts.
  const units = s=>Array.from(s).reduce((n,c)=>n+(/[ -~]/.test(c)?0.65:1),0);
  const limit=width/(size+0.4);
  let value=name;
  if(units(value)>limit*lines) value=value.replace(/ステークス/g,'S').replace(/カップ/g,'C');
  const output=[''];
  for(const c of value) {
    if(units(output[output.length-1]+c)>limit) {
      if(output.length===lines) {
        let end=output.pop();
        while(end && units(end+'…')>limit) end=end.slice(0,-1);
        output.push(end+'…');break;
      }
      output.push('');
    }
    output[output.length-1]+=c;
  }
  return output;
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
  fill(0,0,360,360,'#142227');
  label(Number(today.slice(5,7))+'月',13,7,46,20,paper,true);
  label(today.slice(0,4)+'年',60,14,62,11,muted);
  label('うまログ  /  重賞',248,13,100,12,accent,true);
  for (const cell of cells) {
    const {x,y,w,h,events,day,date,col,week}=cell;
    if (!week) {
      d.setTextAlignedCenter();
      label('日月火水木金土'[col],x,33,w,10,col===0?'#F4AA9B':col===6?'#A8C8EE':muted,true);
      d.setTextAlignedLeft();
    }
    fill(x,y,w-0.8,h-0.8,events.length?'#223638':'#1A2A2E');
    if (!day) continue;
    if(date===today){
      d.setFillColor(new Color(accent));d.fillEllipse(new Rect(x+2,y+1,17,16));
    }
    label(String(day),x+4,y+1,w-3,w<20?10:12,date===today?'#102421':paper,true);
    if (!events.length) continue;
    const capacity=Math.max(1,Math.floor((h-6)/23));
    const visible=events.slice(0,capacity);
    const extra=events.length-visible.length;
    const width=w-5;
    const lines=visible.map(()=>1);
    let spare=Math.floor((h-17-(visible.length-1)*11-1)/12)-visible.length;
    // Give spare lines to titles which would otherwise be shortened.
    for(let i=0;i<visible.length && spare>0;i++){
      const wanted=nameLines(visible[i].name,width,1)[0].endsWith('…')
        ? nameLines(visible[i].name,width,3).length-1 : 0;
      const added=Math.min(wanted,spare);
      lines[i]+=added;spare-=added;
    }
    let cursor=y+17;
    visible.forEach((r,i)=>{
      const grade=r.grade.replace('J','J·').replace('III','3').replace('II','2').replace('I','1');
      const flag=({cancelled:'中止',changed:'変更',planned:r.approval==='pending'?'仮':''})[r.status]||'';
      const status=flag+(r.gradeStatus==='pending'?'申':'');
      const ink=grade.endsWith('1')?'#F1CF86':grade.endsWith('2')?accent:'#B9CCDC';
      const left=i===0?21:3;
      const badge=grade+' '+status+(status?' ':'')+r.venue+(i===0&&extra?' +'+extra:'');
      label(badge,x+left,i===0?y+3:cursor,w-left-1,8,ink,true);
      if(i) cursor+=11;
      let fontSize=10, parts=nameLines(r.name,width,lines[i]);
      // Keep a recognizable whole title when a slightly smaller face fits.
      if(parts[parts.length-1].endsWith('…')){
        const smaller=nameLines(r.name,width,lines[i],8.2);
        if(!smaller[smaller.length-1].endsWith('…')){fontSize=8.2;parts=smaller;}
      }
      for(const part of parts){label(part,x+3,cursor,width,fontSize,paper,true);cursor+=12;}
    });
  }
  const rows=cells.flatMap(c=>c.events);
  let footer=state.feed?(rows.length?'':'今月の重賞登録なし'):'予定を取得できません。通信後に再実行';
  if(state.feed){
    const stamp=rows.length?Math.min(...rows.map(r=>Date.parse(r.updatedAt))):Date.parse(state.feed.generatedAt);
    footer=[footer,state.mode==='offline'?(now-state.time>DAY?'古い保存版':'保存版'):'',
      (rows.length?'資料 ':'配信 ')+short(jst(stamp))+(now-stamp>=30*DAY?'・要確認':'')].filter(Boolean).join('  ');
  }
  label(footer,14,337,330,9,muted);
  return d.getImage();
}
function meta(r) {
  const status = r.approval==='pending' && r.status==='planned' ? '認可前' : labels[r.status];
  const grade = r.grade.replace(/^J/,'J・');
  const pending = r.gradeStatus==='pending'?'申請中':r.gradeStatus==='unknown'?'未確認':'';
  return short(r.date)+' '+grade+' '+r.venue+' '+status+(pending?'／格付'+pending:'');
}
function render(size,state,now) {
  const today = jst(now), races = state.feed?.races || [];
  const w = new ListWidget();
  w.setPadding(10,12,10,12);
  w.backgroundColor = new Color('#142227');
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
    const ink = r.grade.endsWith('GIII')?muted:r.grade.endsWith('GII')?accent:'#F5D38C';
    text(list,meta(r),size==='small'?11:10,ink,true,1);
    text(list,r.name,size==='small'?19:13,paper,true,size==='small'?3:1);
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
  const family = ['small','medium','large'].includes(config.widgetFamily)?config.widgetFamily:'large';
  const widget = render(family,state,now);
  Script.setWidget(widget);
  if (!config.runsInWidget) await widget.presentLarge();
  Script.complete();
}

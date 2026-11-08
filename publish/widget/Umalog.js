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
  const month = today.slice(0,7);
  const future = races.filter(r => r.date >= today).sort((a,b)=>a.date.localeCompare(b.date));
  let list;
  if (size === 'small') {
    const next = future.find(active);
    list = future.filter(r => next && r.date === next.date && active(r));
  } else if (size === 'large') {
    const past = races.filter(r => r.date.startsWith(month) && r.date < today).sort((a,b)=>b.date.localeCompare(a.date));
    list = future.filter(r=>r.date.startsWith(month)).concat(past);
  } else {
    list = future.filter(r=>r.status !== 'result');
    // The next populated month is included when the current month has no remaining races.
    if (list.length) list = list.filter(r => r.date.slice(0,7) === list[0].date.slice(0,7));
  }
  const limit = {small:1,medium:3,large:5}[size];
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
  text(w,'うまログ   '+Number(today.slice(0,4))+'年'+Number(today.slice(5,7))+'月',size==='small'?11:13,accent,true);
  w.addSpacer(4);
  const body = w.addStack();
  if (size==='large') body.layoutVertically();
  if (size!=='small') { calendar(body,today,races); body.addSpacer(size==='medium'?9:4); }
  const list = body.addStack();
  list.layoutVertically();
  const {rows,more} = agenda(races,today,size);
  if (!rows.length) text(list,state.feed?(size==='large'?'今月の重賞登録なし':'次の重賞は未登録'):'予定を取得できません。通信後に再実行',13,paper,true,3);
  rows.forEach((r,i)=>{
    if(i) list.addSpacer(size==='large'?3:2);
    const ink = r.grade.endsWith('GIII')?muted:r.grade.endsWith('GII')?accent:'#F5D38C';
    text(list,meta(r),size==='small'?11:10,ink,true,1);
    text(list,r.name,size==='small'?19:size==='large'?14:13,paper,true,size==='small'?3:1);
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
  const family = ['small','medium','large'].includes(config.widgetFamily)?config.widgetFamily:'medium';
  const widget = render(family,state,now);
  Script.setWidget(widget);
  if (!config.runsInWidget) await widget.presentMedium();
  Script.complete();
}

import {summarize,jstToday} from './core.js';
import {selectable} from './graded-races.js';
import {japaneseHolidayName,HOLIDAY_YEARS} from './jp-holidays.js';

// Derived read-only view: neither the source ledger nor IndexedDB is modified.
export function ledgerMonth(data,events,month){
 if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(month))throw new Error('対象月が不正です。');
 const [year,number]=month.split('-').map(Number);
 const count=new Date(Date.UTC(year,number,0)).getUTCDate();
 const offset=new Date(Date.UTC(year,number-1,1)).getUTCDay();
 const racesById=new Map(data.races.map(r=>[r.id,r]));
 const ticketsById=new Map(data.tickets.map(t=>[t.id,t]));
 const byDay=new Map();
 const group=date=>{if(!byDay.has(date))byDay.set(date,{tickets:[],lines:[]});return byDay.get(date);};
 for(const t of data.tickets){const r=racesById.get(t.raceId);if(r&&r.date.startsWith(month))group(r.date).tickets.push({ticket:t,race:r});}
 for(const l of data.lines){const t=ticketsById.get(l.ticketId),r=t&&racesById.get(t.raceId);if(r&&r.date.startsWith(month))group(r.date).lines.push(l);}
 const eventDays=new Map();
 for(const e of events){if(!e.date.startsWith(month))continue;if(!eventDays.has(e.date))eventDays.set(e.date,[]);eventDays.get(e.date).push(e);}
 const days=Array.from({length:count},(_,i)=>{const date=month+'-'+String(i+1).padStart(2,'0'),grouped=byDay.get(date),lines=grouped?.lines||[];
  return {date,day:i+1,summary:lines.length?summarize(lines):null,tickets:grouped?.tickets||[],events:eventDays.get(date)||[],holiday:japaneseHolidayName(date)};
 });
 return {month,offset,days};
}

export function smallMoney(amount){
 const sign=amount>0?'+':amount<0?'−':'';
 const absolute=Math.abs(amount);
 if(absolute<1000)return sign+absolute.toLocaleString('ja-JP');
 // Compact, approximate yen amounts to keep seven-column date cells readable. 1000万円 = 0.1億.
 // Exact money always stays available in the selected day's detail and aria-label.
 if(absolute<10000)return sign+(Math.floor(absolute/100)/10).toString()+'千';
 if(absolute<100000)return sign+(Math.floor(absolute/1000)/10).toString()+'万';
 if(absolute<10000000)return sign+Math.floor(absolute/10000).toLocaleString('ja-JP')+'万';
 return sign+(Math.floor(absolute/10000000)/10).toLocaleString('ja-JP')+'億';
}
const exactMoney=n=>(n>0?'+':'')+n.toLocaleString('ja-JP')+'円';
const elem=(tag,className,text)=>{const el=document.createElement(tag);if(className)el.className=className;if(text!==undefined)el.textContent=text;return el;};

export function mountLedgerCalendar(host,data,events,month,options={}){
 const model=ledgerMonth(data,events,month);
 host.replaceChildren();
 const section=elem('section','card ledger-calendar');
 section.id='ledgerCalendar';
 const title=elem('h2',null,'収支カレンダー');
 const help=elem('p','help ledger-hint','金額は短縮表示 / ⚐＝重賞。祝日は2026・2027年対応');
 let view=options.view||'month',selectedDate=options.selectedDate;
 const toggle=elem('div','view-toggle');toggle.setAttribute('aria-label','カレンダー表示');
 const monthButton=elem('button','quiet','月表示'),listButton=elem('button','quiet','詳細リスト');monthButton.type=listButton.type='button';toggle.append(monthButton,listButton);
 section.append(toggle,help);
 const grid=elem('div','ledger-grid');
 grid.setAttribute('aria-label',month+'の収支カレンダー');
 for(const [i,weekday] of ['日','月','火','水','木','金','土'].entries())grid.append(elem('span','ledger-weekday'+(i===6?' saturday':i===0?' sunday':''),weekday));
 for(let i=0;i<model.offset;i++)grid.append(elem('span','ledger-blank'));
 const buttons=[],listItems=[];
 const today=jstToday();
 const detail=elem('section','ledger-detail');
 detail.id='ledgerDayDetail';
 detail.setAttribute('aria-live','polite');
 function openDay(row){
  selectedDate=row.date;options.onState?.({date:selectedDate,view});
  for(const button of buttons)button.setAttribute('aria-pressed',String(button.dataset.date===row.date));
  for(const item of listItems)item.classList.toggle('is-selected',item.dataset.listDate===row.date);
  detail.replaceChildren();
  detail.append(elem('h3',null,row.date+(row.holiday?' · '+row.holiday:'')+' の記録'));const register=elem('a','quiet button','この日で馬券を登録');register.href='#entry-date/'+row.date;detail.append(register);
  const stats=row.summary;
  if(stats){
   detail.append(elem('p','ledger-detail-profit',stats.settledCount?'確定収支 '+exactMoney(stats.profit):'確定収支 —'));
   detail.append(elem('p','help','確定購入 '+stats.purchase.toLocaleString('ja-JP')+'円 / 払戻 '+stats.payout.toLocaleString('ja-JP')+'円 / 返還 '+stats.refund.toLocaleString('ja-JP')+'円'));

  }else detail.append(elem('p','help','この日の購入記録はありません。'));
  if(row.tickets.length){
   const header=elem('h4',null,'購入履歴');
   const list=elem('ul','ledger-detail-list');
   for(const {ticket,race} of row.tickets){
    const item=elem('li'),link=elem('a',null,race.venue+' '+race.number+'R '+(race.name||'レース名未登録')+' · '+ticket.type);
    link.href='#detail/'+encodeURIComponent(ticket.id);
    item.append(link);list.append(item);
   }
   detail.append(header,list);
  }
  if(row.events.length){
   detail.append(elem('h4',null,'登録済み重賞'));
   const list=elem('ul','ledger-detail-list');
   for(const event of row.events){
    const item=elem('li');
    const label=event.name+'（'+event.grade+'）'+(event.approval==='pending'?'・認可前':'')+(event.gradeStatus==='pending'?'・格付け申請中':'')+(event.status==='cancelled'?'・中止':event.status==='changed'?'・変更確認':'');
    if(selectable(event)){const link=elem('a',null,label);link.href='#entry/'+encodeURIComponent(event.key);item.append(link);}
    else item.append(elem('span',null,label));
    list.append(item);
   }
   detail.append(list);
  }
 }
 for(const row of model.days){
  const button=elem('button','ledger-day');
  button.type='button';button.dataset.date=row.date;
  const s=row.summary;
  if(s?.settledCount)button.classList.add(s.profit>0?'ledger-win':s.profit<0?'ledger-loss':'ledger-even');
  if(row.date===today)button.classList.add('ledger-today');if(row.holiday)button.classList.add('holiday');
  const weekday=new Date(row.date+'T00:00:00Z').getUTCDay();if(weekday===0)button.classList.add('sunday');if(weekday===6)button.classList.add('saturday');if(row.date===today)button.setAttribute('aria-current','date');button.append(elem('span','ledger-number',String(row.day)));if(row.holiday)button.append(elem('span','ledger-holiday-mark','祝'));
  if(s?.settledCount)button.append(elem('span','ledger-money',smallMoney(s.profit)));
  if(row.events.length)button.append(elem('span','ledger-event','⚐'+(row.events.length>1?row.events.length:'')));
  button.setAttribute('aria-label',row.date+(row.holiday?' '+row.holiday:'')+(s?.settledCount?' 確定収支 '+exactMoney(s.profit):'')+(row.events.length?' 重賞：'+row.events.map(e=>e.name).join('、'):''));
  button.onclick=()=>openDay(row);
  grid.append(button);buttons.push(button);
 }
 const dayList=elem('div','ledger-list');dayList.id='ledgerList';
 for(const row of model.days.filter(r=>r.summary||r.events.length||r.holiday)){
  const item=elem('section','ledger-list-item'),button=elem('button','quiet',row.date+(row.holiday?' · '+row.holiday:''));item.dataset.listDate=row.date;listItems.push(item);button.type='button';button.onclick=()=>{openDay(row);detail.scrollIntoView({block:'nearest',behavior:'auto'});};item.append(button);
  item.append(elem('p',null,row.summary?.settledCount?'確定収支 '+exactMoney(row.summary.profit):'確定収支 —'));

  for(const event of row.events)item.append(elem('p','ledger-event-name',event.name+' · '+event.venue+' · '+event.grade));dayList.append(item);
 }
 if(!dayList.children.length)dayList.append(elem('p','empty','この月の記録・登録済み重賞はありません。'));
 function setView(next){view=next;grid.hidden=view!=='month';dayList.hidden=view!=='list';monthButton.setAttribute('aria-pressed',String(view==='month'));listButton.setAttribute('aria-pressed',String(view==='list'));options.onState?.({date:selectedDate,view});}
 monthButton.onclick=()=>setView('month');listButton.onclick=()=>setView('list');
 // Selected day's full details are kept above the long list, so tapping a list row can reveal them immediately.
 section.append(grid,detail,dayList);host.append(section);setView(view);
 const chosen=model.days.find(r=>r.date===selectedDate)||model.days.find(r=>r.date===today)||model.days.find(r=>r.summary||r.events.length)||model.days[0];
 if(chosen)openDay(chosen);
 return model;
}

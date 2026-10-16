import {summarize,jstToday} from './core.js';
import {STATUS} from './calendar.js';
import {selectable} from './graded-races.js';

// Derived read-only view: neither the source ledger nor IndexedDB is modified.
export function ledgerMonth(data,events,month){
 if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(month))throw new Error('対象月が不正です。');
 const [year,number]=month.split('-').map(Number);
 const count=new Date(Date.UTC(year,number,0)).getUTCDate();
 const offset=(new Date(Date.UTC(year,number-1,1)).getUTCDay()+6)%7;
 const racesById=new Map(data.races.map(r=>[r.id,r]));
 const ticketsById=new Map(data.tickets.map(t=>[t.id,t]));
 const byDay=new Map();
 const group=date=>{if(!byDay.has(date))byDay.set(date,{tickets:[],lines:[]});return byDay.get(date);};
 for(const t of data.tickets){const r=racesById.get(t.raceId);if(r&&r.date.startsWith(month))group(r.date).tickets.push({ticket:t,race:r});}
 for(const l of data.lines){const t=ticketsById.get(l.ticketId),r=t&&racesById.get(t.raceId);if(r&&r.date.startsWith(month))group(r.date).lines.push(l);}
 const eventDays=new Map();
 for(const e of events){if(!e.date.startsWith(month))continue;if(!eventDays.has(e.date))eventDays.set(e.date,[]);eventDays.get(e.date).push(e);}
 const days=Array.from({length:count},(_,i)=>{const date=month+'-'+String(i+1).padStart(2,'0'),grouped=byDay.get(date),lines=grouped?.lines||[];
  return {date,day:i+1,summary:lines.length?summarize(lines):null,tickets:grouped?.tickets||[],events:eventDays.get(date)||[]};
 });
 return {month,offset,days};
}

export function smallMoney(amount){
 const sign=amount>0?'+':amount<0?'−':'';
 const absolute=Math.abs(amount);
 if(absolute<10000)return sign+absolute.toLocaleString('ja-JP');
 const unit=absolute/10000;
 return sign+(unit<10?unit.toFixed(1).replace(/\.0$/,''):Math.round(unit).toLocaleString('ja-JP'))+'万';
}
const exactMoney=n=>(n>0?'+':'')+n.toLocaleString('ja-JP')+'円';
const elem=(tag,className,text)=>{const el=document.createElement(tag);if(className)el.className=className;if(text!==undefined)el.textContent=text;return el;};

export function mountLedgerCalendar(host,data,events,month){
 const model=ledgerMonth(data,events,month);
 host.replaceChildren();
 const section=elem('section','card ledger-calendar');
 section.id='ledgerCalendar';
 const title=elem('h2',null,'収支カレンダー');
 const help=elem('p','help ledger-hint','日別の確定収支と登録済み重賞。日付を押すと詳細を表示');
 section.append(title,help);
 const grid=elem('div','ledger-grid');
 grid.setAttribute('aria-label',month+'の収支カレンダー');
 for(const weekday of ['月','火','水','木','金','土','日'])grid.append(elem('span','ledger-weekday',weekday));
 for(let i=0;i<model.offset;i++)grid.append(elem('span','ledger-blank'));
 const buttons=[];
 const today=jstToday();
 const detail=elem('section','ledger-detail');
 detail.id='ledgerDayDetail';
 detail.setAttribute('aria-live','polite');
 function openDay(row){
  for(const button of buttons)button.setAttribute('aria-pressed',String(button.dataset.date===row.date));
  detail.replaceChildren();
  detail.append(elem('h3',null,row.date+' の記録'));
  const stats=row.summary;
  if(stats){
   detail.append(elem('p','ledger-detail-profit',stats.settledCount?'確定収支 '+exactMoney(stats.profit):'確定収支 —'));
   if(stats.pendingCount)detail.append(elem('p','help','結果待ち '+stats.pendingCount+'点・'+stats.pendingStake.toLocaleString('ja-JP')+'円（収支に含めない）'));
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
  if(row.date===today)button.classList.add('ledger-today');
  button.append(elem('span','ledger-number',String(row.day)));
  if(s?.settledCount)button.append(elem('span','ledger-money',smallMoney(s.profit)));
  if(s?.pendingCount)button.append(elem('span','ledger-pending','待'+s.pendingCount));
  if(row.events.length)button.append(elem('span','ledger-event',row.events.length>1?'重賞'+row.events.length+'件':row.events[0].name));
  button.setAttribute('aria-label',row.date+(s?.settledCount?' 確定収支 '+exactMoney(s.profit):'')+(s?.pendingCount?' 結果待ち'+s.pendingCount+'点':'')+(row.events.length?' 重賞：'+row.events.map(e=>e.name).join('、'):''));
  button.onclick=()=>openDay(row);
  grid.append(button);buttons.push(button);
 }
 section.append(grid,detail);host.append(section);
 const chosen=model.days.find(r=>r.date===today)||model.days.find(r=>r.summary||r.events.length)||model.days[0];
 if(chosen)openDay(chosen);
 return model;
}

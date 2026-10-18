import {withMaster} from './graded-master.js';
import {mountLedgerCalendar} from './ledger-calendar.js';
import {gradedEvents,isGraded,mountGradedHome,mountGradedPicker,eventLabel,selectable} from './graded-races.js';
import {migrateGrowth,grow,BOOK} from './growth-v2.js';
import {emptyCalendar,validateCalendar,calendarRecords} from './calendar.js';
import {calendarHome,mountCandidates,mountCalendarManager} from './calendar-view.js';
let calendarState={revision:0,importedAt:null,calendar:emptyCalendar()},calendarWarning='',calendarDirty=false;
const effectiveCatalog=()=>({...catalog,records:calendarRecords(withMaster(calendarState.calendar),catalog.records)});
import {VENUES,TYPES,STAGE_NAMES,STAGES,uid,check,validDate,money,combination,box,validatePodium,aggregate,summarize,recalculate,validateData,removeTicket,jstToday,weekOf,addDays,raceKey} from './core.js';
import {load,save,loadCatalog,saveCatalog,loadCalendar,loadEntryDraft,discardEntryDraft,loadMainSaveTime,loadBackupConfirmation,confirmBackupStored} from './db.js';
import {validateEntryDraft,createEntryDraftAutosaver} from './entry-drafts.js';
import {styleView} from './style-view.js';
import {RACE_PROVIDER,emptyCatalog,validateCatalog,refreshCatalog,raceDescription} from './race-info.js';
let catalog=emptyCatalog(),catalogWarning='',catalogUpdating=false;
import {mountResults} from './results.js';
import {mountEntryResults} from './entry-results.js';
import {mountFastResults} from './fast-results.js';
import {mountEntrySheets} from './entry-sheets.js';
import {openLineCorrection} from './line-correction.js';
import {raceHistory,ledgerCSV,budgetStatus,setMonthlyBudget,monthReview} from './ledger-tools.js';
import {homeSummary,raceHistoryRows,matchesRaceQuery,typeVenueMatrix} from './screen-roles.js';
import {dayLedger,existingPurchaseDuplicates,periodInsights} from './day-ledger.js';
import {growthRewards} from './growth-rewards.js';
import {mountRaceBatch} from './batch-ui.js';
import {openTips} from './tips.js';
import {createDock} from './dock.js';
import {mountNumberPad} from './number-pad.js';
import {mountAdvancedPattern} from './advanced-picker.js';
import {generateBets,reviewBets} from './bet-patterns.js';
const updateDock=createDock(document.querySelector('nav'));
const $=s=>document.querySelector(s),app=$('#app');
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const yen=n=>`${n.toLocaleString('ja-JP')}円`,signed=n=>(n>0?'+':'')+yen(n),rate=n=>n===null?'—':n.toFixed(1)+'％';
const opts=(list,current)=>list.map(v=>`<option value="${esc(v)}" ${String(v)===String(current)?'selected':''}>${esc(v)}</option>`).join('');
const clone=d=>JSON.parse(JSON.stringify(d));
let draftVisible=150,reviewVisible=50,reviewSignature='',entryResultsEditor=null,fastResultsEditor=null,entrySheetController=null,entryDraftSession=null,entryDraftKey=null,existingApprovalSignature='';
const scheduleEntryDraft=()=>entryDraftSession?.schedule();
let data,editing=null,draft=[],month=jstToday().slice(0,7),homeRange='year',homeYear=jstToday().slice(0,4),analysisRange='all',analysisYear=jstToday().slice(0,4),analysisMonth=jstToday().slice(0,7),analysisVenue='',analysisType='',busy=false,restoreCandidate=null,dirty=false;
function notify(message){$('#notice').textContent=message;$('#notice').style.display='block';clearTimeout(notify.timer);notify.timer=setTimeout(()=>$('#notice').style.display='none',4500);}
function guard(fn){return async e=>{try{await fn(e);}catch(err){console.error(err);notify(err?.message||'処理に失敗しました。入力内容を確認して再試行してください。');}};}
async function commit(next,opts={}){check(!busy,'保存中です。');busy=true;const buttons=[...app.querySelectorAll('button[type="submit"]')].filter(b=>!b.disabled);buttons.forEach(b=>b.disabled=true);app.setAttribute('aria-busy','true');try{data=await save(next,opts);dirty=false;}finally{busy=false;buttons.forEach(b=>b.disabled=false);app.removeAttribute('aria-busy');}}
function metric(label,value){return `<div class="metric"><span>${label}</span><strong>${value}</strong></div>`;}
function pet(){const c=data.character;return `<img class="pet stage${c.stage}" src="./stage-${c.stage}.svg" alt="${STAGE_NAMES[c.stage]}">`;}
function totals(s){return `<div class="metrics">${metric('確定済み購入',yen(s.purchase))}${metric('払戻・返還',yen(s.payout+s.refund))}${metric('回収率',rate(s.returnRate))}${metric('買い目単位的中率',rate(s.lineRate))}</div>`;}
function budgetWidget(source,selectedMonth){
 const b=budgetStatus(source,selectedMonth);
 return `<section class="card budget-widget"><div class="row"><div><small>${esc(selectedMonth)} · 購入額の予算</small><h2>${b.budget===null?'未設定':yen(b.budget)}</h2></div><a class="quiet button" href="#settings">予算を設定</a></div><p class="help">記録した購入額 ${yen(b.purchase)}${b.budget===null?'':` ／ 残り ${signed(b.remaining)}`}${b.pending?'（結果未入力の購入も含む）':''}</p>${b.budget!==null?`<progress aria-label="月間予算の使用割合" max="100" value="${Math.min(100,b.ratio)}"></progress>${b.over?'<p class="help negative">設定した予算を超えています。</p>':''}`:''}</section>`;
}
function monthlyReviewPanel(source,selectedMonth){
 const m=monthReview(source,selectedMonth),s=m.totals;
 return `<section class="card month-review"><h2>${esc(selectedMonth)} の振り返り</h2><p class="help">記録 ${m.days}日 · 確定購入 ${yen(s.purchase)} · 払戻 ${yen(s.payout)} · 返還 ${yen(s.refund)}</p><p>${m.result}</p><p class="help">${m.notes}${m.warning?'<br>'+m.warning:''}</p><p class="help">表示内容は記録された数字の整理であり、次の購入を推奨するものではありません。</p></section>`;
}
function startLineCorrection(id,onDone){
 if(dirty&&!confirm('ほかに未保存の入力があります。保存せずにこの買い目を訂正しますか？'))return;
 const l=data.lines.find(x=>x.id===id);check(l,'買い目が見つかりません。');
 const t=data.tickets.find(x=>x.id===l.ticketId);check(t,'券種情報がありません。');
 openLineCorrection({line:l,ticket:t,onSave:async changes=>{
  const latest=clone(data),target=latest.lines.find(x=>x.id===id);
  check(target&&target.ticketId===t.id,'訂正対象が更新されています。再表示してください。');
  Object.assign(target,changes);await commit(latest);
  onDone();notify('この買い目の訂正を保存しました。');
 }});
}
function bindQuickEdits(onDone){
 app.querySelectorAll('[data-quick-edit]').forEach(button=>button.onclick=guard(()=>startLineCorrection(button.dataset.quickEdit,onDone)));
}
function ticketInfo(t){const r=data.races.find(r=>r.id===t.raceId),ls=data.lines.filter(l=>l.ticketId===t.id),s=summarize(ls);return {r,ls,s};}
function ticketCard(t){const {r,ls,s}=ticketInfo(t);const status=s.pendingCount?(s.settledCount?'一部確定':'未入力'):s.lineCount===0?'返還':s.lineHits?'的中':'不的中';return `<div class="history-item"><div class="row"><div><small>${r.date} · ${r.venue} ${r.number}R</small><h3>${esc(r.name||r.venue+' '+r.number+'R')} <span class="tag">${t.type}</span></h3></div><strong class="${s.profit<0?'negative':'positive'}">${s.settledCount?signed(s.profit):'未入力'}</strong></div><small><span class="tag">${status}</span> ${ls.length}点 · 購入 ${yen(ls.reduce((a,l)=>a+l.stake,0))} </small><br><button class="quiet" data-detail="${t.id}">詳細・結果入力</button></div>`;}
function bindDetails(){document.querySelectorAll('[data-detail]').forEach(b=>b.onclick=()=>{location.hash='detail/'+b.dataset.detail;});}
function catalogPanel(){const stamp=v=>v?new Date(v).toLocaleString('ja-JP',{timeZone:'Asia/Tokyo'}):'未実施';return `<section class="card" id="raceInfoPanel"><details><summary>自動取得の状況</summary><h2>レース情報</h2><p id="raceInfoStatus" role="status">${catalogUpdating?'取得中…':!RACE_PROVIDER?'提供元未設定・自動取得は未提供':catalog.error?'更新失敗（取得済み情報は保持）':'取得済み情報を利用できます'}</p><p class="help">最終成功：${esc(stamp(catalog.lastSuccess))}（日本時間）<br>最終試行：${esc(stamp(catalog.lastAttempt))}<br>保存済み ${catalog.records.length}件 / 前回成功時の取得 ${catalog.lastCount}件</p>${catalogWarning||catalog.error?`<p role="alert" class="help negative">${esc(catalogWarning||catalog.error)}</p>`:''}<button id="refreshRaces" class="quiet full" ${!RACE_PROVIDER||catalogUpdating?'disabled':''} aria-describedby="raceInfoHelp">直近レース情報を更新する</button><p id="raceInfoHelp" class="help">${!RACE_PROVIDER?'正規のデータ提供元・利用条件が未確定のため更新できません。条件は「情報未取得」と表示し、収支登録は通常どおり利用できます。':'通信で取得します。失敗時も保存済み情報と収支は保持します。取得済み情報はオフラインでも利用できます。'}</p><p class="help muted">レース情報は収支と別のキャッシュです。JSONバックアップには含まれません。</p></details></section>`;}
function bindCatalog(){const button=$('#refreshRaces');if(!button)return;button.onclick=guard(async()=>{if(catalogUpdating||!RACE_PROVIDER)return;catalogUpdating=true;button.disabled=true;$('#raceInfoStatus').textContent='取得中…';try{const result=await refreshCatalog(catalog);if(result.status!=='unconfigured'){await saveCatalog(result.catalog);catalog=result.catalog;catalogWarning='';}}finally{catalogUpdating=false;if($('#raceInfoPanel')){const panel=$('#raceInfoPanel');panel.outerHTML=catalogPanel();bindCatalog();}}});}
function home(){
 if(window.__UMALOG_ENTRY_CLASSIC__===true)return homeClassic();
 const currentMonth=jstToday().slice(0,7),s=homeSummary(data,currentMonth),receive=s.payout+s.refund;
 app.innerHTML=`<h1 class="home-minimal-title">ホーム</h1><section class="card hero home-minimal" id="homeSummary">
   <div class="row"><h2>今月の収支</h2><small>${currentMonth.replace('-','年')}月</small></div>
   <div class="home-profit ${s.profit<0?'negative':'positive'}" aria-label="今月の確定収支">${s.settledCount?signed(s.profit):'—'}</div>
   <p class="home-minimal-note">${s.settledCount?'結果確定分の収支':'今月はまだ確定した記録がありません'}</p>
   <div class="home-minimal-totals">${metric('購入（確定分）',yen(s.purchase))}${metric('払戻・返還',yen(receive))}</div>
   ${s.pendingCount?`<p class="help">結果未入力 ${s.pendingCount}点 · ${yen(s.pendingStake)} は確定収支に含みません。</p>`:''}
   </section>
   <a class="button accent full home-entry-cta" id="homeEntry" href="#entry">＋ 結果を記録する</a>
   <p class="home-minimal-foot">詳しい成績は <a href="#analysis">分析</a> で確認できます。</p>`;
 loadEntryDraft('new').then(saved=>{
  if(!$('#homeEntry')||!saved)return;
  try{validateEntryDraft(saved);if(saved.key!=='new')return;}catch{return;}
  $('#homeEntry').textContent='入力途中の記録を再開';
 }).catch(()=>{});
}
function homeClassic(){
 const today=jstToday(),daily=aggregate(data,r=>r.date===today);
 const summary=()=>{const prefix=homeRange==='year'?homeYear:month,s=aggregate(data,r=>r.date.startsWith(prefix));return `<small>${homeRange==='year'?'年間':'月間'}の確定収支</small><div class="balance ${s.profit<0?'negative':'positive'}">${s.settledCount?signed(s.profit):'—'}</div><div class="metrics">${metric('回収率',rate(s.returnRate))}${metric('買い目の的中率',rate(s.lineRate))}</div><details><summary>購入・払戻の内訳</summary>${totals(s)}<p class="help">払戻 ${yen(s.payout)} / 返還 ${yen(s.refund)}。未入力の明細は確定集計に含めません。</p></details>`;};
 app.innerHTML=`<div class="page-heading"><h1>ホーム</h1><div class="home-range-controls"><div class="home-range-switch" role="group" aria-label="ホーム収支の集計期間"><button type="button" class="quiet" id="homeYearly" aria-pressed="${homeRange==='year'}">年間</button><button type="button" class="quiet" id="homeMonthly" aria-pressed="${homeRange==='month'}">月間</button></div><label id="homeYearField" ${homeRange==='month'?'hidden':''}>対象年<input id="homeYearInput" type="number" inputmode="numeric" min="2000" max="2199" step="1" value="${homeYear}"></label><label id="homeMonthField" ${homeRange==='year'?'hidden':''}>対象月<input id="month" type="month" min="2000-01" max="2199-12" value="${month}"></label></div></div><section class="card hero" id="homeSummary">${summary()}</section><section class="card home-day-link"><div><small>今日の記録 · ${today}</small><strong>${daily.settledCount?signed(daily.profit):"まだ記録なし"}</strong><a href="#day/${today}">1日分のログを見る</a></div><a class="quiet button" href="#entry-date/${today}">今日の結果を記録 →</a></section><section id="homeBudget">${budgetWidget(data,homeRange==='month'?month:jstToday().slice(0,7))}</section><section class="card graded-home-compact" id="gradedHome"></section>`;
 const refresh=()=>{$('#homeYearly').setAttribute('aria-pressed',String(homeRange==='year'));$('#homeMonthly').setAttribute('aria-pressed',String(homeRange==='month'));$('#homeYearField').hidden=homeRange!=='year';$('#homeMonthField').hidden=homeRange!=='month';$('#homeYearInput').value=homeYear;$('#month').value=month;$('#homeSummary').innerHTML=summary();$('#homeBudget').innerHTML=budgetWidget(data,homeRange==='month'?month:jstToday().slice(0,7));};$('#homeYearly').onclick=()=>{if(homeRange==='year')return;homeRange='year';homeYear=month.slice(0,4);refresh();};$('#homeMonthly').onclick=()=>{if(homeRange==='month')return;homeRange='month';month=homeYear+month.slice(4);refresh();};$('#homeYearInput').onchange=e=>{if(/^(20\d\d|21\d\d)$/.test(e.target.value)){homeYear=e.target.value;refresh();}else e.target.value=homeYear;};$('#month').onchange=e=>{if(/^\d{4}-(0[1-9]|1[0-2])$/.test(e.target.value)){month=e.target.value;refresh();}};mountGradedHome($('#gradedHome'),gradedEvents(withMaster(calendarState.calendar)));
}
let calendarMonth=jstToday().slice(0,7),calendarSelected=jstToday(),calendarView='month',calendarMeasure='profit';
function calendarScreen(){
 app.innerHTML=`<div class="page-heading"><h1>収支カレンダー</h1><label>表示対象月<input id="month" type="month" value="${calendarMonth}" min="2000-01" max="2199-12"></label></div><div class="month-actions"><button id="monthPrev" class="quiet" aria-label="前の月">前月</button><button id="monthToday" class="quiet">今月</button><button id="monthNext" class="quiet" aria-label="次の月">翌月</button></div><div class="calendar-metric"><label>日付に表示する金額<select id="calendarMetric"><option value="profit">確定収支</option><option value="purchase">購入額（未入力も含む）</option><option value="receipt">払戻・返還</option></select></label></div><div id="ledgerCalendarHost"></div>`;
 const update=()=>mountLedgerCalendar($('#ledgerCalendarHost'),data,gradedEvents(withMaster(calendarState.calendar)),calendarMonth,{selectedDate:calendarSelected,view:calendarView,metric:calendarMeasure,onState:v=>{calendarSelected=v.date;calendarView=v.view;}});
 $('#calendarMetric').value=calendarMeasure;$('#calendarMetric').onchange=e=>{calendarMeasure=e.target.value;update();};
 const change=value=>{if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(value)||value<'2000-01'||value>'2199-12')return;calendarMonth=value;$('#month').value=value;update();};
 $('#month').onchange=e=>change(e.target.value);for(const [id,delta] of [['monthPrev',-1],['monthNext',1]])$('#'+id).onclick=()=>{const [y,m]=calendarMonth.split('-').map(Number);change(new Date(Date.UTC(y,m-1+delta,1)).toISOString().slice(0,7));};$('#monthToday').onclick=()=>{calendarSelected=jstToday();change(jstToday().slice(0,7));};update();
}
function dayScreen(date){
 const day=dayLedger(data,date),stat=day.summary;
 const section=day.entries.map(({race,tickets,lines,summary})=>{
  const items=tickets.map(t=>{
   const bs=lines.filter(l=>l.ticketId===t.id),v=summarize(bs);
   const short=bs.slice(0,24).map(l=>`<div class="day-edit-row"><span>${esc(t.type)} ${l.numbers.join(['馬単','三連単'].includes(t.type)?'→':'－')}</span><small>購入 ${yen(l.stake)} / 払戻 ${yen(l.payout)} / 返還 ${yen(l.refund)}</small><button type="button" class="quiet" data-quick-edit="${esc(l.id)}">訂正</button></div>`).join('');
   return `<div class="day-ticket"><span>${esc(t.type)} · ${bs.length}点</span><strong class="${v.profit<0?'negative':'positive'}">${v.settledCount?signed(v.profit):'結果未入力'}</strong><a href="#detail/${encodeURIComponent(t.id)}">詳細</a></div><details class="day-ticket-edit"><summary>この券種の買い目を訂正する</summary>${short}${bs.length>24?'<p class="help">残りの買い目は詳細画面から訂正できます。</p>':''}</details>`;
  }).join('');
  return `<section class="card day-race"><div class="row"><div><small>${esc(race.venue)} ${race.number}R</small><h3>${esc(race.name||race.venue+' '+race.number+'R')}</h3></div><strong class="${summary.profit<0?'negative':'positive'}">${summary.settledCount?signed(summary.profit):'—'}</strong></div>${items}<a class="quiet button day-next" href="#entry-next/${date}/${encodeURIComponent(race.venue)}">同じ競馬場で次を記録 →</a></section>`;
 }).join('');
 app.innerHTML=`<a href="#calendar">← カレンダーへ</a><h1>${date} のうまログ</h1><section class="card day-summary"><div class="day-metrics">${metric('購入',yen(stat.purchase))}${metric('払戻',yen(stat.payout))}${metric('返還',yen(stat.refund))}</div><small>確定収支</small><div class="balance ${stat.profit<0?'negative':'positive'}">${stat.settledCount?signed(stat.profit):'—'}</div><p class="help">${day.raceCount}レース · 結果未入力 ${stat.pendingCount}点（未確定は収支に含みません）</p></section>${section||'<section class="card empty">この日の記録はありません。</section>'}<a class="button quiet full" href="#entry-date/${date}">＋ この日のレースを記録</a>`;
 bindQuickEdits(()=>dayScreen(date));
}
function analysisInsightPanel(a){
 const dateMoney=d=>d?`${d.date} · ${signed(d.summary.profit)}`:'—';
 return `<section class="card analysis-insights"><h2>記録した日の成績</h2><div class="day-metrics">${metric('記録日',a.days+'日')}${metric('プラスの日',a.wins+'日')}${metric('マイナスの日',a.losses+'日')}</div><p class="help">収支ゼロの日 ${a.neutrals}日 · プラスの日の割合 ${rate(a.winDayRate)}。一部でも結果確定した日を集計し、未入力の買い目は除外しています。</p><div class="analysis-extremes"><p>最高の日 <b>${dateMoney(a.best)}</b></p><p>最低の日 <b>${dateMoney(a.worst)}</b></p></div><details><summary>累積収支（月末時点・${a.cumulativeMonths.length}か月）</summary>${a.cumulativeMonths.length?`<div class="daily-trend">${a.cumulativeMonths.map(m=>`<div><span>${m.month}</span><small>月間 ${signed(m.profit)}</small><strong class="${m.cumulative<0?'negative':'positive'}">${signed(m.cumulative)}</strong></div>`).join('')}</div>`:'<p class="empty">確定した記録がありません。</p>'}</details></section>`;
}
function rewardItems(source){
 return growthRewards(source).map(r=>`<div class="reward-item ${r.unlocked?'is-unlocked':'is-locked'}"><span class="reward-icon" aria-hidden="true">${r.unlocked?r.icon:'◇'}</span><div><b>${r.name}</b><small>${r.description}</small></div><span class="reward-progress">${r.unlocked?'獲得済み':Math.min(r.current,r.goal)+'/'+r.goal}</span></div>`).join('');
}
function rewardPanel(source){return `<section class="card reward-panel"><h2>成長のご褒美</h2><p class="help">記録とお世話で見た目の称号を集めよう。払戻や育成EXPに追加の効果はありません。</p><div id="growthRewards">${rewardItems(source)}</div></section>`;}
function sortedTickets(){return [...data.tickets].sort((a,b)=>data.races.find(r=>r.id===b.raceId).date.localeCompare(data.races.find(r=>r.id===a.raceId).date)||b.createdAt.localeCompare(a.createdAt));}
function entry(id=null,eventId=null){editing=id;draft=[];entryResultsEditor=null;fastResultsEditor=null;entrySheetController=null;existingApprovalSignature='';entryDraftKey=id||'new';draftVisible=150;reviewVisible=50;reviewSignature='';let entrySaved=false;const t=id?data.tickets.find(t=>t.id===id):null;check(!id||t,'記録が見つかりません。');const r=t?data.races.find(r=>r.id===t.raceId):{date:jstToday(),venue:'東京',number:(window.__UMALOG_ENTRY_CLASSIC__===true||new URLSearchParams(location.search).get('entry-layout')==='classic')?1:'',name:''};if(t)draft=data.lines.filter(l=>l.ticketId===id).map(l=>({...clone(l),type:t.type}));
 app.innerHTML=`<h1>${t?'記録を編集':'馬券を登録'}</h1><section class="card entry-draft-alert" id="entryDraftRecovery" hidden></section><section class="card entry-dash" id="entryQuickDashboard" hidden><div class="row"><div><small>レースの収支帳簿</small><h2>購入と結果</h2></div><span id="quickStatus" class="tag">未入力</span></div><div id="quickSnapshot" class="day-metrics"></div><p class="entry-save-status" id="entryDraftStatus" role="status">下書き：準備中</p><div class="entry-quick-actions"><button id="openPurchaseSheet" class="quiet" type="button">＋ 買い目を追加</button><button id="openOutcomeSheet" class="quiet" type="button">✓ 結果を入力</button></div><details class="quick-lines"><summary id="quickLineTitle">購入した買い目を確認</summary><div id="quickLines"></div></details></section><div id="entrySheetBackdrop" class="entry-sheet-backdrop" hidden></div><form id="entryForm"><section class="card"><h2>① レースを選ぶ</h2><div id="gradedPicker"></div><label>開催日<input required type="date" id="date" value="${r.date}" min="2000-01-01" max="2199-12-31"></label><div class="grid"><label>競馬場<select id="venue">${opts(VENUES,r.venue)}</select></label><label>レース番号<select id="number" required><option value="">番号を確認して選択</option>${Array.from({length:12},(_,i)=>`<option value="${i+1}" ${r.number===i+1?'selected':''}>${i+1}R</option>`).join('')}</select></label></div><div class="race-fast-picks" id="raceFastPicks" role="group" aria-label="レース番号のクイック選択"></div><div id="calendarCandidates"></div><p id="raceMatch" class="help" role="status"></p><label>レース名（任意）<input id="raceName" maxlength="100" value="${esc(r.name)}"></label>${t?.kind==='advance'?'<p class="help">この記録は以前の「事前登録」として保存されています。既存の区分は維持します。</p>':''}</section><section class="card" id="entryPurchasePanel"><h2 id="entryPurchaseTitle">② 買い目を入力</h2><div class="grid"><label>券種<select id="type" ${t?'disabled':''}>${opts(TYPES,t?.type||'ワイド')}</select></label><label>入力方式<select id="mode"><option value="normal">通常</option><option value="box">BOX</option><option value="flow">流し</option><option value="formation">フォーメーション</option></select></label></div><div id="betTypeFast" role="group" aria-label="券種を素早く選ぶ"></div><div id="numberPad"></div><div id="advancedPicker"></div><label class="number-manual">番号を直接入力・修正<input id="numbers" inputmode="text" placeholder="例：1 4 9" autocomplete="off"></label><div class="grid"><label>1点あたり購入額<input id="stake" type="number" min="100" step="100" value="100" inputmode="numeric"></label><label>同じ買い目の追加<select id="duplicate"><option value="separate">別の行として記録</option><option value="merge">未入力の行へ金額合算</option></select></label></div><button type="button" id="addLine" class="quiet full">買い目を確認・追加</button><p id="additionEstimate" class="addition-estimate help" role="status" aria-live="polite"></p><div id="draft"></div></section><section class="card" id="entryOutcomePanel"><h2 id="entryOutcomeTitle">③ レース結果を入力</h2><p class="help">結果が出てから記録する画面です。的中は実際に受け取った払戻金（100円あたりのオッズではありません）を入力してください。返還は購入金額が戻った場合に選びます。</p><div id="fastResults"></div><div id="entryResults"></div><button type="button" class="quiet full" id="finishOutcomeSheet" hidden>結果画面を閉じる</button></section><section class="card"><h2>④ 収支を確認して保存</h2><div id="entryReview" class="entry-review"></div><div id="existingDuplicateReview"></div><label>購入メモ（任意）<textarea id="memo" maxlength="4000">${esc(t?.memo||'')}</textarea></label><label class="checklabel" ${t?'hidden':''}><input id="saveNextRace" type="checkbox">保存後、同じ日付・競馬場で次のレースを記録</label><button class="full accent" type="submit">${t?'結果と記録を保存':'この日の結果を記録'}</button><details class="entry-legacy"><summary>例外：結果が未入力のまま保存する</summary><label class="checklabel"><input id="allowUnfinished" type="checkbox">結果未入力の買い目が残っていても保存する（通常は使用しません）</label><p class="help">過去の未確定記録を訂正する場合などに限ります。未入力分は確定収支に含みません。</p></details>${t?'<p class="help">開催日等の変更は、この券種の記録に適用します。同一レース名は共有されます。訂正しても獲得済み育成EXPは保持します。</p>':''}</section></form>`;
 entryResultsEditor=mountEntryResults($('#entryResults'),{onDirty:()=>{dirty=true;updateDraftTotals();fastResultsEditor?.render(draft);}});
 const classic=window.__UMALOG_ENTRY_CLASSIC__===true||new URLSearchParams(location.search).get('entry-layout')==='classic';
 if(!classic){
  const details=document.createElement('details');details.id='entryDetailedResults';details.className='entry-advanced';
  details.innerHTML='<summary>一部返還・詳細結果を編集</summary>';
  $('#entryResults').before(details);details.append($('#entryResults'));
  $('#entryQuickDashboard').hidden=false;$('#finishOutcomeSheet').hidden=false;
  entrySheetController=mountEntrySheets({form:$('#entryForm'),purchase:$('#entryPurchasePanel'),outcomes:$('#entryOutcomePanel'),backdrop:$('#entrySheetBackdrop')});
  $('#openPurchaseSheet').onclick=e=>entrySheetController.open('purchase',e.currentTarget);
  $('#openOutcomeSheet').onclick=e=>entrySheetController.open('outcomes',e.currentTarget);
  $('#finishOutcomeSheet').onclick=()=>entrySheetController.close();
  fastResultsEditor=mountFastResults($('#fastResults'),{onChange:()=>{dirty=true;entryResultsEditor.reset(draft);updateDraftTotals();},onAdvanced:index=>{
   $('#entryDetailedResults').open=true;
   const select=$('[data-entry-outcome="'+index+'"]');
   if(select){select.value='advanced';select.dispatchEvent(new Event('change',{bubbles:true}));select.scrollIntoView({block:'center',behavior:'auto'});}
  }});
 }

 const raceButtons=$('#raceFastPicks');
 const updateRaceButtons=()=>{raceButtons.querySelectorAll('[data-race-quick]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.raceQuick===$('#number').value)));};
 raceButtons.innerHTML=Array.from({length:12},(_,i)=>`<button type="button" class="quiet" data-race-quick="${i+1}" aria-pressed="false">${i+1}R</button>`).join('');
 raceButtons.querySelectorAll('button').forEach(b=>b.onclick=()=>{$('#number').value=b.dataset.raceQuick;$('#number').dispatchEvent(new Event('change',{bubbles:true}));});
 $('#number').addEventListener('change',updateRaceButtons);updateRaceButtons();
 const match=()=>{$('#raceMatch').textContent=raceDescription({date:$('#date').value,venue:$('#venue').value,number:Number($('#number').value)},effectiveCatalog());updateCandidates($('#date').value,$('#venue').value);};const updateCandidates=mountCandidates($('#calendarCandidates'),withMaster(calendarState.calendar),v=>{if(v.venue)$('#venue').value=v.venue;if(v.number)$('#number').value=v.number;dirty=true;match();});['date','venue','number'].forEach(id=>$('#'+id).addEventListener('change',match));match();
 const events=gradedEvents(withMaster(calendarState.calendar)),choose=r=>{check(selectable(r),'この重賞は変更・中止の確認が必要です。');$('#date').value=r.date;$('#venue').value=r.venue;$('#raceName').value=r.name;$('#number').value=r.number??'';$('#gradedSelection').textContent=eventLabel(r)+(r.number===null?' · レース番号は未発表です。公式情報で確認して選択してください。':' · 番組掲載の予定番号です。変更がないか公式情報を確認してください。');dirty=true;match();updateDraftTotals();};mountGradedPicker($('#gradedPicker'),events,choose);if(eventId){const chosen=events.find(r=>r.key===eventId);if(chosen&&selectable(chosen))choose(chosen);else{$('#number').value='';$('#gradedSelection').textContent='重賞情報が見つからないか、変更・中止されています。開催情報を確認してください。';}}
 const numberPad=mountNumberPad($('#numberPad'),$('#numbers'),$('#type'),$('#mode'));
 const advancedPicker=mountAdvancedPattern($('#advancedPicker'),$('#numbers'),$('#type'),$('#mode'),numberPad);
 const typeFast=$('#betTypeFast');
 if(t){typeFast.hidden=true;}else{
  typeFast.innerHTML='<p class="help">券種をタップして選択</p><div class="bet-type-fast">'+TYPES.map(type=>`<button class="quiet" data-bet-fast="${esc(type)}" type="button" aria-pressed="false">${esc(type)}</button>`).join('')+'</div>';
  const syncFast=()=>typeFast.querySelectorAll('[data-bet-fast]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.betFast===$('#type').value)));
  typeFast.querySelectorAll('button').forEach(b=>b.onclick=()=>{$('#type').value=b.dataset.betFast;$('#type').dispatchEvent(new Event('change',{bubbles:true}));syncFast();});
  $('#type').addEventListener('change',syncFast);syncFast();
 }
 const showEstimate=()=>{
  const label=$('#additionEstimate'),type=$('#type').value,mode=$('#mode').value;
  try{
   const numbers=$('#numbers').value.trim().split(/[\s,、・\-→]+/).filter(Boolean).map(Number);
   const options=mode==='normal'||mode==='box'?{numbers}:advancedPicker.selection();
   const count=generateBets(type,mode,options).length,stake=money(Number($('#stake').value),true);
   const total=money(count*stake,true);
   label.textContent=`追加予定 ${count}点 / ${yen(total)}（買い目を追加する前の確認）`;
  }catch{label.textContent='番号と金額を選ぶと、追加予定額を表示します';}
 };
 renderDraft();showEstimate();
 $('#entryForm').oninput=e=>{dirty=true;scheduleEntryDraft();if(['date','venue','number','raceName'].includes(e.target.id))updateDraftTotals();if(['numbers','stake','advancedPicker','type','mode'].includes(e.target.id))showEstimate();};
 $('#entryForm').addEventListener('change',e=>{scheduleEntryDraft();if(['date','venue','number','raceName'].includes(e.target.id))updateDraftTotals();if(['type','mode','stake'].includes(e.target.id)){dirty=true;showEstimate();}});
 $('#addLine').onclick=guard(()=>{check(!/^[\s]*[-−]/.test($('#numbers').value),'負の番号は入力できません。');const type=$('#type').value,ns=$('#numbers').value.trim().split(/[\s,、・\-→]+/).filter(Boolean).map(Number),amount=money(Number($('#stake').value),true),mode=$('#mode').value,cs=generateBets(type,mode,mode==='normal'||mode==='box'?{numbers:ns}:advancedPicker.selection());check(draft.length+cs.length<=10000,'1回の登録は10,000点までです。');for(const numbers of cs){const found=$('#duplicate').value==='merge'&&draft.find(l=>l.type===type&&l.status==='pending'&&l.purchaseMode===mode&&JSON.stringify(l.numbers)===JSON.stringify(numbers));if(found){found.stake=money(found.stake+amount,true);}else draft.push({id:uid(),type,numbers,stake:amount,purchaseMode:mode,status:'pending',payout:0,refund:0});}dirty=true;renderDraft();showEstimate();entrySheetController?.close();notify(`${cs.length}点を追加しました（合計 ${yen(draft.reduce((n,l)=>n+l.stake,0))}）。`);});
 if(!classic){
 const draftId=id||'new',draftBaseSignature=id?JSON.stringify(data.lines.filter(l=>l.ticketId===id)):'';
 const captureEntryDraft=()=>({
  version:1,key:draftId,updatedAt:new Date().toISOString(),baseSignature:draftBaseSignature,
  race:{date:$('#date').value,venue:$('#venue').value,number:$('#number').value,name:$('#raceName').value},
  lines:draft.map(l=>({...l})),advanced:advancedPicker.selection(),
  fields:Object.fromEntries(['type','mode','numbers','stake','duplicate','memo','saveNextRace','allowUnfinished'].map(field=>{
   const el=$('#'+field);return [field,el.type==='checkbox'?(el.checked?'1':'0'):el.value];
  }))
 });
 const statusEl=$('#entryDraftStatus');
 const currentDraftSession=createEntryDraftAutosaver({
  key:draftId,capture:captureEntryDraft,
  onSaved:record=>{if(entryDraftSession===currentDraftSession&&statusEl?.isConnected)statusEl.textContent='下書きを端末内に保存済み · '+new Date(record.updatedAt).toLocaleTimeString('ja-JP',{hour:'2-digit',minute:'2-digit'});},
  onError:error=>{if(entryDraftSession===currentDraftSession&&statusEl?.isConnected)statusEl.textContent='下書き保存に失敗：'+error.message;}
 });
 entryDraftSession=currentDraftSession;
 const recovery=$('#entryDraftRecovery');
 loadEntryDraft(draftId).then(saved=>{
  if(entryDraftSession!==currentDraftSession||!recovery.isConnected)return;
  if(!saved){currentDraftSession.start();statusEl.textContent='入力すると下書きを自動保存します';if(dirty)currentDraftSession.schedule();return;}
  let valid=true;
  try{validateEntryDraft(saved);check(saved.key===draftId&&saved.baseSignature===draftBaseSignature,'下書きの元になった記録が変更されています。');}catch{valid=false;}
  recovery.hidden=false;
  recovery.innerHTML=`<h2>${valid?'入力途中の下書きがあります':'保存済みの下書きを復元できません'}</h2><p class="help">${valid?esc(saved.race.date+' · '+saved.race.venue+' '+(saved.race.number||'未選択')+'R · '+saved.lines.length+'点'):'過去の記録が変更されたか、下書きが不正です。確定済み帳簿は変更されていません。'}</p>${valid?'<button class="full" type="button" id="recoverEntryDraft">続きを入力する</button>':''}<button type="button" id="discardEntryDraft" class="quiet full">下書きを破棄して新規入力</button>`;
  statusEl.textContent=valid?'復元か破棄を選択してください':'安全のため下書きの復元を停止しました';
  const discard=recovery.querySelector('#discardEntryDraft');
  discard.onclick=guard(async()=>{if(!confirm('入力途中の下書きを完全に破棄しますか？'))return;await discardEntryDraft(draftId);await currentDraftSession.stop();entryDraftSession=null;dirty=false;entry(id,eventId);notify('下書きを破棄し、入力画面を初期化しました。');});
  const recover=recovery.querySelector('#recoverEntryDraft');
  if(recover)recover.onclick=guard(async()=>{
   if(dirty&&!confirm('現在画面に入力した内容を、保存されている下書きで置き換えますか？'))return;
   draft=saved.lines.map(l=>({...l}));
   for(const id of ['date','venue','number','raceName'])$('#'+id).value=({date:saved.race.date,venue:saved.race.venue,number:saved.race.number,raceName:saved.race.name})[id];
   for(const [field,value]of Object.entries(saved.fields)){const el=$('#'+field);if(!el)continue;if(el.type==='checkbox')el.checked=value==='1';else el.value=value;}
   $('#type').dispatchEvent(new Event('change'));$('#mode').dispatchEvent(new Event('change'));
   advancedPicker.restore(saved.advanced);
   numberPad.refresh();match();updateRaceButtons();
   entryResultsEditor.reset(draft);fastResultsEditor?.render(draft);
   dirty=true;renderDraft();showEstimate();recovery.hidden=true;
   currentDraftSession.start();currentDraftSession.schedule();
   notify('保存していた下書きを復元しました。確定済み収支にはまだ反映していません。');
  });
 }).catch(error=>{if(entryDraftSession!==currentDraftSession)return;statusEl.textContent='下書きを読み込めません：'+error.message;currentDraftSession.start();});
 }
 $('#entryForm').onsubmit=guard(async e=>{e.preventDefault();if(busy||entrySaved)return;const review=reviewBets(draft);check(!review.duplicates.length||$('#entryDuplicatesConfirmed')?.checked,'同じ組番の追加購入を確認してください。');check(!draft.some(l=>l.status==='settled'&&!Number.isFinite(l.payout)),'的中馬券の払戻金を正しく入力してください。');const completed=entryResultsEditor.values();check(completed.every(l=>l.status!=='pending')||$('#allowUnfinished').checked,'すべての買い目の結果を入力してください。結果未入力の行は保存できません。');check(Number($('#number').value)>=1&&Number($('#number').value)<=12,'レース番号を確認して選択してください。');check(draft.length,'買い目を追加してください。');const next=clone(data),r={date:$('#date').value,venue:$('#venue').value,number:Number($('#number').value),name:$('#raceName').value.trim()},kind=t?.kind||'reported',memo=$('#memo').value.trim();const overlaps=existingPurchaseDuplicates(data,r,draft,editing);check(!overlaps.length||$('#existingDuplicatesConfirmed')?.checked,'登録済みの同じ買い目があります。重複を確認してください。');const continueNext=!editing&&$('#saveNextRace').checked;let race=next.races.find(x=>raceKey(x)===raceKey(r));if(!race){race={...r,id:uid()};next.races.push(race);}else race.name=r.name;
 if(editing){const old=next.tickets.find(t=>t.id===editing);old.raceId=race.id;old.kind=kind;old.memo=memo;next.lines=next.lines.filter(l=>l.ticketId!==editing);next.lines.push(...completed.map(({type,...l})=>({...l,ticketId:editing})));}else{for(const type of new Set(draft.map(l=>l.type))){const ticket={id:uid(),raceId:race.id,type,kind,memo,createdAt:new Date().toISOString()};next.tickets.push(ticket);next.lines.push(...completed.filter(l=>l.type===type).map(({type,...l})=>({...l,ticketId:ticket.id})));}}
 next.races=next.races.filter(r=>next.tickets.some(t=>t.raceId===r.id));entrySaved=true;try{await entryDraftSession?.pauseForCommit();await commit(next,{clearDraftKey:entryDraftKey});await entryDraftSession?.stop();entryDraftSession=null;}catch(error){entrySaved=false;entryDraftSession?.resume();entryDraftSession?.schedule();throw error;}notify('保存しました。');location.hash=continueNext?'entry-next/'+r.date+'/'+encodeURIComponent(r.venue):'history';});
}
function updateDraftTotals(){
 if(!$('#draft .entry-total'))return;
 const review=reviewBets(draft),text=`${review.count}点 / 合計 ${yen(review.total)}`;$('#draft .entry-total').textContent=text;
 const raceText=`${$('#date').value} · ${$('#venue').value} ${$('#number').value?$('#number').value+'R':'番号未確認'}`,name=$('#raceName').value||'レース名なし';
 const signature=JSON.stringify([raceText,name,draft]),same=signature===reviewSignature,confirmed=same&&$('#entryDuplicatesConfirmed')?.checked,opened=$('#reviewLines')?.open;reviewSignature=signature;
 const modes={normal:'通常',box:'BOX',flow:'流し',formation:'フォーメーション'},rows=draft.slice(0,reviewVisible);
 $('#entryReview').innerHTML=`<small>${esc(raceText)}</small><h3>${esc(name)}</h3><strong class="review-total">${text}</strong><details id="reviewLines" ${opened?'open':''}><summary>券種・買い方・買い目を確認（${draft.length}点）</summary><ul class="review-lines">${rows.map(l=>`<li><span>${esc(l.type)} · ${modes[l.purchaseMode]||'旧記録（不明）'}<br><b>${l.numbers.join(['馬単','三連単'].includes(l.type)?'→':'－')}</b></span><strong>${yen(l.stake)}</strong></li>`).join('')}</ul>${draft.length>rows.length?'<button type="button" id="reviewMore" class="quiet full">さらに50点を表示</button>':''}</details>${review.duplicates.length?`<p class="help">同じ券種・組番が ${review.duplicates.length}組あります。買い方が異なるものも含みます。削除・合算はしていません。</p><label class="checklabel"><input type="checkbox" id="entryDuplicatesConfirmed" ${confirmed?'checked':''}>意図した追加購入として残す</label>`:''}`;
 const race={date:$('#date').value,venue:$('#venue').value,number:Number($('#number').value)};
 const overlaps=draft.length&&Number.isInteger(race.number)&&race.number>=1&&race.number<=12?existingPurchaseDuplicates(data,race,draft,editing):[];
 const fingerprint=JSON.stringify([race,draft.map(l=>[l.type,l.numbers,l.stake])]);
 const accepted=fingerprint===existingApprovalSignature&&$('#existingDuplicatesConfirmed')?.checked;
 existingApprovalSignature=fingerprint;
 const area=$('#existingDuplicateReview');
 if(area)area.innerHTML=overlaps.length?`<p class="help">⚠ 登録済みの買い目と ${overlaps.length}点が重複しています（${overlaps.slice(0,3).map(l=>esc(l.type)+' '+l.numbers.join('－')).join('、')}${overlaps.length>3?' ほか':''}）。購入履歴は消去・合算しません。</p><label class="checklabel"><input id="existingDuplicatesConfirmed" type="checkbox" ${accepted?'checked':''}>別購入として記録することを確認した</label>`:'';
 if($('#reviewMore'))$('#reviewMore').onclick=()=>{reviewVisible+=50;updateDraftTotals();};
 if(!$('#entryQuickDashboard')?.hidden){
  const amount=draft.reduce((n,l)=>n+l.stake,0),incomplete=draft.filter(l=>l.status==='pending').length,invalid=draft.some(l=>!Number.isFinite(l.payout)||!Number.isFinite(l.refund));
  const received=draft.reduce((n,l)=>n+(Number.isFinite(l.payout)?l.payout:0),0),refunded=draft.reduce((n,l)=>n+(Number.isFinite(l.refund)?l.refund:0),0),complete=draft.length>0&&!incomplete&&!invalid;
  const displayProfit=complete?signed(received+refunded-amount):'—';
  $('#quickSnapshot').innerHTML=`${metric('購入',yen(amount))}${metric('払戻・返還',yen(received+refunded))}${metric('収支',displayProfit)}`;
  $('#quickStatus').textContent=!draft.length?'買い目なし':invalid?'払戻未入力':incomplete?'結果未入力 '+incomplete+'点':'結果入力済み';
  $('#quickLineTitle').textContent='購入した買い目 '+draft.length+'点を確認';
  $('#quickLines').innerHTML=draft.slice(0,12).map(l=>`<div class="quick-line"><span>${esc(l.type)} ${l.numbers.join(['馬単','三連単'].includes(l.type)?'→':'－')}</span><strong>${yen(l.stake)}</strong></div>`).join('')+(draft.length>12?`<small>ほか ${draft.length-12}点。全件は「買い目を追加」から確認できます。</small>`:'');
 }
 if(dirty)scheduleEntryDraft();
}
function renderDraft(){
 const n=draft.length,total=draft.reduce((a,l)=>a+l.stake,0),visible=draft.slice(0,draftVisible);
 const format=l=>l.numbers.join(['馬単','三連単'].includes(l.type)?'→':'－');
 $('#draft').innerHTML=`<p class="entry-total">${n}点 / 合計 ${yen(total)}</p>
 ${n>1?`<details class="bet-bulk"><summary>一括で同じ金額にする</summary><div class="bet-bulk-form"><label>1点の購入額<input id="bulkAmount" type="number" min="100" step="100" inputmode="numeric" value="100"></label><button type="button" class="quiet" id="bulkApply">全点に適用</button></div></details>`:''}
 <div class="bet-slip-rows">${visible.map((l,i)=>`<div class="bet-slip-row line">
 <span class="bet-slip-name"><small>${l.type} · ${l.purchaseMode?({normal:'通常',box:'BOX',flow:'流し',formation:'フォーメーション'}[l.purchaseMode]||'不明'):'旧記録（不明）'}</small><b>${format(l)}</b>${l.status!=='pending'?'<small>確定済み</small>':''}</span>
 <label class="bet-slip-amount"><span class="sr-only">買い目${i+1}の購入金額</span><input data-amount="${i}" aria-label="買い目${i+1}の購入金額" required type="number" step="100" min="100" value="${l.stake}" inputmode="numeric"></label>
 <button type="button" class="danger bet-slip-remove" data-remove="${i}" aria-label="買い目${i+1}を削除">×</button></div>`).join('')}</div>
 ${n>visible.length?`<button type="button" class="quiet full" id="draftMore">さらに表示（残り ${n-visible.length}点）</button>`:''}`;
 document.querySelectorAll('[data-remove]').forEach(b=>b.onclick=()=>{draft.splice(Number(b.dataset.remove),1);dirty=true;renderDraft();});
 document.querySelectorAll('[data-amount]').forEach(el=>el.onchange=guard(()=>{
  const index=Number(el.dataset.amount),amount=money(Number(el.value),true);
  const totalAfter=draft.reduce((n,l,i)=>n+(i===index?amount:l.stake),0);
  money(totalAfter);draft[index].stake=amount;if(entryResultsEditor)entryResultsEditor.render(draft);dirty=true;updateDraftTotals();
 }));
 if($('#bulkApply'))$('#bulkApply').onclick=guard(()=>{
  const amount=money(Number($('#bulkAmount').value),true);money(amount*draft.length);
  draft.forEach(l=>l.stake=amount);dirty=true;renderDraft();
 });
 if($('#draftMore'))$('#draftMore').onclick=()=>{draftVisible+=150;renderDraft();};
 entryResultsEditor?.render(draft);
 fastResultsEditor?.render(draft);
 updateDraftTotals();
}
function history(){
 if(window.__UMALOG_ENTRY_CLASSIC__===true)return historyClassic();
 app.innerHTML=`<h1>購入履歴</h1><section class="card history-compact"><label>レースを探す<input id="historySearch" type="search" placeholder="日付・競馬場・レース名・メモ"></label><div class="filter"><label>競馬場<select id="vf"><option value="">全場</option>${opts(VENUES,'')}</select></label><label>券種<select id="tf"><option value="">全券種</option>${opts(TYPES,'')}</select></label><label>結果<select id="sf"><option value="">すべて</option><option value="hit">的中あり</option><option value="miss">不的中</option><option value="pending">未入力</option><option value="void">全額返還</option></select></label></div><p id="historyCount" class="help"></p><div id="historyList"></div><button id="historyMore" type="button" class="quiet full" hidden>さらに表示</button></section>`;
 let shown=50;
 const update=()=>{
  const q=$('#historySearch').value.trim(),venue=$('#vf').value,type=$('#tf').value,status=$('#sf').value;
  const list=raceHistoryRows(data).map(item=>{
   const filtered=item.tickets.filter(t=>{
    const lines=data.lines.filter(l=>l.ticketId===t.id),s=summarize(lines);
    return (!type||t.type===type)&&(!status||(status==='hit'&&lines.some(l=>l.payout>0))||(status==='pending'&&s.pendingCount>0)||(status==='miss'&&!s.pendingCount&&s.lineCount>0&&!s.lineHits)||(status==='void'&&lines.length>0&&lines.every(l=>l.status==='void')));
   });
   return {...item,tickets:filtered};
  }).filter(item=>item.tickets.length&&(!venue||item.race.venue===venue)&&matchesRaceQuery(item,q));
  $('#historyCount').textContent=`${list.length}レースを表示（券種ごとに開いて確認できます）`;
  $('#historyList').innerHTML=list.slice(0,shown).map(item=>{
   const {race,tickets}=item,ids=new Set(tickets.map(t=>t.id)),lines=item.lines.filter(l=>ids.has(l.ticketId)),stat=summarize(lines,[race],tickets);
   return `<section class="history-race"><div class="row"><div><small>${esc(race.date)} · ${esc(race.venue)} ${race.number}R</small><h3>${esc(race.name||race.venue+' '+race.number+'R')}</h3></div><strong class="${stat.profit<0?'negative':'positive'}">${stat.settledCount?signed(stat.profit):'—'}</strong></div><p class="help">購入 ${yen(lines.reduce((n,l)=>n+l.stake,0))} · 払戻 ${yen(stat.payout)} · 返還 ${yen(stat.refund)} · ${tickets.length}券種</p>
   <details class="history-bet-details"><summary>券種・買い目を確認する</summary>${tickets.map(t=>{
    const ls=lines.filter(l=>l.ticketId===t.id),v=summarize(ls);
    return `<div class="history-ticket"><div class="row"><b>${esc(t.type)} · ${ls.length}点</b><span class="${v.profit<0?'negative':'positive'}">${v.settledCount?signed(v.profit):'—'}</span></div><div class="history-ticket-actions"><button type="button" class="quiet" data-detail="${esc(t.id)}">券種の詳細</button></div><details><summary>各買い目の訂正</summary>${ls.slice(0,30).map(l=>`<div class="day-edit-row"><span>${l.numbers.join(['馬単','三連単'].includes(t.type)?'→':'－')}</span><small>購入 ${yen(l.stake)} / 払戻 ${yen(l.payout)}</small><button type="button" class="quiet" data-quick-edit="${esc(l.id)}">訂正</button></div>`).join('')}${ls.length>30?'<p class="help">残りの買い目は券種の詳細から確認できます。</p>':''}</details></div>`;
   }).join('')}</details></section>`;
  }).join('')||'<p class="empty">該当する記録がありません。</p>';
  $('#historyMore').hidden=list.length<=shown;
  bindDetails();bindQuickEdits(()=>history());
 };
 $('#historyMore').onclick=()=>{shown+=50;update();};
 ['vf','tf','sf'].forEach(id=>$('#'+id).onchange=()=>{shown=50;update();});
 $('#historySearch').oninput=()=>{shown=50;update();};
 update();
}
function historyClassic(){app.innerHTML=`<h1>購入履歴</h1><section class="card"><label>記録を探す<input id="historySearch" type="search" placeholder="日付・レース名・競馬場"></label><div class="filter"><label>競馬場<select id="vf"><option value="">全場</option>${opts(VENUES,'')}</select></label><label>券種<select id="tf"><option value="">全券種</option>${opts(TYPES,'')}</select></label><label>結果<select id="sf"><option value="">すべて</option><option value="hit">的中あり</option><option value="miss">不的中</option><option value="pending">結果待ち</option><option value="void">全額返還のみ</option></select></label></div><div id="historyList"></div></section>`;const update=()=>{const list=sortedTickets().filter(t=>{const {r,ls,s}=ticketInfo(t),st=$('#sf').value,q=$('#historySearch').value.trim();return (!q||`${r.date} ${r.name} ${r.venue}`.includes(q))&&(!$('#vf').value||r.venue===$('#vf').value)&&(!$('#tf').value||t.type===$('#tf').value)&&(!st||(st==='hit'&&ls.some(l=>l.payout>0))||(st==='pending'&&s.pendingCount>0)||(st==='miss'&&!s.pendingCount&&s.lineCount>0&&!s.lineHits)||(st==='void'&&!s.pendingCount&&s.lineCount===0));});$('#historyList').innerHTML=list.map(ticketCard).join('')||'<p class="empty">該当する記録がありません。</p>';bindDetails();};['vf','tf','sf'].forEach(id=>$('#'+id).onchange=update);$('#historySearch').oninput=update;update();}
function detail(id){const t=data.tickets.find(t=>t.id===id);check(t,'記録が見つかりません。');const {r,ls,s}=ticketInfo(t);app.innerHTML=`<a href="#history">← 履歴に戻る</a><h1>${r.venue} ${r.number}R <span class="tag">${t.type}</span></h1><section class="card"><small>${r.date}</small><h2>${esc(r.name||'名称未取得')}</h2><p class="help">${esc(raceDescription(r,effectiveCatalog()))}</p><p>${t.kind==='advance'?'旧形式の事前登録（履歴保護）':'購入した馬券の記録'}<br><small>記録時刻（端末申告・証明ではありません）：${esc(new Date(t.createdAt).toLocaleString('ja-JP',{timeZone:'Asia/Tokyo'}))}</small></p><p style="white-space:pre-wrap">${esc(t.memo||'メモなし')}</p><div class="row"><button id="edit" class="quiet">記録を編集</button><button id="delete" class="danger">記録を削除</button></div></section><section class="card race-podium"><h2>3着以内の馬番（任意）</h2><div class="podium-fields">${['1着','2着','3着'].map((label,i)=>`<label>${label}<select id="podium${i+1}"><option value="">—</option>${Array.from({length:18},(_,x)=>`<option value="${x+1}" ${r.podium?.[i]===x+1?'selected':''}>${x+1}番</option>`).join('')}</select></label>`).join('')}</div></section><section class="card detail-corrections"><h2>買い目ごとに訂正</h2><p class="help">購入額・的中金額・返還金を、該当する1点だけ訂正できます。</p>${ls.slice(0,30).map(l=>`<div class="day-edit-row"><span>${l.numbers.join(['馬単','三連単'].includes(t.type)?'→':'－')}</span><small>購入 ${yen(l.stake)} / 払戻 ${yen(l.payout)} / 返還 ${yen(l.refund)}</small><button type="button" class="quiet" data-quick-edit="${esc(l.id)}">訂正</button></div>`).join('')}${ls.length>30?'<p class="help">31点目以降は以下の個別入力・訂正を使用してください。</p>':''}</section><div id="batchResults"></div><details id="individualResults" ${ls.length<=10?'open':''}><summary>この券種を個別入力・訂正（${ls.length}点）</summary><form id="settlement"></form></details>`;
 bindQuickEdits(()=>detail(id));$('#edit').onclick=()=>location.hash='edit/'+id;$('#delete').onclick=guard(async()=>{if(confirm('この券種の記録と買い目を削除します。収支を再計算します。獲得済み育成EXPは保持します。よろしいですか？')){await commit(removeTicket(clone(data),id));location.hash='history';notify('削除しました。');}});
 const getPodium=()=>validatePodium(['podium1','podium2','podium3'].map(k=>$('#'+k).value));
 mountRaceBatch($('#batchResults'),{getData:()=>data,raceId:r.id,getPodium,onDirty:()=>dirty=true,guard,
  onSave:async(updates,podium)=>{
   const next=clone(data),race=next.races.find(x=>x.id===r.id);
   check(race,'レース情報が見つかりません。');
   const types=new Set(next.tickets.filter(x=>x.raceId===r.id).map(x=>x.id));
   for(const row of updates){const line=next.lines.find(l=>l.id===row.id);
    check(line&&types.has(line.ticketId)&&line.status==='pending','保存済みの結果は上書きできません。もう一度確認してください。');
    Object.assign(line,{status:row.status,payout:row.payout,refund:row.refund});
   }
   race.podium=podium;await commit(next);detail(id);notify(updates.length+'点の結果を保存しました。');
  }});
 ['podium1','podium2','podium3'].forEach(k=>$('#'+k).addEventListener('change',()=>dirty=true));mountResults($('#settlement'),ls,{guard,notify,onDirty:()=>dirty=true,save:async rows=>{const podium=validatePodium(['podium1','podium2','podium3'].map(k=>$('#'+k).value));const next=clone(data);const race=next.races.find(r=>r.id===t.raceId);if(podium.some(n=>n!==null))race.podium=podium;else delete race.podium;for(const row of rows)Object.assign(next.lines.find(l=>l.id===row.id),row);await commit(next);detail(id);notify('結果を保存しました。');}});}
function table(rows){return `<div class="table-wrap"><table><thead><tr><th>区分</th><th>購入</th><th>払戻・返還</th><th>収支</th><th>回収率</th><th>買い目的中率</th></tr></thead><tbody>${rows.map(([k,s])=>`<tr><td>${esc(k)}</td><td>${yen(s.purchase)}</td><td>${yen(s.payout+s.refund)}</td><td class="${s.profit<0?'negative':'positive'}">${s.settledCount?signed(s.profit):'—'}</td><td>${rate(s.returnRate)}</td><td>${rate(s.lineRate)}</td></tr>`).join('')}</tbody></table></div>`;}
function chart(rows){const max=Math.max(1,...rows.map(([,s])=>Math.abs(s.profit)));return rows.map(([k,s])=>`<div class="chart-row"><span>${esc(k)}</span><div class="bar-track diverging"><div class="bar ${s.profit<0?'loss':''}" style="left:${s.profit<0?50-Math.abs(s.profit)/max*50:50}%;width:${Math.abs(s.profit)/max*50}%"></div></div><strong class="${s.profit<0?'negative':'positive'}">${s.settledCount?signed(s.profit):'—'}</strong></div>`).join('');}
function analysisLedger(){
 const period=analysisRange==='year'?analysisYear:analysisRange==='month'?analysisMonth:null;
 const races=data.races.filter(r=>(!period||r.date.startsWith(period))&&(!analysisVenue||r.venue===analysisVenue));
 const raceIds=new Set(races.map(r=>r.id));
 const tickets=data.tickets.filter(t=>raceIds.has(t.raceId)&&(!analysisType||t.type===analysisType));
 const ticketIds=new Set(tickets.map(t=>t.id)),usedRaceIds=new Set(tickets.map(t=>t.raceId));
 return {...data,races:races.filter(r=>usedRaceIds.has(r.id)),tickets,lines:data.lines.filter(l=>ticketIds.has(l.ticketId))};
}
function analysis(){const source=analysisLedger(),s=aggregate(source),insights=periodInsights(source),matrix=typeVenueMatrix(source),group=len=>[...new Set(source.races.map(r=>r.date.slice(0,len)))].sort().reverse().map(k=>[k,aggregate(source,r=>r.date.startsWith(k))]);const scopeLabel=[analysisRange==='all'?'全期間':analysisRange==='year'?analysisYear+'年':analysisMonth,analysisVenue||'全場',analysisType||'全券種'].join('・');const byType=TYPES.map(type=>{const ts=source.tickets.filter(t=>t.type===type),ids=new Set(ts.map(t=>t.id));return [type,summarize(source.lines.filter(l=>ids.has(l.ticketId)),source.races,ts)];});app.innerHTML=`<h1>成績分析</h1><div class="analysis-jumps" role="group" aria-label="分析項目"><button class="quiet" type="button" data-analysis-jump="analysisBasics">基本成績</button><button class="quiet" type="button" data-analysis-jump="analysisMatrix">競馬場×券種</button><button class="quiet" type="button" data-analysis-jump="analysisTrends">推移と傾向</button></div><section class="card analysis-filter-panel"><h2>分析条件</h2><div class="analysis-controls"><label>期間<select id="analysisRange"><option value="all" ${analysisRange==='all'?'selected':''}>全期間</option><option value="year" ${analysisRange==='year'?'selected':''}>年間</option><option value="month" ${analysisRange==='month'?'selected':''}>月間</option></select></label><label id="analysisYearField" ${analysisRange==='year'?'':'hidden'}>対象年<input id="analysisYear" type="number" min="2000" max="2199" step="1" inputmode="numeric" value="${analysisYear}"></label><label id="analysisMonthField" ${analysisRange==='month'?'':'hidden'}>対象月<input id="analysisMonth" type="month" min="2000-01" max="2199-12" value="${analysisMonth}"></label><label>競馬場<select id="analysisVenue"><option value="">すべて</option>${opts(VENUES,analysisVenue)}</select></label><label>券種<select id="analysisType"><option value="">すべて</option>${opts(TYPES,analysisType)}</select></label></div></section><section class="card" id="analysisBasics"><h2>基本成績</h2><small>対象の確定収支</small><div class="balance ${s.profit<0?'negative':'positive'}">${s.settledCount?signed(s.profit):'—'}</div><div class="metrics">${metric('回収率',rate(s.returnRate))}${metric('買い目の的中率',rate(s.lineRate))}</div><p class="help">確定購入 ${yen(s.purchase)} ／ 払戻 ${yen(s.payout)} ／ 返還 ${yen(s.refund)} ／ 未入力 ${s.pendingCount}点</p><details><summary>集計の詳細・母数</summary>${totals(s)}<div class="divider metrics">${metric('レース単位的中率',rate(s.raceRate))}${metric('的中 / 確定済み有効レース',`${s.raceHits} / ${s.raceCount}`)}</div><p class="help muted">未入力 ${s.pendingCount}点・${yen(s.pendingStake)} は除外。全額返還は的中率の分母から除外。レース単位は全買い目確定後に集計します。</p></details></section>${!source.lines.length?'<section class="card empty">まだ集計できる記録がありません。<br>「—」は未計算です。</section>':''}${analysisInsightPanel(insights)}${budgetWidget(data,analysisRange==='month'?analysisMonth:jstToday().slice(0,7))}${monthlyReviewPanel(data,analysisRange==='month'?analysisMonth:jstToday().slice(0,7))}<section class="card" id="analysisTrends"><h2>月別収支</h2>${chart(group(7))||'<p class="empty">データなし</p>'}<details><summary>月別の詳細</summary>${table(group(7))}</details></section>${styleView(source,effectiveCatalog().records,scopeLabel)}<section class="card"><details><summary>日別収支</summary>${table(group(10))}</details></section><section class="card"><details><summary>年間収支</summary>${table(group(4))}</details></section><section class="card"><details><summary>券種別成績の詳細</summary>${table(byType)}</details></section><section class="card" id="analysisVenues"><h2>競馬場別収支</h2>${chart(VENUES.map(v=>[v,aggregate(source,r=>r.venue===v)]))}<details><summary>競馬場別成績の詳細</summary>${table(VENUES.map(v=>[v,aggregate(source,r=>r.venue===v)]))}</details></section><section class="card analysis-cross" id="analysisMatrix"><details><summary>競馬場 × 券種の記録を比較</summary><p class="help">確定済み買い目の収支。購入数が少ない場合、偶然の影響が大きいため優劣の判定には使えません。未入力は収支から除外します。</p><div class="table-wrap"><table><caption>競馬場別・券種別の確定収支（円）</caption><thead><tr><th scope="col">競馬場</th>${TYPES.map(t=>`<th scope="col">${esc(t)}</th>`).join('')}</tr></thead><tbody>${matrix.map(row=>`<tr><th scope="row">${esc(row.venue)}</th>${row.types.map(cell=>`<td title="${cell.lines}点購入・${cell.pending}点未入力・${cell.description}" class="${cell.profit<0?'negative':'positive'}">${cell.settledCount?signed(cell.profit):'—'}</td>`).join('')}</tr>`).join('')}</tbody></table></div></details></section>`;
 app.querySelectorAll('[data-analysis-jump]').forEach(button=>button.onclick=()=>{const dest=app.querySelector('#'+button.dataset.analysisJump);if(!dest)return;if(dest.id==='analysisMatrix')dest.querySelector('details').open=true;dest.scrollIntoView({block:'start',behavior:'auto'});});
 $('#analysisRange').onchange=e=>{analysisRange=e.target.value;analysis();};
 $('#analysisYear').onchange=e=>{if(/^(20\d\d|21\d\d)$/.test(e.target.value)){analysisYear=e.target.value;analysis();}else e.target.value=analysisYear;};
 $('#analysisMonth').onchange=e=>{if(/^\d{4}-(0[1-9]|1[0-2])$/.test(e.target.value)){analysisMonth=e.target.value;analysis();}else e.target.value=analysisMonth;};
 $('#analysisVenue').onchange=e=>{analysisVenue=e.target.value;analysis();};
 $('#analysisType').onchange=e=>{analysisType=e.target.value;analysis();};
}
function growthScreen(){data=recalculate(data);const c=data.character,g=data.growthV2,w=weekOf(jstToday()),previous=addDays(w,-7),stats=aggregate(data),season=['winter','winter','spring','spring','spring','summer','summer','summer','autumn','autumn','autumn','winter'][Number(jstToday().slice(5,7))-1];app.innerHTML=`<h1>育成</h1><section class="card nursery" data-season="${season}"><button id="petCare" class="pet-touch" aria-label="キャラクターをなでる">${pet()}</button><h2>${esc(data.settings.name)}</h2><p id="petLevel">Lv.${c.level} · ${STAGE_NAMES[c.stage]}</p><progress aria-label="次のレベルへの成長" max="100" value="${c.exp%100}"></progress><small class="wide-number">${c.exp} EXP</small><p id="petBond">なつき度 ${g.bond} / 100</p><meter id="bondMeter" aria-labelledby="petBond" min="0" max="100" value="${g.bond}"></meter><button id="care" class="quiet">なでる</button><button id="petTips" class="quiet pet-tips" type="button">${esc(data.settings.name)}に豆知識を聞く</button><p id="petReaction" class="help" role="status">${g.careDay===jstToday()?g.careCount:0} / 3回 お世話済み</p></section><details class="growth-optional"><summary>成長のご褒美・称号を見る</summary>${rewardPanel(data)}</details><section class="card"><details id="book"><summary>券種図鑑 · ${g.learned.length} / 8</summary>${TYPES.map(type=>`<details><summary>${type}${g.learned.includes(type)?' ✓':''}</summary><p>${BOOK[type]}</p><button class="quiet" data-learn="${type}" ${g.learned.includes(type)?'disabled':''}>読んだ · 初回10EXP</button></details>`).join('')}<p class="help">購入せずに学べます。払戻は公式発表を確認してください。</p></details></section><section class="card"><details><summary>実績帳</summary><p>的中買い目 ${stats.lineHits}回 / 記録 ${data.races.length}レース<br>最高払戻 ${yen(data.lines.reduce((n,l)=>Math.max(n,l.payout),0))}（1買い目）<br>回収率 ${rate(stats.returnRate)}</p><p class="help">未入力分は成績に含めません。実績によるEXP加算はありません。</p>${TYPES.map(type=>{const ids=new Set(data.tickets.filter(t=>t.type===type).map(t=>t.id)),s=summarize(data.lines.filter(l=>ids.has(l.ticketId)));return `<p>${type}：的中 ${s.lineHits} / ${s.lineCount}点・回収率 ${rate(s.returnRate)}</p>`;}).join('')}</details></section><section class="card"><details id="reviewDetails"><summary>週間振り返り</summary><p class="help">終了した週に1回20EXP。競馬をしなかった週も記録できます。</p><form id="reviewForm"><label>対象週<input type="date" id="reviewWeek" required value="${previous}" max="${previous}" min="2000-01-03"></label><p id="reviewStatus" class="help"></p><label>振り返り<textarea id="reviewText" required maxlength="4000"></textarea></label><button type="submit">振り返りを保存</button></form></details></section><section class="card"><details><summary>名前・成長のしくみ</summary><form id="petNameForm"><label>名前<input id="petName" maxlength="40" required value="${esc(data.settings.name)}"></label><button type="submit">名前を保存</button></form><p class="help">日本時間で1日3EXP。閉じていた期間は最大30日分まで反映します。なでると1日3回まで各2EXP・なつき度+1。何度でも反応します。端末時計を戻した日は加算を止めます。時計の操作を完全には防止できません。</p><p id="petBreakdown">引き継ぎ ${g.legacyExp} / 時間 ${g.dayExp} / お世話 ${g.careExp} / 学習 ${g.learned.length*10} / 振り返り ${g.reviewExp} EXP</p></details>${g.clockWarning?'<p class="help">時刻の変化を検出しました。成長の加算を制限しています。</p>':''}</section>`;
 $('#petNameForm').oninput=()=>dirty=true;$('#petNameForm').onsubmit=guard(async e=>{e.preventDefault();const next=clone(data);next.settings.name=$('#petName').value.trim();await commit(next);growthScreen();});
 const care=guard(async()=>{if(busy)return;const button=$('#petCare'),beforeRewards=new Set(growthRewards(data).filter(x=>x.unlocked).map(x=>x.id));await commit(grow(data,'care'));if(!button.isConnected)return;const c=data.character,g=data.growthV2;button.innerHTML=pet();$('#petLevel').textContent=`Lv.${c.level} · ${STAGE_NAMES[c.stage]}`;$('.nursery progress').value=c.exp%100;$('.nursery .wide-number').textContent=`${c.exp} EXP`;$('#petBond').textContent=`なつき度 ${g.bond} / 100`;$('#bondMeter').value=g.bond;$('#petBreakdown').textContent=`引き継ぎ ${g.legacyExp} / 時間 ${g.dayExp} / お世話 ${g.careExp} / 学習 ${g.learned.length*10} / 振り返り ${g.reviewExp} EXP`;$('#petReaction').textContent=(g.bond>=30?'そばにいると、ほっとするみたい。':c.stage===0?'ころん、と揺れた。':'うれしそうに、こちらを見ている。')+` ${g.careDay===jstToday()?g.careCount:0} / 3回 お世話済み`;$('#growthRewards').innerHTML=rewardItems(data);
 const unlock=growthRewards(data).find(x=>x.unlocked&&!beforeRewards.has(x.id));
 if(unlock){const panel=$('.reward-panel');panel.classList.add('reward-celebrate');$('#petReaction').textContent='🎉 '+unlock.name+'を獲得！ '+$('#petReaction').textContent;notify('ご褒美「'+unlock.name+'」を獲得しました。');}
 button.classList.remove('react');void button.offsetWidth;button.classList.add('react');});$('#care').onclick=care;$('#petCare').onclick=care;$('#petTips').onclick=e=>openTips(e.currentTarget,data.settings.name);
 document.querySelectorAll('[data-learn]').forEach(b=>b.onclick=guard(async()=>{await commit(grow(data,'learn',b.dataset.learn));growthScreen();$('#book').open=true;}));
 const reviewLoad=()=>{const v=$('#reviewWeek').value;if(!v)return;$('#reviewWeek').value=weekOf(v);const found=data.reviews.find(r=>r.week===$('#reviewWeek').value);$('#reviewText').value=found?.text||'';$('#reviewStatus').textContent=found?'記録済み。文章を訂正できます（EXPの追加付与なし）。':'未記録の週です。';};$('#reviewWeek').onchange=reviewLoad;reviewLoad();$('#reviewForm').oninput=()=>dirty=true;$('#reviewForm').onsubmit=guard(async e=>{e.preventDefault();const week=weekOf($('#reviewWeek').value),text=$('#reviewText').value.trim();check(week<w,'今週の終了後に記録できます。');check(text,'振り返りを入力してください。');const next=clone(data),r=next.reviews.find(r=>r.week===week);if(r)r.text=text;else next.reviews.push({id:uid(),week,text});await commit(grow(next,'review',week));growthScreen();$('#reviewDetails').open=true;notify('振り返りを保存しました。');});}
function settings(){app.innerHTML=`<h1>設定・データ管理</h1><section class="card"><h2>同梱重賞</h2><p>2026年 32件 / 2027年 6件</p><p class="help">2026年10月17日以降の重賞を年末まで掲載。2027年は一部予定のみで、未発表のレース番号は自動入力しません。個人取り込みデータの削除後も同梱情報は残ります。</p></section><div id="calendarManager"></div>${catalogPanel()}<section class="card"><form id="settingsForm"><label class="checklabel"><input id="motion" type="checkbox" ${data.settings.motion?'checked':''}>画面の動きを有効にする</label><button type="submit">設定を保存</button></form></section><section class="card" id="budgetSettings"><h2>月間購入予算（任意）</h2><p class="help">買った馬券の金額を月単位で確認するための設定です。払戻や育成には影響しません。</p><form id="budgetForm"><label>対象月<input id="budgetMonth" type="month" required min="2000-01" max="2199-12" value="${jstToday().slice(0,7)}"></label><label>購入予算（円）<input id="budgetAmount" type="number" min="0" max="1000000000000" step="1" inputmode="numeric" value="${data.settings.monthlyBudgets?.[jstToday().slice(0,7)]||0}"></label><p class="help" id="budgetCurrent"></p><button class="quiet full" type="submit">この月の予算を保存（0円で解除）</button></form></section><section class="card"><h2>バックアップ</h2><div id="backupSummary" class="backup-summary"><div class="day-metrics">${metric('レース',String(data.races.length)+'件')}${metric('購入記録',String(data.tickets.length)+'件')}${metric('買い目',String(data.lines.length)+'点')}</div><p id="lastLocalSave" class="help">端末内の保存日時を確認中</p><p id="lastBackupConfirmed" class="help" role="status">外部バックアップの確認状況を読み込み中</p><button id="backupConfirmed" type="button" class="quiet full">保存先でJSONファイルを確認済みにする</button></div><p class="help">データはこのブラウザ・端末内に保存されます。ブラウザデータの消去や端末故障に備えて、JSONファイルを定期的に保存してください。端末間の自動同期はありません。</p><button id="export" class="full">収支・育成を書き出す（JSON）</button><button id="exportCsv" class="quiet full" type="button">買い目の明細をCSVで出力</button><p class="help">CSVは表計算ソフトで確認するためのものです。復元にはJSONバックアップを使ってください。</p><p id="storageInfo" class="help muted"></p><button id="persist" class="quiet">永続ストレージをリクエスト</button></section><section class="card"><h2>バックアップから復元</h2><p class="help">全件置換です。先に現在のデータを書き出してください。読み込み後に内容を確認し、もう一度確認してから置換します。</p><label>JSONファイル<input type="file" id="import" accept=".json,application/json"></label><div id="restorePreview"></div></section><section class="card"><h2>このアプリについて</h2><p class="help">うまログ（仮）v1.3.0-rc.2（dev.22〜30：画面役割整理・ホーム簡素化）<br>対象：JRA中央競馬10場・8券種。レース情報や結果の自動取得なし。記録は自己申告で、購入の証明にはなりません。<br>同一端末で複数タブを同時編集しないでください。保存は最後に保存した画面の内容が優先されます。</p></section>`;
 loadMainSaveTime().then(when=>{const el=$('#lastLocalSave');if(el)el.textContent='端末内で最後に保存した日時：'+(when?new Date(when).toLocaleString('ja-JP',{timeZone:'Asia/Tokyo'}):'不明（旧バージョンの記録）')+'。外部バックアップの保存日時ではありません。';}).catch(()=>{const el=$('#lastLocalSave');if(el)el.textContent='端末内の保存日時を取得できませんでした。';});
 const updateBackupCheck=()=>loadBackupConfirmation().then(time=>{
  const el=$('#lastBackupConfirmed');if(!el)return;
  const days=time?Math.floor((Date.now()-new Date(time).getTime())/86400000):null;
  el.textContent=days===null?'外部バックアップは未確認です。':days>=30?'最後の確認から約'+days+'日経過しています。バックアップの保存先を確認してください。':'外部バックアップの保存先を確認した日：'+new Date(time).toLocaleDateString('ja-JP',{timeZone:'Asia/Tokyo'});
 }).catch(()=>{const el=$('#lastBackupConfirmed');if(el)el.textContent='バックアップ確認日時を取得できませんでした。';});
 updateBackupCheck();
 $('#backupConfirmed').onclick=guard(async()=>{
  if(!confirm('JSONファイルが「ファイル」アプリなどの保存先に存在し、開けることを確認しましたか？'))return;
  await confirmBackupStored();await updateBackupCheck();notify('ファイルの保存先を確認した日時を記録しました。');
 });
 const mountManager=()=>mountCalendarManager($('#calendarManager'),calendarState,{warning:calendarWarning,onDirty:v=>calendarDirty=v,onSave:s=>{calendarState=s;mountManager();}});mountManager();bindCatalog();
 $('#settingsForm').oninput=()=>dirty=true;
 const refreshBudget=()=>{
  const month=$('#budgetMonth').value;
  if(!/^(20\d\d|21\d\d)-(0[1-9]|1[0-2])$/.test(month))return;
  const b=budgetStatus(data,month);
  $('#budgetAmount').value=b.budget||0;
  $('#budgetCurrent').textContent=`現在の購入記録 ${yen(b.purchase)}${b.pending?'（未入力分を含む）':''}`;
 };
 $('#budgetMonth').onchange=refreshBudget;refreshBudget();
 $('#budgetForm').oninput=()=>dirty=true;
 $('#budgetForm').onsubmit=guard(async e=>{
  e.preventDefault();check($('#budgetMonth').validity.valid,'予算の対象月を確認してください。');
  const raw=$('#budgetAmount').value.trim();check(/^\d+$/.test(raw),'購入予算は整数で入力してください。');
  const month=$('#budgetMonth').value,amount=Number(raw);
  const next=setMonthlyBudget(data,month,amount);await commit(next);settings();$('#budgetMonth').value=month;refreshBudget();notify(amount?'月間購入予算を保存しました。':'月間購入予算を解除しました。');
 });
 $('#settingsForm').onsubmit=guard(async e=>{e.preventDefault();const next=clone(data);next.settings.motion=$('#motion').checked;await commit(next);document.body.classList.toggle('no-motion',!data.settings.motion);notify('設定を保存しました。');});
 $('#export').onclick=guard(async()=>{const content=JSON.stringify(recalculate(data),null,2),blob=new Blob([content],{type:'application/json'}),name='umalog-backup-'+jstToday()+'.json';const file=new File([blob],name,{type:'application/json'});if(navigator.canShare&&navigator.canShare({files:[file]})){try{await navigator.share({files:[file],title:'うまログ バックアップ'});return;}catch(e){if(e.name==='AbortError')return;}}const a=document.createElement('a'),url=URL.createObjectURL(blob);a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),60000);notify('JSON書き出しを開始しました。ファイルアプリなどへの保存を確認してください。');});
 $('#exportCsv').onclick=guard(async()=>{
  const content=ledgerCSV(data),name='umalog-ledger-'+jstToday()+'.csv',blob=new Blob([content],{type:'text/csv;charset=utf-8'}),file=new File([blob],name,{type:'text/csv'});
  if(navigator.canShare&&navigator.canShare({files:[file]})){try{await navigator.share({files:[file],title:'うまログ 明細CSV'});return;}catch(error){if(error.name==='AbortError')return;}}
  const link=document.createElement('a'),url=URL.createObjectURL(blob);link.href=url;link.download=name;link.click();
  setTimeout(()=>URL.revokeObjectURL(url),60000);notify('CSVを保存してください。復元にはJSONを使用します。');
 });
 $('#persist').onclick=guard(async()=>{if(!navigator.storage?.persist){notify('このブラウザは永続化リクエストに対応していません。');return;}notify(await navigator.storage.persist()?'永続ストレージが許可されました。':'永続化は許可されませんでした。バックアップを続けてください。');});
 if(navigator.storage?.persisted)navigator.storage.persisted().then(v=>{if($('#storageInfo'))$('#storageInfo').textContent=v?'永続化：許可済み（バックアップは引き続き必要です）':'永続化：未許可 / ブラウザの空き容量によって消去される可能性があります。';}).catch(()=>{});
 $('#import').onchange=guard(async e=>{restoreCandidate=null;$('#restorePreview').textContent='';const f=e.target.files[0];if(!f)return;check(f.size<=30*1024*1024,'バックアップは30MB以下にしてください。');const parsed=JSON.parse(await f.text());restoreCandidate=recalculate(migrateGrowth(validateData(parsed),new Date(),parsed.character.exp));const s=aggregate(restoreCandidate),current=aggregate(data);$('#restorePreview').innerHTML=`<div class="line"><h3>復元内容の確認</h3><p>${restoreCandidate.races.length}レース / ${restoreCandidate.tickets.length}記録 / ${restoreCandidate.lines.length}買い目<br>確定済み購入 ${yen(s.purchase)}<br>収支 ${signed(s.profit)}<br>振り返り ${restoreCandidate.reviews.length}週 / ${restoreCandidate.character.exp} EXP</p><p class="help negative">現在：${data.races.length}レース / ${data.tickets.length}記録 / ${data.lines.length}買い目 / 収支 ${signed(current.profit)}<br>復元後：${restoreCandidate.races.length}レース / ${restoreCandidate.tickets.length}記録 / ${restoreCandidate.lines.length}買い目 / 収支 ${signed(s.profit)}<br>現在のデータをすべて置換します。</p><label class="checklabel"><input type="checkbox" id="restoreAgree">現在のデータのバックアップを確認しました</label><button id="restore" class="danger full">このバックアップで全件置換</button></div>`;$('#restore').onclick=guard(async()=>{check($('#restoreAgree').checked,'バックアップ確認にチェックしてください。');if(!confirm('現在のデータを削除して、選択したバックアップで全件置換します。実行しますか？'))return;await commit(restoreCandidate,{clearAllDrafts:true});restoreCandidate=null;notify('復元が完了しました。');location.hash='home';});});}
let previousHash=location.hash||'#home';
function render(){try{document.body.classList.remove('entry-sheet-open');document.body.style.overflow='';data=recalculate(data);document.body.classList.toggle('no-motion',!data.settings.motion);const [route,id,venueParam]=(location.hash.slice(1)||'home').split('/');updateDock(route);if(route==='entry')entry(null,id?decodeURIComponent(id):null);else if(route==='entry-next'){check(validDate(id)&&VENUES.includes(decodeURIComponent(venueParam||'')),'引き継ぐ日付と競馬場が不正です。');entry();$('#date').value=id;$('#venue').value=decodeURIComponent(venueParam);$('#number').value='';$('#raceName').value='';$('#date').dispatchEvent(new Event('change'));}else if(route==='day')dayScreen(id);else if(route==='entry-date'){check(/^\d{4}-\d\d-\d\d$/.test(id||''),'日付が不正です。');entry();$('#date').value=id;$('#number').value='';$('#date').dispatchEvent(new Event('change'));}else if(route==='edit')entry(id);else if(route==='detail')detail(id);else if(route==='history')history();else if(route==='calendar')calendarScreen();else if(route==='analysis')analysis();else if(route==='growth')growthScreen();else if(route==='settings')settings();else home();window.scrollTo(0,0);}catch(e){app.innerHTML=`<div class="error">${esc(e.message)} <a href="#home">ホームへ</a></div>`;}}
window.addEventListener('hashchange',async()=>{
 if((dirty||calendarDirty)&&!confirm(entryDraftSession?'編集中の内容を下書きに保存して移動しますか？（確定済み収支には反映しません）':'未保存の入力を破棄して移動しますか？')){historyReplace(previousHash);return;}
 const session=entryDraftSession;entryDraftSession=null;
 if(session){try{await session.flush();}catch(e){console.error(e);}await session.stop();}
 dirty=false;calendarDirty=false;previousHash=location.hash;render();
});
function historyReplace(hash){window.history.replaceState(null,'',hash);}
window.addEventListener('pagehide',()=>{entryDraftSession?.flush();});
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')entryDraftSession?.flush();});
window.addEventListener('beforeunload',e=>{if(dirty||calendarDirty){entryDraftSession?.flush();e.preventDefault();e.returnValue='';}});
$('#settingsButton').onclick=()=>location.hash='settings';
async function registerSW(){if(!('serviceWorker' in navigator))return;try{let wasControlled=!!navigator.serviceWorker.controller;const reg=await navigator.serviceWorker.register('./sw.js',{scope:'./'});const offer=()=>{if(!reg.waiting)return;$('#update').hidden=false;$('#update').innerHTML='<span>新しいバージョンがあります。</span> <button id="applyUpdate">保存してから更新</button>';$('#applyUpdate').onclick=()=>{if(dirty||calendarDirty){notify('入力内容を保存してから更新してください。');return;}reg.waiting.postMessage({type:'SKIP_WAITING'});};};offer();reg.addEventListener('updatefound',()=>{const w=reg.installing;w.addEventListener('statechange',()=>{if(w.state==='installed'&&navigator.serviceWorker.controller)offer();});});let refreshing=false;navigator.serviceWorker.addEventListener('controllerchange',()=>{if(!wasControlled){wasControlled=true;return;}if(!refreshing){if(dirty||calendarDirty){notify('更新を適用しました。入力を保存後に再読み込みしてください。');return;}refreshing=true;location.reload();}});}catch(e){notify('オフライン準備に失敗しました。通信状態を確認してください。');}}
try{data=await load();data=await save(recalculate(grow(migrateGrowth(data))));try{catalog=validateCatalog((await loadCatalog())||emptyCatalog());}catch(e){catalogWarning="レース情報キャッシュを読み込めません。収支データには影響しません。";}try{calendarState=await loadCalendar();calendarState.calendar=validateCalendar(calendarState.calendar);}catch(e){calendarWarning='開催キャッシュが不正です。既存データは変更していません。';calendarState={revision:0,importedAt:null,calendar:emptyCalendar()};}render();await registerSW();}catch(e){app.innerHTML=`<h1>データを読み込めませんでした</h1><p class="error">${esc(e.message)}</p><p>ブラウザの保存設定・空き容量を確認してください。既存データは変更していません。</p><button onclick="location.reload()">再読み込み</button>`;}

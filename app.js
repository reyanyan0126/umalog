import {withMaster} from './graded-master.js';
import {mountLedgerCalendar} from './ledger-calendar.js';
import {gradedEvents,isGraded,mountGradedHome,mountGradedPicker,eventLabel,selectable} from './graded-races.js';
import {migrateGrowth,grow,BOOK,companionProgress} from './growth-v2.js';
import {emptyCalendar,validateCalendar,calendarRecords} from './calendar.js';
import {calendarHome,mountCandidates,mountCalendarManager} from './calendar-view.js';
let calendarState={revision:0,importedAt:null,calendar:emptyCalendar()},calendarWarning='',calendarDirty=false;
const effectiveCatalog=()=>({...catalog,records:calendarRecords(withMaster(calendarState.calendar),catalog.records)});
import {VENUES,TYPES,STAGE_NAMES,STAGES,uid,check,validDate,money,combination,box,validatePodium,aggregate,summarize,recalculate,validateData,removeTicket,jstToday,weekOf,addDays,raceKey,backupFreshness,backupFileName} from './core.js';
import {load,loadWithRevision,save,loadCatalog,saveCatalog,loadCalendar,loadEntryDraft,discardEntryDraft,loadMainSaveTime,loadBackupConfirmation,confirmBackupStored} from './db.js';
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
import {homeSummary,raceHistoryRows,ticketIndex,matchesRaceQuery,typeVenueMatrix} from './screen-roles.js';
import {dayLedger,existingPurchaseDuplicates,periodInsights} from './day-ledger.js';
import {growthRewards} from './growth-rewards.js';
import {companionState,companionAlbum,THEME_NAMES,OUTFIT_NAMES,OUTFIT_ICONS,stageArtwork} from './growth-companion.js';
import {ledgerInsights} from './ledger-trends.js';
import {analysisCoverage,inclusiveMonthlyRows} from './analysis-quality.js';
import {periodComparison} from './analysis-compare.js';
import {mountRaceBatch} from './batch-ui.js';
import {openTips} from './tips.js';
import {createDock} from './dock.js';
import {mountNumberPad} from './number-pad.js';
import {mountAdvancedPattern} from './advanced-picker.js';
import {stakeBreakdown,setIndividualStake,setUniformStakes,STAKE_PRESETS} from './stake-allocation.js';
import {makeSimpleEntry,combinedFinance,quickBreakdown,recentSimpleTemplates} from './simple-ledger.js';
import {selectedStakeUpdate,stakeChanges,stakeSnapshot,restoreStakeSnapshot,purchaseHistoryOverview} from './stake-workflow.js';
import {generateBets,reviewBets,recentPurchaseTemplates,copyPurchaseTemplate} from './bet-patterns.js';
const updateDock=createDock(document.querySelector('nav'));
const $=s=>document.querySelector(s),app=$('#app');
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const yen=n=>`${n.toLocaleString('ja-JP')}円`,signed=n=>(n>0?'+':'')+yen(n),rate=n=>n===null?'—':n.toFixed(1)+'％';
const opts=(list,current)=>list.map(v=>`<option value="${esc(v)}" ${String(v)===String(current)?'selected':''}>${esc(v)}</option>`).join('');
const clone=d=>JSON.parse(JSON.stringify(d));
let stakeSelectedIds=new Set(),stakeUndoHistory=[],draftVisible=150,reviewVisible=50,reviewSignature='',entryResultsEditor=null,fastResultsEditor=null,entrySheetController=null,entryDraftSession=null,entryDraftKey=null,existingApprovalSignature='';
const scheduleEntryDraft=()=>entryDraftSession?.schedule();
let ledgerRevision=0;
let data,editing=null,draft=[],month=jstToday().slice(0,7),homeRange='year',homeYear=jstToday().slice(0,4),analysisRange='all',analysisYear=jstToday().slice(0,4),analysisMonth=jstToday().slice(0,7),analysisVenue='',analysisType='',busy=false,restoreCandidate=null,dirty=false;
function notify(message){$('#notice').textContent=message;$('#notice').style.display='block';clearTimeout(notify.timer);notify.timer=setTimeout(()=>$('#notice').style.display='none',4500);}
function guard(fn){return async e=>{try{await fn(e);}catch(err){console.error(err);notify(err?.message||'処理に失敗しました。入力内容を確認して再試行してください。');}};}
async function commit(next,opts={}){check(!busy,'保存中です。');busy=true;const buttons=[...app.querySelectorAll('button[type="submit"]')].filter(b=>!b.disabled);buttons.forEach(b=>b.disabled=true);app.setAttribute('aria-busy','true');try{data=await save(next,{...opts,expectedRevision:ledgerRevision});ledgerRevision++;dirty=false;}finally{busy=false;buttons.forEach(b=>b.disabled=false);app.removeAttribute('aria-busy');}}
function metric(label,value){return `<div class="metric"><span>${label}</span><strong>${value}</strong></div>`;}
function pet(){const c=data.character;return `<img class="pet stage${c.stage}" src="${stageArtwork(c.stage)}" alt="${STAGE_NAMES[c.stage]}">`;}
function companionFigure(){
 const outfit=data.growthV2?.companion?.outfit??'none';
 return pet()+(outfit!=='none'?`<span class="companion-outfit" data-outfit="${outfit}" aria-hidden="true">${OUTFIT_ICONS[outfit]}</span>`:'');
}
function companionReact(kind){
 const button=$('#petCare');
 if(!button||!data.settings.motion||window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;
 button.removeAttribute('data-reaction');void button.offsetWidth;button.dataset.reaction=kind;
}
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
 const currentMonth=jstToday().slice(0,7),s=combinedFinance(data,{prefix:currentMonth}),receive=s.receipts;
 app.innerHTML=`<h1 class="home-minimal-title">ホーム</h1><section class="card hero home-minimal" id="homeSummary">
   <div class="row"><h2>今月の収支</h2><small>${currentMonth.replace('-','年')}月</small></div>
   <div class="home-profit ${s.profit<0?'negative':'positive'}" aria-label="今月の確定収支">${s.settledCount?signed(s.profit):'—'}</div>
   <p class="home-minimal-note">${s.settledCount?'結果確定分の収支':'今月はまだ確定した記録がありません'}</p>
   <div class="home-minimal-totals">${metric('総支出（全記録）',yen(s.recordedPurchase))}${metric('払戻・返還',yen(receive))}${metric('結果確定分の支出',yen(s.settledPurchase))}${metric('暫定収支',signed(s.tentativeNet))}</div>
   ${s.pendingCount?`<p class="help">結果未入力 ${s.pendingCount}点 · ${yen(s.pendingStake)} は確定収支に含みません。</p>`:''}
   </section>
   <a class="button accent full home-entry-cta" id="homeEntry" href="#entry">＋ 結果を記録する</a><a class="button quiet full home-quick-cta" id="homeQuickEntry" href="#quick">⚡ 金額だけで支出を記録</a>
   <p class="home-minimal-foot">詳しい成績は <a href="#analysis">分析</a> で確認できます。</p>`;
 loadEntryDraft('new').then(saved=>{
  if(!$('#homeEntry')||!saved)return;
  try{validateEntryDraft(saved);if(saved.key!=='new')return;}catch{return;}
  $('#homeEntry').textContent='入力途中の記録を再開';
 }).catch(()=>{});
}
function homeClassic(){
 const today=jstToday(),daily=aggregate(data,r=>r.date===today);
 const summary=()=>{const prefix=homeRange==='year'?homeYear:month,s=combinedFinance(data,{prefix});return `<small>${homeRange==='year'?'年間':'月間'}の確定収支（簡易・詳細合算）</small><div class="balance ${s.profit<0?'negative':'positive'}">${s.settledCount?signed(s.profit):'—'}</div><div class="metrics">${metric('総支出',yen(s.recordedPurchase))}${metric('暫定収支',signed(s.tentativeNet))}</div><details><summary>購入・払戻の内訳</summary><div class="metrics">${metric('確定支出',yen(s.settledPurchase))}${metric('払戻・返還',yen(s.receipts))}${metric('結果待ち',yen(s.pendingStake))}</div><p class="help">結果待ちの支出は確定損益に含みません。</p></details>`;};
 app.innerHTML=`<div class="page-heading"><h1>ホーム</h1><div class="home-range-controls"><div class="home-range-switch" role="group" aria-label="ホーム収支の集計期間"><button type="button" class="quiet" id="homeYearly" aria-pressed="${homeRange==='year'}">年間</button><button type="button" class="quiet" id="homeMonthly" aria-pressed="${homeRange==='month'}">月間</button></div><label id="homeYearField" ${homeRange==='month'?'hidden':''}>対象年<input id="homeYearInput" type="number" inputmode="numeric" min="2000" max="2199" step="1" value="${homeYear}"></label><label id="homeMonthField" ${homeRange==='year'?'hidden':''}>対象月<input id="month" type="month" min="2000-01" max="2199-12" value="${month}"></label></div></div><section class="card hero" id="homeSummary">${summary()}</section><section class="card home-day-link"><div><small>今日の記録 · ${today}</small><strong>${daily.settledCount?signed(daily.profit):"まだ記録なし"}</strong><a href="#day/${today}">1日分のログを見る</a></div><a class="quiet button" href="#quick">⚡ かんたん支出入力 →</a></section><section id="homeBudget">${budgetWidget(data,homeRange==='month'?month:jstToday().slice(0,7))}</section><section class="card graded-home-compact" id="gradedHome"></section>`;
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
 const day=dayLedger(data,date),combined=combinedFinance(data,{prefix:date}),stat=day.summary;
 const section=day.entries.map(({race,tickets,lines,summary})=>{
  const items=tickets.map(t=>{
   const bs=lines.filter(l=>l.ticketId===t.id),v=summarize(bs);
   const short=bs.slice(0,24).map(l=>`<div class="day-edit-row"><span>${esc(t.type)} ${l.numbers.join(['馬単','三連単'].includes(t.type)?'→':'－')}</span><small>購入 ${yen(l.stake)} / 払戻 ${yen(l.payout)} / 返還 ${yen(l.refund)}</small><button type="button" class="quiet" data-quick-edit="${esc(l.id)}">訂正</button></div>`).join('');
   return `<div class="day-ticket"><span>${esc(t.type)} · ${bs.length}点</span><strong class="${v.profit<0?'negative':'positive'}">${v.settledCount?signed(v.profit):'結果未入力'}</strong><a href="#detail/${encodeURIComponent(t.id)}">詳細</a></div><details class="day-ticket-edit"><summary>この券種の買い目を訂正する</summary>${short}${bs.length>24?'<p class="help">残りの買い目は詳細画面から訂正できます。</p>':''}</details>`;
  }).join('');
  return `<section class="card day-race"><div class="row"><div><small>${esc(race.venue)} ${race.number}R</small><h3>${esc(race.name||race.venue+' '+race.number+'R')}</h3></div><strong class="${summary.profit<0?'negative':'positive'}">${summary.settledCount?signed(summary.profit):'—'}</strong></div>${items}<a class="quiet button day-next" href="#entry-next/${date}/${encodeURIComponent(race.venue)}">同じ競馬場で次を記録 →</a></section>`;
 }).join('');
 const quick=(data.simpleEntries||[]).filter(x=>x.date===date),quickRows=quick.map(x=>`<section class="card simple-history-row"><div><small>${esc(x.venue||'競馬場未指定')} · ${esc(x.type||'券種未指定')}</small><strong>${yen(x.stake)}</strong><small>${x.status==='pending'?'結果待ち':`払戻・返還 ${yen(x.payout+x.refund)}`}</small></div><a class="quiet button" href="#quick-edit/${encodeURIComponent(x.id)}/day">編集</a></section>`).join('');
 app.innerHTML=`<a href="#calendar">← カレンダーへ</a><h1>${date} のうまログ</h1><section class="card day-summary"><div class="day-metrics">${metric('総支出',yen(combined.recordedPurchase))}${metric('確定購入',yen(combined.settledPurchase))}${metric('払戻',yen(combined.payout))}${metric('返還',yen(combined.refund))}</div><small>確定収支（全記録）</small><div class="balance ${combined.profit<0?'negative':'positive'}">${combined.settledCount?signed(combined.profit):'—'}</div><p class="help">結果待ち ${combined.pendingCount}点・件（${yen(combined.pendingStake)}）。暫定収支 ${signed(combined.tentativeNet)}。</p></section>${section}${quickRows||(!section?'<section class="card empty">この日の記録はありません。</section>':'')}<a class="button quiet full" href="#entry-date/${date}">＋ この日のレースを記録</a><a class="button quiet full" href="#quick-date/${date}">⚡ この日の支出を入力</a>`;
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
function simpleEntry(id=null,contextDate=null,fromDay=false){
 const editingRow=id?(data.simpleEntries||[]).find(e=>e.id===id):null;
 check(!id||editingRow,'簡易記録が見つかりません。');
 const old=editingRow||{date:contextDate||jstToday(),stake:1000,venue:null,number:null,type:null,name:'',memo:'',status:'pending',payout:0,refund:0};
 const backHash=fromDay?'#day/'+(contextDate||old.date):'#history';
 const templates=id?[]:recentSimpleTemplates(data.simpleEntries||[]);
 const templatePanel=templates.length?`<section class="simple-recent" aria-label="最近の支出を再利用"><h2>前回の入力を再利用</h2><p class="help">金額・競馬場・券種だけを引き継ぎます。購入日・レース番号・払戻はコピーされません。</p><div class="simple-recent-list">${templates.map((t,i)=>`<button type="button" class="quiet simple-repeat-button" data-simple-template="${i}"><strong>${yen(t.stake)}</strong><small>${esc(t.venue||'競馬場未指定')} · ${esc(t.type||'券種未指定')} · ${esc(t.sourceDate)}</small><span>この条件を入力に使う →</span></button>`).join('')}</div></section>`:'';

 app.innerHTML=`<div class="simple-entry-head"><a href="${backHash}">← ${fromDay?'この日の記録':'記録一覧'}に戻る</a><h1>${id?'かんたん記録を編集':'かんたん支出入力'}</h1><p class="help">日付と購入額だけで記録できます。任意項目を追加すると、その項目の分析にも使われます。馬券の購入処理は行いません。</p><a href="#entry" class="quiet button">買い目まで細かく入力 →</a></div>
 <form id="simpleEntryForm" class="card simple-entry-form"><label>購入日（必須）<input id="simpleDate" type="date" required min="2000-01-01" max="2199-12-31" value="${esc(old.date)}"></label>
 <label>支出額（必須）<input id="simpleStake" type="number" min="100" max="1000000000000" step="100" required inputmode="numeric" value="${old.stake}"></label>
 <div class="stake-shortcuts" role="group" aria-label="支出金額のクイック設定">${[100,500,1000,2000,5000].map(n=>`<button class="quiet" type="button" data-simple-amount="${n}">${n.toLocaleString('ja-JP')}円</button>`).join('')}</div>
 ${templatePanel}
 <details class="simple-optional" ${old.venue||old.number||old.type||old.name||old.memo?'open':''}><summary>競馬場・券種・メモなどを追加（任意）</summary><div class="simple-optional-fields"><label>競馬場<select id="simpleVenue"><option value="">未指定</option>${opts(VENUES,old.venue)}</select></label><label>レース番号<select id="simpleNumber"><option value="">未指定</option>${Array.from({length:12},(_,i)=>`<option value="${i+1}" ${old.number===i+1?'selected':''}>${i+1}R</option>`).join('')}</select></label><label>券種<select id="simpleType"><option value="">未指定</option>${opts(TYPES,old.type)}</select></label><label>レース名（任意）<input id="simpleName" enterkeyhint="next" maxlength="100" value="${esc(old.name)}"></label><label class="simple-optional-full">メモ（任意）<textarea id="simpleMemo" maxlength="4000">${esc(old.memo)}</textarea></label></div></details>
 <div class="simple-settlement"><div class="simple-result-actions" role="group" aria-label="結果入力ショートカット"><button type="button" class="quiet" id="simpleMarkPending">結果待ちにする</button><button type="button" class="quiet" id="simpleMarkMiss">不的中（0円）で確定</button></div><label>結果入力状況<select id="simpleStatus"><option value="pending" ${old.status==='pending'?'selected':''}>結果待ち（払戻未入力）</option><option value="settled" ${old.status==='settled'?'selected':''}>結果確定（払戻0円も含む）</option></select></label><div id="simplePayoutFields" ${old.status==='settled'?'':'hidden'}><label>実際の払戻金<input id="simplePayout" type="number" min="0" step="1" inputmode="numeric" value="${old.payout}"></label><label>返還金<input id="simpleRefund" type="number" min="0" step="1" inputmode="numeric" value="${old.refund}"></label></div></div>
 <div id="simpleReview" role="status" aria-live="polite"></div><p id="simpleUnsaved" class="simple-edit-state" role="status">${id?'変更はありません':'新規記録：まだ保存されていません'}</p>
 <button type="submit" class="accent full" id="simpleSave">${id?'この記録を更新':'この支出を保存'}</button><p class="help">簡易記録の更新は同じ1件を上書きします。別の詳細記録を新規登録しても自動的には紐づかないため、重複登録しないようにしてください。</p></form>
 ${id?'<button type="button" id="simpleDelete" class="danger full">この簡易記録を削除する</button>':''}`;
 const status=$('#simpleStatus'),fields=$('#simplePayoutFields');
 const get=()=>makeSimpleEntry({date:$('#simpleDate').value,stake:$('#simpleStake').value,venue:$('#simpleVenue').value,number:$('#simpleNumber').value,type:$('#simpleType').value,name:$('#simpleName').value,memo:$('#simpleMemo').value,status:status.value,payout:$('#simplePayout').value,refund:$('#simpleRefund').value},id||'preview');
 const refresh=()=>{
  try{const x=get(),pending=x.status==='pending',net=pending?'—':signed(x.payout+x.refund-x.stake);
   $('#simpleReview').innerHTML=`<div class="simple-review-row"><span>今回の支出</span><strong>${yen(x.stake)}</strong></div><div class="simple-review-row"><span>払戻・返還</span><strong>${pending?'未入力':yen(x.payout+x.refund)}</strong></div><div class="simple-review-row"><span>確定収支</span><strong>${net}</strong></div><p class="help">${pending?'総支出に全額反映し、結果確定分の損益・回収率には含みません。':'確定した収支として分析に反映します。'} 競馬場・券種別の分析は指定項目がある場合のみ対象です。</p>`;
  }catch(err){$('#simpleReview').textContent=err.message;}
 };
 const markDirty=()=>{dirty=true;$('#simpleUnsaved').textContent='編集中（未保存）';refresh();};
 let lastStatus=status.value;
 const hasResultAmounts=()=>['#simplePayout','#simpleRefund'].some(selector=>{
  const value=$(selector).value.trim();return value!==''&&Number(value)!==0;
 });
 const markPending=()=>{
  if(hasResultAmounts()&&!confirm('入力済みの払戻・返還金を消して結果待ちに戻しますか？'))return false;
  status.value='pending';$('#simplePayout').value='0';$('#simpleRefund').value='0';
  fields.hidden=true;lastStatus='pending';markDirty();return true;
 };
 status.onchange=()=>{
  if(status.value==='pending'){if(!markPending())status.value=lastStatus;return;}
  lastStatus='settled';fields.hidden=false;markDirty();
 };
 $('#simpleEntryForm').oninput=markDirty;
 $('#simpleEntryForm').onchange=markDirty;
 app.querySelectorAll('[data-simple-amount]').forEach(b=>b.onclick=()=>{$('#simpleStake').value=b.dataset.simpleAmount;markDirty();});
 $('#simpleMarkPending').onclick=()=>{markPending();};
 $('#simpleMarkMiss').onclick=()=>{
  if((Number($('#simplePayout').value)>0||Number($('#simpleRefund').value)>0)&&!confirm('入力済みの払戻・返還金を0円に変更して確定しますか？'))return;
  status.value='settled';lastStatus='settled';$('#simplePayout').value='0';$('#simpleRefund').value='0';fields.hidden=false;markDirty();
 };
 app.querySelectorAll('[data-simple-template]').forEach(button=>button.onclick=()=>{
  const template=templates[Number(button.dataset.simpleTemplate)];
  if(!template)return;
  $('#simpleStake').value=template.stake;
  $('#simpleVenue').value=template.venue||'';
  $('#simpleType').value=template.type||'';
  $('#simpleNumber').value='';
  $('#simpleName').value='';
  $('#simpleMemo').value='';
  status.value='pending';lastStatus='pending';
  $('#simplePayout').value='0';
  $('#simpleRefund').value='0';
  fields.hidden=true;
  if(template.venue||template.type)app.querySelector('.simple-optional').open=true;
  markDirty();
 });

 refresh();
 $('#simpleEntryForm').onsubmit=guard(async event=>{
  event.preventDefault();if(!event.currentTarget.reportValidity())return;
  const x=makeSimpleEntry({date:$('#simpleDate').value,stake:$('#simpleStake').value,venue:$('#simpleVenue').value,number:$('#simpleNumber').value,type:$('#simpleType').value,name:$('#simpleName').value,memo:$('#simpleMemo').value,status:status.value,payout:$('#simplePayout').value,refund:$('#simpleRefund').value},id||uid());
  const similar=(data.simpleEntries||[]).filter(e=>e.id!==id&&e.date===x.date&&e.stake===x.stake&&e.venue===x.venue&&e.number===x.number&&e.type===x.type);
  if(similar.length&&!confirm('同じ日付・金額・競馬場・券種の簡易記録があります。重複していないことを確認して追加しますか？'))return;
  if(!id&&!confirm('購入額 '+yen(x.stake)+' を支出として記録しますか？'))return;
  const next=clone(data);next.simpleEntries=[...(next.simpleEntries||[])];
  if(id){const index=next.simpleEntries.findIndex(e=>e.id===id);check(index>=0,'訂正する記録が見つかりません。');next.simpleEntries[index]=x;}
  else next.simpleEntries.push(x);
  await commit(next);notify(id?'簡易記録を更新しました。':'支出を記録しました。');location.hash=fromDay?'#day/'+x.date:backHash;
 });
 if(id)$('#simpleDelete').onclick=guard(async()=>{
  if(!confirm('この簡易記録 '+yen(old.stake)+' を削除しますか？収支集計からも除外されます。'))return;
  const next=clone(data);next.simpleEntries=(next.simpleEntries||[]).filter(e=>e.id!==id);
  await commit(next);notify('簡易記録を削除しました。');location.hash=backHash;
 });
}

function entry(id=null,eventId=null){editing=id;draft=[];stakeSelectedIds.clear();stakeUndoHistory=[];entryResultsEditor=null;fastResultsEditor=null;entrySheetController=null;existingApprovalSignature='';entryDraftKey=id||'new';draftVisible=150;reviewVisible=50;reviewSignature='';let entrySaved=false;const t=id?data.tickets.find(t=>t.id===id):null;check(!id||t,'記録が見つかりません。');const r=t?data.races.find(r=>r.id===t.raceId):{date:jstToday(),venue:'東京',number:(window.__UMALOG_ENTRY_CLASSIC__===true||new URLSearchParams(location.search).get('entry-layout')==='classic')?1:'',name:''};if(t)draft=data.lines.filter(l=>l.ticketId===id).map(l=>({...clone(l),type:t.type}));
 app.innerHTML=`<h1>${t?'記録を編集':'馬券を登録'}</h1><section class="card entry-draft-alert" id="entryDraftRecovery" hidden></section><section class="card entry-dash" id="entryQuickDashboard" hidden><div class="row"><div><small>レースの収支帳簿</small><h2>購入と結果</h2></div><span id="quickStatus" class="tag">未入力</span></div><div id="quickSnapshot" class="day-metrics"></div><p class="entry-save-status" id="entryDraftStatus" role="status">下書き：準備中</p><div class="entry-quick-actions"><button id="openPurchaseSheet" class="quiet" type="button">＋ 買い目を追加</button><button id="openOutcomeSheet" class="quiet" type="button">✓ 結果を入力</button></div><button id="openAmountEditor" class="quiet full" type="button" hidden>￥ 買い目ごとの金額を編集</button><details class="quick-lines"><summary id="quickLineTitle">購入した買い目を確認</summary><div id="quickLines"></div></details></section><div class="simple-entry-switch"><a href="#quick" class="button accent full">⚡ 金額だけかんたん入力（数秒で記録）</a><p class="help">買い目まで入力する場合はこのまま下の詳細入力を使用してください。</p></div><div id="entrySheetBackdrop" class="entry-sheet-backdrop" hidden></div><form id="entryForm"><section class="card"><h2>① レースを選ぶ</h2><div id="gradedPicker"></div><label>開催日<input required type="date" id="date" value="${r.date}" min="2000-01-01" max="2199-12-31"></label><div class="grid"><label>競馬場<select id="venue">${opts(VENUES,r.venue)}</select></label><label>レース番号<select id="number" required><option value="">番号を確認して選択</option>${Array.from({length:12},(_,i)=>`<option value="${i+1}" ${r.number===i+1?'selected':''}>${i+1}R</option>`).join('')}</select></label></div><div class="race-fast-picks" id="raceFastPicks" role="group" aria-label="レース番号のクイック選択"></div><div id="calendarCandidates"></div><p id="raceMatch" class="help" role="status"></p><label>レース名（任意）<input id="raceName" maxlength="100" value="${esc(r.name)}"></label>${t?.kind==='advance'?'<p class="help">この記録は以前の「事前登録」として保存されています。既存の区分は維持します。</p>':''}</section><section class="card" id="entryPurchasePanel"><h2 id="entryPurchaseTitle">② 買い目を入力</h2><div class="grid"><label>券種<select id="type" ${t?'disabled':''}>${opts(TYPES,t?.type||'ワイド')}</select></label><label>入力方式<select id="mode"><option value="normal">通常</option><option value="box">BOX</option><option value="flow">流し</option><option value="formation">フォーメーション</option></select></label></div><div id="betTypeFast" role="group" aria-label="券種を素早く選ぶ"></div><div id="numberPad"></div><div id="advancedPicker"></div><label class="number-manual">番号を直接入力・修正<input id="numbers" inputmode="text" placeholder="例：1 4 9" autocomplete="off"></label><div class="grid"><label>1点あたり購入額<input id="stake" type="number" min="100" step="100" value="100" inputmode="numeric"></label><label>同じ買い目の追加<select id="duplicate"><option value="separate">別の行として記録</option><option value="merge">未入力の行へ金額合算</option></select></label></div><div class="stake-shortcuts" id="stakeShortcuts" role="group" aria-label="購入金額のクイック選択"><span>1点あたりの金額</span>${[100,200,500,1000].map(n=>`<button type="button" class="quiet" data-stake-shortcut="${n}">${n.toLocaleString("ja-JP")}円</button>`).join("")}</div><div id="recentPurchaseTemplates" class="recent-purchases"></div><button type="button" id="addLine" class="quiet full">買い目を確認・追加</button><p id="additionEstimate" class="addition-estimate help" role="status" aria-live="polite"></p><div id="draft"></div></section><section class="card" id="entryOutcomePanel"><h2 id="entryOutcomeTitle">③ レース結果を入力</h2><p class="help">結果が出てから記録する画面です。的中は実際に受け取った払戻金（100円あたりのオッズではありません）を入力してください。返還は購入金額が戻った場合に選びます。</p><div id="fastResults"></div><div id="entryResults"></div><button type="button" class="quiet full" id="finishOutcomeSheet" hidden>結果画面を閉じる</button></section><section class="card"><h2>④ 収支を確認して保存</h2><div id="entryReview" class="entry-review"></div><div id="existingDuplicateReview"></div><label>購入メモ（任意）<textarea id="memo" maxlength="4000">${esc(t?.memo||'')}</textarea></label><label class="checklabel" ${t?'hidden':''}><input id="saveNextRace" type="checkbox">保存後、同じ日付・競馬場で次のレースを記録</label><button class="full accent" type="submit">${t?'結果と記録を保存':'この日の結果を記録'}</button><details class="entry-legacy"><summary>例外：結果が未入力のまま保存する</summary><label class="checklabel"><input id="allowUnfinished" type="checkbox">結果未入力の買い目が残っていても保存する（通常は使用しません）</label><p class="help">過去の未確定記録を訂正する場合などに限ります。未入力分は確定収支に含みません。</p></details>${t?'<p class="help">開催日等の変更は、この券種の記録に適用します。同一レース名は共有されます。訂正しても獲得済み育成EXPは保持します。</p>':''}</section></form>`;
 entryResultsEditor=mountEntryResults($('#entryResults'),{onDirty:()=>{dirty=true;updateDraftTotals();fastResultsEditor?.render(draft);}});
 const classic=window.__UMALOG_ENTRY_CLASSIC__===true||new URLSearchParams(location.search).get('entry-layout')==='classic';
 if(!classic){
  const details=document.createElement('details');details.id='entryDetailedResults';details.className='entry-advanced';
  details.innerHTML='<summary>一部返還・詳細結果を編集</summary>';
  $('#entryResults').before(details);details.append($('#entryResults'));
  $('#entryQuickDashboard').hidden=false;$('#finishOutcomeSheet').hidden=false;
  entrySheetController=mountEntrySheets({form:$('#entryForm'),purchase:$('#entryPurchasePanel'),outcomes:$('#entryOutcomePanel'),backdrop:$('#entrySheetBackdrop')});
  $('#openPurchaseSheet').onclick=e=>entrySheetController.open('purchase',e.currentTarget);
  $('#openAmountEditor').onclick=e=>{entrySheetController.open('purchase',e.currentTarget);$('#draft').scrollIntoView({block:'start',behavior:'auto'});};
  $('#openOutcomeSheet').onclick=e=>entrySheetController.open('outcomes',e.currentTarget);
  $('#finishOutcomeSheet').onclick=()=>entrySheetController.close();
  fastResultsEditor=mountFastResults($('#fastResults'),{onChange:()=>{dirty=true;entryResultsEditor.reset(draft);updateDraftTotals();},onAdvanced:index=>{
   $('#entryDetailedResults').open=true;
   const select=entryResultsEditor.reveal(index);
   if(select){select.value='advanced';select.dispatchEvent(new Event('change',{bubbles:true}));select.scrollIntoView({block:'center',behavior:'auto'});}
  }});
 }

 const raceButtons=$('#raceFastPicks');
 const updateRaceButtons=()=>{raceButtons.querySelectorAll('[data-race-quick]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.raceQuick===$('#number').value)));};
 raceButtons.innerHTML=Array.from({length:12},(_,i)=>`<button type="button" class="quiet" data-race-quick="${i+1}" aria-pressed="false">${i+1}R</button>`).join('');
 raceButtons.querySelectorAll('button').forEach(b=>b.onclick=()=>{$('#number').value=b.dataset.raceQuick;$('#number').dispatchEvent(new Event('change',{bubbles:true}));});
 $('#number').addEventListener('change',updateRaceButtons);updateRaceButtons();
 const match=()=>{$('#raceMatch').textContent=raceDescription({date:$('#date').value,venue:$('#venue').value,number:Number($('#number').value)},effectiveCatalog());updateCandidates($('#date').value,$('#venue').value);};const updateCandidates=mountCandidates($('#calendarCandidates'),withMaster(calendarState.calendar),v=>{if(v.venue)$('#venue').value=v.venue;if(v.number)$('#number').value=v.number;if(v.name)$('#raceName').value=v.name;dirty=true;match();});['date','venue','number'].forEach(id=>$('#'+id).addEventListener('change',match));match();
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
 const syncStakeShortcuts=()=>$('#stakeShortcuts').querySelectorAll('button').forEach(button=>button.setAttribute('aria-pressed',String(Number(button.dataset.stakeShortcut)===Number($('#stake').value))));
 $('#stakeShortcuts').querySelectorAll('button').forEach(button=>button.onclick=()=>{$('#stake').value=button.dataset.stakeShortcut;$('#stake').dispatchEvent(new Event('input',{bubbles:true}));syncStakeShortcuts();});
 $('#stake').addEventListener('input',syncStakeShortcuts);syncStakeShortcuts();
 const reusePanel=$('#recentPurchaseTemplates'),templates=t?[]:recentPurchaseTemplates(data);
 if(templates.length){
  reusePanel.innerHTML='<details><summary>以前の買い目を再利用（最大200点／記録）</summary><p class="help">購入履歴から券種・組番・金額だけを追加します。レース情報、払戻、返還は引き継ぎません。購入した記録のみ保存してください。</p><div class="recent-purchase-list">'+templates.map((template,i)=>`<button type="button" class="quiet recent-purchase-button" data-reuse-ticket="${i}"><strong>${esc(template.type)} · ${template.count}点 / ${yen(template.total)}</strong><small>${esc(template.date)} ${esc(template.venue)} ${template.number}R の記録</small></button>`).join('')+'</div></details>';
  reusePanel.querySelectorAll('[data-reuse-ticket]').forEach(button=>button.onclick=guard(()=>{
   check($('#entryDraftRecovery').hidden,'入力途中の下書きを復元または破棄してから再利用してください。');
   check(validDate($('#date').value)&&VENUES.includes($('#venue').value)&&Number($('#number').value)>=1&&Number($('#number').value)<=12,'先に登録先の開催日・競馬場・レース番号を確認してください。');
   const template=templates[Number(button.dataset.reuseTicket)],copied=copyPurchaseTemplate(template);
   check(draft.length+copied.length<=10000,'今回の記録が10,000点を超えます。');
   if(!confirm(`過去の${template.type} ${template.count}点（${yen(template.total)}）を、${$('#date').value} ${$('#venue').value} ${$('#number').value}Rへ追加しますか？\n過去の払戻結果はコピーしません。購入内容を確認してから記録してください。`))return;
   draft.push(...copied);dirty=true;renderDraft();showEstimate();scheduleEntryDraft();entrySheetController?.close();
   notify(`過去の購入 ${copied.length}点を結果未入力で追加しました。必ず内容を確認してください。`);
  }));
 }else reusePanel.hidden=true;
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
 $('#addLine').onclick=guard(()=>{check(!/^[\s]*[-−]/.test($('#numbers').value),'負の番号は入力できません。');const type=$('#type').value,ns=$('#numbers').value.trim().split(/[\s,、・\-→]+/).filter(Boolean).map(Number),amount=money(Number($('#stake').value),true),mode=$('#mode').value,cs=generateBets(type,mode,mode==='normal'||mode==='box'?{numbers:ns}:advancedPicker.selection());check(draft.length+cs.length<=10000,'1回の登録は10,000点までです。');for(const numbers of cs){const found=$('#duplicate').value==='merge'&&draft.find(l=>l.type===type&&l.status==='pending'&&l.purchaseMode===mode&&JSON.stringify(l.numbers)===JSON.stringify(numbers));if(found){found.stake=money(found.stake+amount,true);}else draft.push({id:uid(),type,numbers,stake:amount,purchaseMode:mode,status:'pending',payout:0,refund:0});}dirty=true;stakeUndoHistory=[];stakeSelectedIds.clear();renderDraft();showEstimate();if(mode==='formation'&&!classic){$('#draft').scrollIntoView({block:'start',behavior:'auto'});}else entrySheetController?.close();notify(`${cs.length}点を追加しました（合計 ${yen(draft.reduce((n,l)=>n+l.stake,0))}）。${mode==='formation'?' 下の一覧で買い目ごとに金額を変更できます。':''}`);});
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
   draft=saved.lines.map(l=>({...l}));stakeSelectedIds.clear();stakeUndoHistory=[];
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
 next.races=next.races.filter(r=>next.tickets.some(t=>t.raceId===r.id));
 if(editing){
  const change=stakeChanges(data.lines.filter(l=>l.ticketId===editing),completed);
  if((change.changed||change.added||change.removed)&&!confirm('保存済みの購入記録を訂正します。\n変更前 '+yen(change.oldTotal)+' → 変更後 '+yen(change.newTotal)+'（差額 '+signed(change.difference)+'）\nうまログの記録に反映しますか？'))return;
 }
 entrySaved=true;try{await entryDraftSession?.pauseForCommit();await commit(next,{clearDraftKey:entryDraftKey});await entryDraftSession?.stop();entryDraftSession=null;}catch(error){entrySaved=false;entryDraftSession?.resume();entryDraftSession?.schedule();throw error;}notify('保存しました。');location.hash=continueNext?'entry-next/'+r.date+'/'+encodeURIComponent(r.venue):'history';});
}
function updateDraftTotals(){
 if(!$('#draft .entry-total'))return;
 const review=reviewBets(draft),text=`${review.count}点 / 合計 ${yen(review.total)}`;$('#draft .entry-total').textContent=text;
 const raceText=`${$('#date').value} · ${$('#venue').value} ${$('#number').value?$('#number').value+'R':'番号未確認'}`,name=$('#raceName').value||'レース名なし';
 const signature=JSON.stringify([raceText,name,draft]),same=signature===reviewSignature,confirmed=same&&$('#entryDuplicatesConfirmed')?.checked,opened=$('#reviewLines')?.open;reviewSignature=signature;
 const modes={normal:'通常',box:'BOX',flow:'流し',formation:'フォーメーション'},rows=draft.slice(0,reviewVisible);
 $('#entryReview').innerHTML=`<small>${esc(raceText)}</small><h3>${esc(name)}</h3><strong class="review-total">${text}</strong><details id="reviewLines" ${opened?'open':''}><summary>券種・買い方・買い目を確認（${draft.length}点）</summary><ul class="review-lines">${rows.map(l=>`<li><span>${esc(l.type)} · ${modes[l.purchaseMode]||'旧記録（不明）'}<br><b>${l.numbers.join(['馬単','三連単'].includes(l.type)?'→':'－')}</b></span><strong>${yen(l.stake)}</strong></li>`).join('')}</ul>${draft.length>rows.length?'<button type="button" id="reviewMore" class="quiet full">さらに50点を表示</button>':''}</details>${review.duplicates.length?`<p class="help">同じ券種・組番が ${review.duplicates.length}組あります。買い方が異なるものも含みます。削除・合算はしていません。</p><label class="checklabel"><input type="checkbox" id="entryDuplicatesConfirmed" ${confirmed?'checked':''}>意図した追加購入として残す</label>`:''}`;
 const savedDiff=editing?stakeChanges(data.lines.filter(l=>l.ticketId===editing),draft):null;
 if(savedDiff&&(savedDiff.changed||savedDiff.added||savedDiff.removed)){
  $('#entryReview').insertAdjacentHTML('beforeend',`<div class="stake-diff-preview" id="stakeDiffReview"><strong>保存済み記録との差分</strong><p>変更前 ${yen(savedDiff.oldTotal)} → 変更後 ${yen(savedDiff.newTotal)} ／ 差額 <b>${signed(savedDiff.difference)}</b></p><p class="help">金額変更 ${savedDiff.changed}点／追加 ${savedDiff.added}点／削除 ${savedDiff.removed}点。内容を確認して保存してください。</p>${savedDiff.items.slice(0,16).map(item=>`<div class="stake-diff-row"><span>${esc(item.type)} ${item.numbers?.join('→')||''}</span><strong>${yen(item.before)} → ${yen(item.after)}</strong></div>`).join('')}${savedDiff.items.length>16?'<small>残りの変更も合計に反映されています。</small>':''}</div>`);
 }
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
 const summary=stakeBreakdown(draft),n=summary.count,total=summary.total,visible=draft.slice(0,draftVisible);
 const format=l=>l.numbers.join(['馬単','三連単'].includes(l.type)?'→':'－');
 $('#draft').innerHTML=`<section class="allocation-editor" id="allocationEditor"><h3>買い目別の購入金額</h3><p class="help">全点に同じ金額を設定してから、一部の組み合わせだけ変更できます。実際のJRA投票内容は変更されません。</p><p class="entry-total" role="status" aria-live="polite">${n}点 / 合計 ${yen(total)}</p>
 ${n>1?`<details class="bet-bulk" ${draft.some(l=>l.purchaseMode==='formation')?'open':''}><summary>一括で同じ金額にする（全${n}点）</summary><div class="stake-preset-row" role="group" aria-label="すべての買い目の購入額を設定">${STAKE_PRESETS.map(amount=>`<button type="button" class="quiet" data-bulk-preset="${amount}">全点${amount.toLocaleString('ja-JP')}円</button>`).join('')}</div><div class="bet-bulk-form"><label>一括の金額を直接入力<input id="bulkAmount" type="number" min="100" step="100" inputmode="numeric" value="${summary.nonUniform?100:summary.first||100}"></label><button type="button" class="quiet" id="bulkApply">全点に適用</button></div><p class="help">一括操作は個別変更済みの行も上書きします。個別変更はこの下の各行から行えます。</p></details>`:''}
<div class="stake-multi-editor" id="stakeMultiEditor"><div class="row"><strong>複数の買い目をまとめて変更</strong><small id="stakeSelectedCount" role="status">${stakeSelectedIds.size}点選択中</small></div><p class="help">チェックした組み合わせだけ金額を変更。まとめて選択して「選択分に適用」を押してね。</p><div class="stake-multi-actions"><button type="button" class="quiet" id="stakeSelectVisible">表示中を選択</button><button type="button" class="quiet" id="stakeClearSelection">選択を解除</button><button type="button" class="quiet" id="stakeUndo" ${stakeUndoHistory.length?'':'disabled'}>↶ 直前の変更を取り消す</button></div><div class="stake-preset-row selected-quick" role="group" aria-label="選択した買い目の金額">${[100,200,500].map(amount=>`<button type="button" class="quiet" data-selected-preset="${amount}" ${stakeSelectedIds.size?'':'disabled'}>選択分${amount}円</button>`).join('')}</div><div class="stake-multi-apply"><label>選択分に適用する金額<input id="selectedStakeAmount" type="number" min="100" step="100" inputmode="numeric" value="200"></label><button type="button" id="stakeSelectedApply" class="quiet" ${stakeSelectedIds.size?'':'disabled'}>選択分に適用</button></div></div>
 <div class="allocation-heading"><strong>組み合わせ別の金額${n? `（${n}点）`:''}</strong><small>金額は100円単位</small></div>
 <div class="bet-slip-rows">${visible.map((l,i)=>`<div class="bet-slip-row line">
 <span class="bet-slip-name"><label class="stake-row-select"><input type="checkbox" data-stake-select="${i}" aria-label="買い目${i+1}を選択" ${stakeSelectedIds.has(l.id)?'checked':''}><span>まとめて変更</span></label><small>${l.type} · ${l.purchaseMode?({normal:'通常',box:'BOX',flow:'流し',formation:'フォーメーション'}[l.purchaseMode]||'不明'):'旧記録（不明）'}</small><b>${format(l)}</b>${l.status!=='pending'?'<small>確定済みの記録</small>':''}</span>
 <label class="bet-slip-amount"><span class="sr-only">買い目${i+1}の購入金額</span><input data-amount="${i}" aria-label="買い目${i+1}の購入金額" required type="number" step="100" min="100" value="${l.stake}" inputmode="numeric"></label>
 <button type="button" class="danger bet-slip-remove" data-remove="${i}" aria-label="買い目${i+1}を削除">×</button>
 <div class="stake-preset-row per-line" role="group" aria-label="買い目${i+1}をすばやく変更">${STAKE_PRESETS.slice(0,3).map(amount=>`<button type="button" class="quiet ${l.stake===amount?'is-selected':''}" data-line-stake="${i}" data-value="${amount}" aria-pressed="${l.stake===amount}">${amount}円</button>`).join('')}</div>
 </div>`).join('')}</div>
 ${n>visible.length?`<button type="button" class="quiet full" id="draftMore">さらに表示（残り ${n-visible.length}点）</button>`:''}</section>`;
 const trackStakeChange=next=>{
  if(!next.some((l,i)=>l.stake!==draft[i]?.stake))return;
  stakeUndoHistory.push(stakeSnapshot(draft));if(stakeUndoHistory.length>10)stakeUndoHistory.shift();
  draft=next;dirty=true;
 };
 const updateSelected=amount=>{
  const ids=draft.filter(l=>stakeSelectedIds.has(l.id)).map(l=>l.id);
  trackStakeChange(selectedStakeUpdate(draft,ids,amount));renderDraft();
 };
 const updateOne=(index,amount,redraw=true)=>{
  trackStakeChange(setIndividualStake(draft,index,amount));
  if(redraw){renderDraft();return;}
  // Preserve the focused numeric input while typing, especially on iOS.
  const row=$('#draft [data-amount="'+index+'"]')?.closest('.bet-slip-row');
  row?.querySelectorAll('[data-line-stake]').forEach(button=>{
   const selected=Number(button.dataset.value)===draft[index].stake;
   button.setAttribute('aria-pressed',String(selected));
   button.classList.toggle('is-selected',selected);
  });
  const undo=$('#stakeUndo');if(undo)undo.disabled=!stakeUndoHistory.length;
  entryResultsEditor?.render(draft);
  fastResultsEditor?.render(draft);
  updateDraftTotals();
 };
 document.querySelectorAll('[data-remove]').forEach(b=>b.onclick=()=>{stakeSelectedIds.delete(draft[Number(b.dataset.remove)]?.id);draft.splice(Number(b.dataset.remove),1);stakeUndoHistory=[];dirty=true;renderDraft();});
 document.querySelectorAll('[data-amount]').forEach(el=>el.onchange=guard(()=>updateOne(Number(el.dataset.amount),el.value,false)));
 document.querySelectorAll('[data-line-stake]').forEach(b=>b.onclick=guard(()=>updateOne(Number(b.dataset.lineStake),Number(b.dataset.value))));
 document.querySelectorAll('[data-stake-select]').forEach(el=>el.onchange=()=>{
  const id=draft[Number(el.dataset.stakeSelect)]?.id;if(!id)return;
  if(el.checked)stakeSelectedIds.add(id);else stakeSelectedIds.delete(id);renderDraft();
 });
 $('#stakeSelectVisible').onclick=()=>{visible.forEach(l=>stakeSelectedIds.add(l.id));renderDraft();};
 $('#stakeClearSelection').onclick=()=>{stakeSelectedIds.clear();renderDraft();};
 $('#stakeUndo').onclick=guard(()=>{
  if(!stakeUndoHistory.length)return;
  draft=restoreStakeSnapshot(draft,stakeUndoHistory[stakeUndoHistory.length-1]);
  stakeUndoHistory.pop();dirty=true;renderDraft();notify('直前の金額変更を元に戻しました。');
 });
 document.querySelectorAll('[data-selected-preset]').forEach(b=>b.onclick=guard(()=>updateSelected(Number(b.dataset.selectedPreset))));
 $('#stakeSelectedApply').onclick=guard(()=>updateSelected($('#selectedStakeAmount').value));
 const updateAll=amount=>{
  if(stakeBreakdown(draft).nonUniform&&!confirm('個別に設定した購入金額も含め、すべて'+Number(amount).toLocaleString('ja-JP')+'円に変更しますか？'))return;
  trackStakeChange(setUniformStakes(draft,amount));renderDraft();
 };
 document.querySelectorAll('[data-bulk-preset]').forEach(b=>b.onclick=guard(()=>updateAll(Number(b.dataset.bulkPreset))));
 if($('#bulkApply'))$('#bulkApply').onclick=guard(()=>updateAll($('#bulkAmount').value));
 if($('#draftMore'))$('#draftMore').onclick=()=>{draftVisible+=150;renderDraft();};
 if($('#openAmountEditor'))$('#openAmountEditor').hidden=!n;
 entryResultsEditor?.render(draft);
 fastResultsEditor?.render(draft);
 updateDraftTotals();
}
function history(){
 if(window.__UMALOG_ENTRY_CLASSIC__===true)return historyClassic();
 app.innerHTML=`<h1>購入履歴</h1><section class="card history-compact"><label>レースを探す<input id="historySearch" type="search" enterkeyhint="search" placeholder="日付・競馬場・レース名・メモ"></label><div class="filter"><label>競馬場<select id="vf"><option value="">全場</option>${opts(VENUES,'')}</select></label><label>券種<select id="tf"><option value="">全券種</option>${opts(TYPES,'')}</select></label><label>結果<select id="sf"><option value="">すべて</option><option value="hit">的中あり</option><option value="miss">不的中</option><option value="pending">未入力</option><option value="void">全額返還</option></select></label></div><div class="history-period" role="group" aria-label="購入期間で絞り込み"><label>開始日<input id="historyFrom" type="date" min="2000-01-01" max="2199-12-31"></label><label>終了日<input id="historyTo" type="date" min="2000-01-01" max="2199-12-31"></label><div class="history-period-actions"><button type="button" id="historyThisMonth" class="quiet">今月</button><button type="button" id="historyClearPeriod" class="quiet">期間を解除</button></div></div><p id="historyPeriodWarning" class="help" role="status"></p><div id="historyFinanceOverview" class="history-finance" aria-live="polite"></div><p id="historyCount" class="help"></p><div class="history-controls"><button type="button" id="historyPendingShortcut" class="quiet">結果待ちだけ確認</button><button type="button" id="historyClearFilters" class="quiet">条件をクリア</button></div><div id="historyList"></div><section id="quickHistorySection" class="quick-history" aria-label="かんたん支出の履歴"></section><button id="quickHistoryMore" type="button" class="quiet full" hidden>かんたん支出をさらに100件表示</button><button id="historyMore" type="button" class="quiet full" hidden>さらに表示</button></section>`;
 let shown=50,shownQuick=100;
 const indexedHistory=ticketIndex(data).linesByTicket;
 const historyRows=raceHistoryRows(data);
 const update=()=>{
  const q=$('#historySearch').value.trim(),venue=$('#vf').value,type=$('#tf').value,status=$('#sf').value,from=$('#historyFrom').value,to=$('#historyTo').value;
  const inRange=date=>(!from||date>=from)&&(!to||date<=to);
  $('#historyPeriodWarning').textContent=from&&to&&from>to?'開始日が終了日より後です。期間を見直してください。':'';
  const list=historyRows.map(item=>{
   const filtered=item.tickets.filter(t=>{
    const lines=indexedHistory.get(t.id)||[],s=summarize(lines);
    return (!type||t.type===type)&&(!status||(status==='hit'&&lines.some(l=>l.payout>0))||(status==='pending'&&s.pendingCount>0)||(status==='miss'&&!s.pendingCount&&s.lineCount>0&&!s.lineHits)||(status==='void'&&lines.length>0&&lines.every(l=>l.status==='void')));
   });
   return {...item,tickets:filtered};
  }).filter(item=>item.tickets.length&&inRange(item.race.date)&&(!venue||item.race.venue===venue)&&matchesRaceQuery(item,q));
  const overview=purchaseHistoryOverview(list,indexedHistory);
  const quick=(data.simpleEntries||[]).filter(x=>inRange(x.date)&&(!venue||x.venue===venue)&&(!type||x.type===type)&&(!status||status==='pending'&&x.status==='pending'||status==='hit'&&x.status==='settled'&&x.payout>0||status==='miss'&&x.status==='settled'&&x.payout===0&&x.refund<x.stake||status==='void'&&x.status==='settled'&&x.refund===x.stake)&&(!q||[x.date,x.venue||'',x.number===null?'':String(x.number),x.type||'',x.name,x.memo].join(' ').normalize('NFKC').toLocaleLowerCase('ja').includes(q.normalize('NFKC').toLocaleLowerCase('ja')))).sort((a,b)=>b.date.localeCompare(a.date));
  const qp=quick.reduce((n,x)=>n+x.stake,0),qs=quick.filter(x=>x.status==='settled'),settledStake=qs.reduce((n,x)=>n+x.stake,0),receipts=qs.reduce((n,x)=>n+x.payout+x.refund,0),qpnd=qp-settledStake;
  const recordedTotal=overview.recordedPurchase+qp,finalizedTotal=overview.settledPurchase+settledStake,receiveTotal=overview.receipts+receipts,finalProfit=receiveTotal-finalizedTotal;
  $('#quickHistorySection').innerHTML=`<div class="row"><h2>かんたん支出（${quick.length}件）</h2><a class="quiet button" href="#quick">＋ かんたん入力</a></div>${quick.slice(0,shownQuick).map(x=>`<article class="simple-history-row"><div><small>${esc(x.date)} · ${esc(x.venue||'競馬場未指定')} ${x.number?x.number+'R':''} ${esc(x.type||'券種未指定')}</small><strong>${yen(x.stake)}</strong><small>${esc(x.name||x.memo||'支出のみ')} · ${x.status==='pending'?'結果待ち':`払戻・返還 ${yen(x.payout+x.refund)}`}</small></div><a href="#quick-edit/${encodeURIComponent(x.id)}" class="quiet button">編集・結果入力</a></article>`).join('')||'<p class="help">条件に一致する簡易記録はありません。</p>'}${quick.length>shownQuick?`<p class="help">${shownQuick}件まで表示しています。下のボタンから続きを表示できます。</p>`:''}`;
  $('#historyFinanceOverview').innerHTML=`<h2>表示中の購入履歴</h2><div class="history-finance-grid"><div><small>総支出（詳細＋簡易）</small><strong>${yen(recordedTotal)}</strong></div><div><small>結果確定分の支出</small><strong>${yen(finalizedTotal)}</strong></div><div><small>払戻・返還</small><strong>${yen(receiveTotal)}</strong></div><div><small>確定収支</small><strong class="${finalProfit<0?'negative':'positive'}">${overview.hasSettled||qs.length?signed(finalProfit):'—'}</strong></div></div><p class="help">結果待ち：詳細 ${overview.pendingCount}点＋簡易 ${quick.length-qs.length}件／合計 ${yen(overview.pendingStake+qpnd)}。支出は全件計上し、結果待ちは確定収支から除外。暫定収支 ${signed(receiveTotal-recordedTotal)}。</p>`;
  $('#historyCount').textContent=`条件に一致：詳細 ${list.length}レース・かんたん支出 ${quick.length}件（現在表示：詳細 ${Math.min(list.length,shown)}レース・簡易 ${Math.min(quick.length,shownQuick)}件）`;
  $('#historyList').innerHTML=list.slice(0,shown).map(item=>{
   const {race,tickets}=item,ids=new Set(tickets.map(t=>t.id)),lines=item.lines.filter(l=>ids.has(l.ticketId)),stat=summarize(lines,[race],tickets);
   return `<section class="history-race"><div class="row"><div><small>${esc(race.date)} · ${esc(race.venue)} ${race.number}R</small><h3>${esc(race.name||race.venue+' '+race.number+'R')}</h3></div><strong class="${stat.profit<0?'negative':'positive'}">${stat.settledCount?signed(stat.profit):'—'}</strong></div><p class="help">購入 ${yen(lines.reduce((n,l)=>n+l.stake,0))} · 払戻 ${yen(stat.payout)} · 返還 ${yen(stat.refund)} · ${tickets.length}券種</p>
   <details class="history-bet-details"><summary>券種・買い目を確認する</summary>${tickets.map(t=>{
    const ls=indexedHistory.get(t.id)||[],v=summarize(ls);
    return `<div class="history-ticket"><div class="row"><b>${esc(t.type)} · ${ls.length}点</b><span class="${v.profit<0?'negative':'positive'}">${v.settledCount?signed(v.profit):'—'}</span></div><div class="history-ticket-actions"><button type="button" class="quiet" data-detail="${esc(t.id)}">券種の詳細</button><button type="button" class="quiet" data-stake-edit="${esc(t.id)}">金額配分を編集</button></div><details><summary>各買い目の訂正</summary>${ls.slice(0,30).map(l=>`<div class="day-edit-row"><span>${l.numbers.join(['馬単','三連単'].includes(t.type)?'→':'－')}</span><small>購入 ${yen(l.stake)} / 払戻 ${yen(l.payout)}</small><button type="button" class="quiet" data-quick-edit="${esc(l.id)}">訂正</button></div>`).join('')}${ls.length>30?'<p class="help">残りの買い目は券種の詳細から確認できます。</p>':''}</details></div>`;
   }).join('')}</details></section>`;
  }).join('')||'<p class="empty">該当する記録がありません。</p>';
  $('#historyMore').hidden=list.length<=shown;
  $('#quickHistoryMore').hidden=quick.length<=shownQuick;
  bindDetails();$('#historyList').querySelectorAll('[data-stake-edit]').forEach(button=>button.onclick=()=>location.hash='edit-stakes/'+button.dataset.stakeEdit);bindQuickEdits(()=>history());
 };
 $('#historyMore').onclick=()=>{shown+=50;update();};
 $('#quickHistoryMore').onclick=()=>{shownQuick+=100;update();};
 ['vf','tf','sf','historyFrom','historyTo'].forEach(id=>$('#'+id).onchange=()=>{shown=50;shownQuick=100;update();});
 $('#historySearch').oninput=()=>{shown=50;shownQuick=100;update();};
 $('#historyPendingShortcut').onclick=()=>{shown=50;shownQuick=100;$('#sf').value='pending';update();};
 $('#historyThisMonth').onclick=()=>{const month=jstToday().slice(0,7),[year,number]=month.split('-').map(Number);$('#historyFrom').value=month+'-01';$('#historyTo').value=month+'-'+String(new Date(year,number,0).getDate()).padStart(2,'0');shown=50;shownQuick=100;update();};
 $('#historyClearPeriod').onclick=()=>{$('#historyFrom').value='';$('#historyTo').value='';shown=50;shownQuick=100;update();};
 $('#historyClearFilters').onclick=()=>{shown=50;shownQuick=100;$('#sf').value='';$('#vf').value='';$('#tf').value='';$('#historyFrom').value='';$('#historyTo').value='';$('#historySearch').value='';update();};
 update();
}
function historyClassic(){app.innerHTML=`<h1>購入履歴</h1><section class="card"><label>記録を探す<input id="historySearch" type="search" placeholder="日付・レース名・競馬場"></label><div class="filter"><label>競馬場<select id="vf"><option value="">全場</option>${opts(VENUES,'')}</select></label><label>券種<select id="tf"><option value="">全券種</option>${opts(TYPES,'')}</select></label><label>結果<select id="sf"><option value="">すべて</option><option value="hit">的中あり</option><option value="miss">不的中</option><option value="pending">結果待ち</option><option value="void">全額返還のみ</option></select></label></div><div id="historyList"></div></section>`;const update=()=>{const list=sortedTickets().filter(t=>{const {r,ls,s}=ticketInfo(t),st=$('#sf').value,q=$('#historySearch').value.trim();return (!q||`${r.date} ${r.name} ${r.venue}`.includes(q))&&(!$('#vf').value||r.venue===$('#vf').value)&&(!$('#tf').value||t.type===$('#tf').value)&&(!st||(st==='hit'&&ls.some(l=>l.payout>0))||(st==='pending'&&s.pendingCount>0)||(st==='miss'&&!s.pendingCount&&s.lineCount>0&&!s.lineHits)||(st==='void'&&!s.pendingCount&&s.lineCount===0));});$('#historyList').innerHTML=list.map(ticketCard).join('')||'<p class="empty">該当する記録がありません。</p>';bindDetails();};['vf','tf','sf'].forEach(id=>$('#'+id).onchange=update);$('#historySearch').oninput=update;update();}
function detail(id){const t=data.tickets.find(t=>t.id===id);check(t,'記録が見つかりません。');const {r,ls,s}=ticketInfo(t);app.innerHTML=`<a href="#history">← 履歴に戻る</a><h1>${r.venue} ${r.number}R <span class="tag">${t.type}</span></h1><section class="card"><small>${r.date}</small><h2>${esc(r.name||'名称未取得')}</h2><p class="help">${esc(raceDescription(r,effectiveCatalog()))}</p><p>${t.kind==='advance'?'旧形式の事前登録（履歴保護）':'購入した馬券の記録'}<br><small>記録時刻（端末申告・証明ではありません）：${esc(new Date(t.createdAt).toLocaleString('ja-JP',{timeZone:'Asia/Tokyo'}))}</small></p><p style="white-space:pre-wrap">${esc(t.memo||'メモなし')}</p><div class="row"><button id="edit" class="quiet">記録を編集</button><button id="delete" class="danger">記録を削除</button></div><button type="button" id="editStakes" class="quiet full">￥ 購入金額を組み合わせ別に編集</button><p class="help">ここでの変更は収支管理用の訂正です。実際に購入済みのJRA馬券は変更できません。</p></section><section class="card race-podium"><h2>3着以内の馬番（任意）</h2><div class="podium-fields">${['1着','2着','3着'].map((label,i)=>`<label>${label}<select id="podium${i+1}"><option value="">—</option>${Array.from({length:18},(_,x)=>`<option value="${x+1}" ${r.podium?.[i]===x+1?'selected':''}>${x+1}番</option>`).join('')}</select></label>`).join('')}</div></section><section class="card detail-corrections"><h2>買い目ごとに訂正</h2><p class="help">購入額・的中金額・返還金を、該当する1点だけ訂正できます。</p><div id="detailCorrectionsRows"></div></section><div id="batchResults"></div><details id="individualResults" ${ls.length<=10?'open':''}><summary>この券種を個別入力・訂正（${ls.length}点）</summary><form id="settlement"></form></details>`;
 let correctionVisible=30;
 const renderCorrectionRows=()=>{
  const list=$('#detailCorrectionsRows');if(!list)return;
  list.innerHTML=ls.slice(0,correctionVisible).map(l=>`<div class="day-edit-row"><span>${l.numbers.join(['馬単','三連単'].includes(t.type)?'→':'－')}</span><small>購入 ${yen(l.stake)} / 払戻 ${yen(l.payout)} / 返還 ${yen(l.refund)}</small><button type="button" class="quiet" data-quick-edit="${esc(l.id)}">訂正</button></div>`).join('')+
  (ls.length>correctionVisible?`<button id="detailMoreCorrections" type="button" class="quiet full">さらに30点を表示（残り${ls.length-correctionVisible}点）</button>`:'');
  bindQuickEdits(()=>detail(id));
  if($('#detailMoreCorrections'))$('#detailMoreCorrections').onclick=()=>{correctionVisible+=30;renderCorrectionRows();};
 };
 renderCorrectionRows();$('#editStakes').onclick=()=>location.hash='edit-stakes/'+id;$('#edit').onclick=()=>location.hash='edit/'+id;$('#delete').onclick=guard(async()=>{if(confirm('この券種の記録と買い目を削除します。収支を再計算します。獲得済み育成EXPは保持します。よろしいですか？')){await commit(removeTicket(clone(data),id));location.hash='history';notify('削除しました。');}});
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
function analysisComparePanel(c){
 const summary=(label,period)=>{const s=period.summary;return `<div class="compare-period"><h3>${label}</h3><small>${period.start} ～ ${period.end}</small><div class="compare-facts"><span>確定済み購入 <b>${yen(s.purchase)}</b></span><span>払戻・返還 <b>${yen(s.payout+s.refund)}</b></span><span>確定収支 <b class="${s.profit<0?'negative':'positive'}">${s.settledCount?signed(s.profit):'—'}</b></span><span>回収率 <b>${rate(s.returnRate)}</b></span><span>的中 ${s.lineHits} / 有効確定 ${s.lineCount}点</span><span>未入力 ${s.pendingCount}点（${yen(s.pendingStake)}）</span></div></div>`;};
 const rows=(list,label)=>`<details class="compare-breakdown"><summary>${label}（記録がある区分 ${list.length}件）</summary><div class="table-wrap"><table><thead><tr><th scope="col">区分</th><th scope="col">確定購入</th><th scope="col">収支</th><th scope="col">回収率</th><th scope="col">有効確定/未入力</th></tr></thead><tbody>${list.map(x=>`<tr><th scope="row">${esc(x.label)}</th><td>${yen(x.purchase)}</td><td class="${x.profit<0?'negative':'positive'}">${x.settledCount?signed(x.profit):'—'}</td><td>${rate(x.returnRate)}</td><td>${x.lineCount} / ${x.pendingCount}</td></tr>`).join('')}</tbody></table></div></details>`;
 const delta=c.profitDelta===null?'—':signed(c.profitDelta),rateDiff=c.rateDelta===null?'—':(c.rateDelta>0?'+':'')+c.rateDelta.toFixed(1)+'ポイント';
 return `<section class="card analysis-compare" id="analysisCompare"><h2>直近30日とその前の30日</h2><p class="help">日本時間の今日を含む直近30日間と、その前の30日間。画面上の競馬場・券種フィルターを適用します。日付の範囲外・将来の記録は含めません。</p><div class="compare-grid">${summary('直近30日',c.recent)}${summary('その前の30日',c.previous)}</div><p class="compare-deltas">確定収支の差 ${delta} ／ 回収率の差 ${rateDiff}</p><p class="help">${c.lowSample?'確定済み有効買い目がどちらかの期間で30点未満です。数字の差は参考値です。':'比較対象の買い目には同一レース内の相関があります。数字の差は将来の成績を予測しません。'} 全額返還は的中率の分母から除外し、未入力分は確定収支に含めません。</p>${rows(c.byType,'直近30日の券種別内訳')}${rows(c.byVenue,'直近30日の競馬場別内訳')}</section>`;
}

function analysisQualityPanel(q){
 const f=q.finance;
 return `<section class="card analysis-quality" id="analysisQuality" aria-label="分析データの充足状況">
 <h2>分析データの充足状況</h2>
 <p class="help">かんたん支出と買い目明細を合算。入力済みの範囲と結果確定済みの範囲を分けて確認できます。</p>
 <div class="analysis-quality-grid">
  <div><small>確定済みの記録</small><strong>${q.settledCount} / ${q.total}点・件</strong><small>件数比 ${rate(q.settledCountShare)}</small></div>
  <div><small>確定済み購入額の割合</small><strong>${rate(q.settledShare)}</strong><small>確定 ${yen(f.settledPurchase)} / 総支出 ${yen(f.recordedPurchase)}</small></div>
  <div><small>競馬場が判明</small><strong>${q.venueCount} / ${q.total}点・件</strong><small>件数比 ${rate(q.venueCountShare)}・支出額比 ${rate(q.venueShare)}</small></div>
  <div><small>券種が判明</small><strong>${q.typeCount} / ${q.total}点・件</strong><small>件数比 ${rate(q.typeCountShare)}・支出額比 ${rate(q.typeShare)}</small></div>
 </div>
 <p class="help">合算回収率：<b>${rate(f.returnRate)}</b>（確定済み購入額 ${yen(f.settledPurchase)} に対する払戻・返還 ${yen(f.receipts)}）。結果待ち ${q.pendingCount}点・件、${yen(q.pendingStake)} は分母に含めません。</p>
 ${q.pendingCount?'<p class="analysis-quality-warning">未確定の記録が残っています。ここに表示した回収率は全購入額に対する最終回収率ではありません。</p>':''}
 <p class="help">内訳：詳細買い目 ${q.detailCount}点・かんたん支出 ${q.simpleCount}件。詳細買い目の的中率と、簡易記録を含む回収率は異なる指標です。未指定の競馬場・券種を補完したものとして扱いません。</p>
 </section>`;
}
function inclusiveMonthlyPanel(rows){
 return `<section class="card analysis-inclusive-monthly" id="analysisInclusiveMonthly">
 <h2>月別収支（かんたん・詳細を合算）</h2>
 <p class="help">現在の分析条件に一致する、記録のある直近最大6か月を表示。記録がない月は省略します。結果待ちの購入額は総支出に含め、確定収支・回収率から除外します。</p>
 ${rows.length?`<div class="analysis-inclusive-rows">${[...rows].reverse().map(row=>`<article class="analysis-inclusive-row" data-inclusive-month="${esc(row.month)}">
  <h3>${esc(row.month)}</h3>
  <div><small>総支出</small><b>${yen(row.recordedPurchase)}</b></div>
  <div><small>確定収支</small><strong class="${row.profit<0?'negative':'positive'}">${row.settledCount?signed(row.profit):'—'}</strong></div>
  <div><small>合算回収率</small><b>${rate(row.returnRate)}</b></div>
  <small class="analysis-inclusive-row-foot">払戻・返還 ${yen(row.receipts)} ／ 確定購入 ${yen(row.settledPurchase)} ／ 結果待ち ${yen(row.pendingStake)}（詳細 ${row.detailCount}点・簡易 ${row.simpleCount}件）</small>
 </article>`).join('')}</div>`:'<p class="empty">この条件ではまだ記録がありません。</p>'}
 </section>`;
}
function analysis(){const source=analysisLedger(),s=aggregate(source),scopePrefix=analysisRange==='all'?'':analysisRange==='year'?analysisYear:analysisMonth,quality=analysisCoverage(data,{prefix:scopePrefix,venue:analysisVenue,type:analysisType}),inclusive=quality.finance,inclusiveMonthly=inclusiveMonthlyRows(data,{prefix:scopePrefix,venue:analysisVenue,type:analysisType}),insights=periodInsights(source),trend=ledgerInsights(source,6),compare=analysisRange==='all'?periodComparison(source):null,group=len=>[...new Set(source.races.map(r=>r.date.slice(0,len)))].sort().reverse().map(k=>[k,aggregate(source,r=>r.date.startsWith(k))]);const scopeLabel=[analysisRange==='all'?'全期間':analysisRange==='year'?analysisYear+'年':analysisMonth,analysisVenue||'全場',analysisType||'全券種'].join('・');const byType=TYPES.map(type=>{const ts=source.tickets.filter(t=>t.type===type),ids=new Set(ts.map(t=>t.id));return [type,summarize(source.lines.filter(l=>ids.has(l.ticketId)),source.races,ts)];});app.innerHTML=`<h1>成績分析</h1><div class="analysis-jumps" role="group" aria-label="分析項目"><button class="quiet" type="button" data-analysis-jump="analysisBasics">基本成績</button>${compare?'<button class="quiet" type="button" data-analysis-jump="analysisCompare">直近比較</button>':''}<button class="quiet" type="button" data-analysis-jump="analysisMatrix">競馬場×券種</button><button class="quiet" type="button" data-analysis-jump="analysisTrends">推移と傾向</button></div><section class="card analysis-filter-panel"><h2>分析条件</h2><div class="analysis-controls"><label>期間<select id="analysisRange"><option value="all" ${analysisRange==='all'?'selected':''}>全期間</option><option value="year" ${analysisRange==='year'?'selected':''}>年間</option><option value="month" ${analysisRange==='month'?'selected':''}>月間</option></select></label><label id="analysisYearField" ${analysisRange==='year'?'':'hidden'}>対象年<input id="analysisYear" type="number" min="2000" max="2199" step="1" inputmode="numeric" value="${analysisYear}"></label><label id="analysisMonthField" ${analysisRange==='month'?'':'hidden'}>対象月<input id="analysisMonth" type="month" min="2000-01" max="2199-12" value="${analysisMonth}"></label><label>競馬場<select id="analysisVenue"><option value="">すべて</option>${opts(VENUES,analysisVenue)}</select></label><label>券種<select id="analysisType"><option value="">すべて</option>${opts(TYPES,analysisType)}</select></label></div></section><section class="card" id="analysisBasics"><h2>基本成績（簡易・詳細を合算）</h2><div class="metrics">${metric('総支出',yen(inclusive.recordedPurchase))}${metric('確定分の支出',yen(inclusive.settledPurchase))}${metric('払戻・返還',yen(inclusive.receipts))}${metric('結果待ち',yen(inclusive.pendingStake))}</div><div class="balance ${inclusive.profit<0?'negative':'positive'}">${inclusive.settledCount?signed(inclusive.profit):'—'}</div><p class="help">確定収支（簡易・詳細合算）／暫定収支 ${signed(inclusive.tentativeNet)}。結果待ちは総支出に含め、確定収支には含めません。</p><p class="help">分析対象：全記録 ${inclusive.coverage.all}点・件、競馬場判明 ${inclusive.coverage.venue}、券種判明 ${inclusive.coverage.type}、買い目判明 ${inclusive.coverage.combination}。未指定は競馬場・券種別の分析から除外されます。</p><details><summary>詳細馬券の分析結果を表示</summary><small>以下は買い目まで登録した詳細記録のみ（簡易記録は的中率の分母に含めません）</small><div class="detailed-analysis-balance ${s.profit<0?'negative':'positive'}">${s.settledCount?signed(s.profit):'—'}</div><div class="metrics">${metric('回収率',rate(s.returnRate))}${metric('買い目の的中率',rate(s.lineRate))}</div><p class="help">確定購入 ${yen(s.purchase)} ／ 払戻 ${yen(s.payout)} ／ 返還 ${yen(s.refund)} ／ 未入力 ${s.pendingCount}点</p><details><summary>集計の詳細・母数</summary>${totals(s)}<div class="divider metrics">${metric('レース単位的中率',rate(s.raceRate))}${metric('的中 / 確定済み有効レース',`${s.raceHits} / ${s.raceCount}`)}</div><p class="help muted">未入力 ${s.pendingCount}点・${yen(s.pendingStake)} は除外。全額返還は的中率の分母から除外。レース単位は全買い目確定後に集計します。</p></details></details></section>${!source.lines.length?'<section class="card empty">まだ集計できる記録がありません。<br>「—」は未計算です。</section>':''}${analysisQualityPanel(quality)}<section class="card" id="inclusiveBreakdown"><h2>全記録の支出分析</h2><p class="help">詳細入力・かんたん入力を両方含みます。登録されていない競馬場・券種は「未指定」として集計します。結果待ちの支出は確定収支に含まれません。</p>${['venue','type'].map(axis=>`<details><summary>${axis==='venue'?'競馬場':'券種'}別の支出・確定収支</summary><div class="table-wrap"><table><thead><tr><th>区分</th><th>総支出</th><th>確定支出</th><th>払戻・返還</th><th>確定収支</th><th>回収率</th></tr></thead><tbody>${quickBreakdown(data,{prefix:analysisRange==='all'?'':analysisRange==='year'?analysisYear:analysisMonth,dimension:axis,venue:analysisVenue,type:analysisType}).map(v=>`<tr><td>${esc(v.label)}</td><td>${yen(v.recordedPurchase)}</td><td>${yen(v.settledPurchase)}</td><td>${yen(v.receipts)}</td><td>${v.settledPurchase?signed(v.profit):'—'}</td><td>${rate(v.settledPurchase?v.receipts/v.settledPurchase*100:null)}</td></tr>`).join('')}</tbody></table></div></details>`).join('')}</section>${analysisInsightPanel(insights)}${compare?analysisComparePanel(compare):''}${inclusiveMonthlyPanel(inclusiveMonthly)}<section class="card detailed-trends" id="analysisMonthlyFacts"><h2>詳細馬券の購入額と払戻（簡易記録は除外）</h2><p class="help">買い目まで登録した詳細記録の過去6か月のみ。未入力は確定済み収支から除外。</p>${trend.trend.map(x=>`<div class="trend-row"><b>${esc(x.month)}</b><span>購入 ${yen(x.purchase+x.pending)}</span><span>払戻・返還 ${yen(x.receipts)}</span><strong class="${x.profit<0?'negative':'positive'}">${x.settled?signed(x.profit):'—'}</strong></div>`).join('')||'<p class="empty">対象の記録がありません。</p>'}${trend.lines.map(line=>`<p class="help">${esc(line)}</p>`).join('')}</section>${budgetWidget(data,analysisRange==='month'?analysisMonth:jstToday().slice(0,7))}${monthlyReviewPanel(data,analysisRange==='month'?analysisMonth:jstToday().slice(0,7))}<section class="card" id="analysisTrends"><h2>詳細馬券の月別収支</h2><p class="help">このグラフは買い目まで入力した詳細記録のみ。簡易記録を含む月別収支は上の「月別収支（かんたん・詳細を合算）」をご覧ください。</p>${chart(group(7))||'<p class="empty">データなし</p>'}<details><summary>月別の詳細</summary>${table(group(7))}</details></section>${styleView(source,effectiveCatalog().records,scopeLabel)}<section class="card"><details><summary>日別収支</summary>${table(group(10))}</details></section><section class="card"><details><summary>年間収支</summary>${table(group(4))}</details></section><section class="card"><details><summary>券種別成績の詳細</summary>${table(byType)}</details></section><section class="card" id="analysisVenues"><h2>競馬場別収支</h2>${chart(VENUES.map(v=>[v,aggregate(source,r=>r.venue===v)]))}<details><summary>競馬場別成績の詳細</summary>${table(VENUES.map(v=>[v,aggregate(source,r=>r.venue===v)]))}</details></section><section class="card analysis-cross" id="analysisMatrix"><details><summary>競馬場 × 券種の記録を比較</summary><p class="help">確定済み買い目の収支。購入数が少ない場合、偶然の影響が大きいため優劣の判定には使えません。未入力は収支から除外します。</p><div id="analysisMatrixContents" class="table-wrap"><p class="help">開くと集計表を表示します。</p></div></details></section>`;
 const matrixDetails=$('#analysisMatrix details');
 const renderMatrix=()=>{
  if(!matrixDetails.open||$('#analysisMatrixContents table'))return;
  const matrix=typeVenueMatrix(source);
  $('#analysisMatrixContents').innerHTML=`<table><caption>競馬場別・券種別の確定収支（円）</caption><thead><tr><th scope="col">競馬場</th>${TYPES.map(t=>`<th scope="col">${esc(t)}</th>`).join('')}</tr></thead><tbody>${matrix.map(row=>`<tr><th scope="row">${esc(row.venue)}</th>${row.types.map(cell=>`<td title="${cell.lines}点購入・${cell.pending}点未入力・${cell.description}" class="${cell.profit<0?'negative':'positive'}">${cell.settledCount?signed(cell.profit):'—'}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
 };
 matrixDetails.addEventListener('toggle',renderMatrix);
 app.querySelectorAll('[data-analysis-jump]').forEach(button=>button.onclick=()=>{const dest=app.querySelector('#'+button.dataset.analysisJump);if(!dest)return;if(dest.id==='analysisMatrix'){dest.querySelector('details').open=true;renderMatrix();}dest.scrollIntoView({block:'start',behavior:'auto'});});
 $('#analysisRange').onchange=e=>{analysisRange=e.target.value;analysis();};
 $('#analysisYear').onchange=e=>{if(/^(20\d\d|21\d\d)$/.test(e.target.value)){analysisYear=e.target.value;analysis();}else e.target.value=analysisYear;};
 $('#analysisMonth').onchange=e=>{if(/^\d{4}-(0[1-9]|1[0-2])$/.test(e.target.value)){analysisMonth=e.target.value;analysis();}else e.target.value=analysisMonth;};
 $('#analysisVenue').onchange=e=>{analysisVenue=e.target.value;analysis();};
 $('#analysisType').onchange=e=>{analysisType=e.target.value;analysis();};
}
function growthScreen(){data=recalculate(data);const c=data.character,g=data.growthV2,companion=companionState(data,jstToday()),life=companionProgress(g,jstToday()),album=companionAlbum(data,jstToday()),w=weekOf(jstToday()),previous=addDays(w,-7),stats=aggregate(data),season=['winter','winter','spring','spring','spring','summer','summer','summer','autumn','autumn','autumn','winter'][Number(jstToday().slice(5,7))-1];app.innerHTML=`<h1>育成</h1><section class="card nursery" data-season="${season}" data-room="${life.theme}" data-motion="${data.settings.motion?'on':'off'}"><button id="petCare" class="pet-touch" aria-label="キャラクターをなでる">${companionFigure()}</button><h2>${esc(data.settings.name)}</h2><p class="companion-speech" id="companionSpeech" role="status">${esc(companion.phrase)}</p><p id="petLevel">Lv.${c.level} · ${STAGE_NAMES[c.stage]}</p><progress aria-label="次のレベルへの成長" max="100" value="${c.exp%100}"></progress><small class="wide-number">${c.exp} EXP</small><p id="petBond">なつき度 ${g.bond} / 100</p><meter id="bondMeter" aria-labelledby="petBond" min="0" max="100" value="${g.bond}"></meter><button id="care" class="quiet">なでる</button><button id="petTips" class="quiet pet-tips" type="button">${esc(data.settings.name)}に豆知識を聞く</button><p id="petReaction" class="help" role="status">${g.careDay===jstToday()?g.careCount:0} / 3回 お世話済み</p><div class="companion-life"><h3>一緒に過ごす</h3><p class="help">競馬をしない日も遊べます。毎日のログイン義務やお世話不足のペナルティはありません。</p><div class="companion-actions"><button type="button" class="quiet" id="companionPlay">一緒に遊ぶ</button><button type="button" class="quiet" id="companionRest">ひと休み</button></div><p class="help" id="companionActionStatus" role="status">今日の遊び ${life.playCount} / 2回（1日2回までなつき度+1、EXP加算なし）</p><label class="companion-room-label">景色を選ぶ<select id="companionRoom">${Object.entries(THEME_NAMES).map(([value,name])=>`<option value="${value}" ${life.theme===value?'selected':''}>${name}</option>`).join('')}</select></label><label class="companion-room-label">着せ替え<select id="companionOutfit">${Object.entries(OUTFIT_NAMES).map(([value,name])=>`<option value="${value}" ${life.outfit===value?'selected':''}>${name}</option>`).join('')}</select></label><p class="help">衣装はすべて無料。購入金額・的中・EXPに関係なく選べます。選択は端末に保存されます。</p></div></section><section class="card companion-album"><details id="companionAlbum"><summary>成長アルバム · ${album.stages.filter(x=>x.unlocked).length} / 5段階</summary><p class="help">過去に到達した姿を振り返れます。旧データには成長した日の記録がないため、到達日を推測して表示しません。</p><div class="companion-stage-grid">${album.stages.map(item=>`<div class="companion-stage ${item.unlocked?'unlocked':'locked'}"><img loading="lazy" src="${stageArtwork(item.stage)}" alt="${esc(item.name)}"><strong>${esc(item.name)}</strong><small>${item.unlocked?'到達済み':'EXP '+item.required+' で解放'}</small></div>`).join('')}</div><h3>一緒に過ごした日</h3><p class="help">最近30件まで端末内に記録。以前のお世話の日時は推測しません。</p><ul id="companionMemories" class="companion-memories">${album.memories.length?album.memories.map(item=>`<li><time datetime="${item.day}">${item.day}</time> · ${item.label}</li>`).join(''):'<li>これからの思い出がここに残ります。</li>'}</ul></details></section><details class="growth-optional"><summary>成長のご褒美・称号を見る</summary>${rewardPanel(data)}</details><section class="card"><details id="book"><summary>券種図鑑 · ${g.learned.length} / 8</summary>${TYPES.map(type=>`<details><summary>${type}${g.learned.includes(type)?' ✓':''}</summary><p>${BOOK[type]}</p><button class="quiet" data-learn="${type}" ${g.learned.includes(type)?'disabled':''}>読んだ · 初回10EXP</button></details>`).join('')}<p class="help">購入せずに学べます。払戻は公式発表を確認してください。</p></details></section><section class="card"><details><summary>実績帳</summary><p>的中買い目 ${stats.lineHits}回 / 記録 ${data.races.length}レース<br>最高払戻 ${yen(data.lines.reduce((n,l)=>Math.max(n,l.payout),0))}（1買い目）<br>回収率 ${rate(stats.returnRate)}</p><p class="help">未入力分は成績に含めません。実績によるEXP加算はありません。</p>${TYPES.map(type=>{const ids=new Set(data.tickets.filter(t=>t.type===type).map(t=>t.id)),s=summarize(data.lines.filter(l=>ids.has(l.ticketId)));return `<p>${type}：的中 ${s.lineHits} / ${s.lineCount}点・回収率 ${rate(s.returnRate)}</p>`;}).join('')}</details></section><section class="card"><details id="reviewDetails"><summary>週間振り返り</summary><p class="help">終了した週に1回20EXP。競馬をしなかった週も記録できます。</p><form id="reviewForm"><label>対象週<input type="date" id="reviewWeek" required value="${previous}" max="${previous}" min="2000-01-03"></label><p id="reviewStatus" class="help"></p><label>振り返り<textarea id="reviewText" required maxlength="4000"></textarea></label><button type="submit">振り返りを保存</button></form></details></section><section class="card"><details><summary>名前・成長のしくみ</summary><form id="petNameForm"><label>名前<input id="petName" maxlength="40" required value="${esc(data.settings.name)}"></label><button type="submit">名前を保存</button></form><p class="help">日本時間で1日3EXP。閉じていた期間は最大30日分まで反映します。なでると1日3回まで各2EXP・なつき度+1。何度でも反応します。端末時計を戻した日は加算を止めます。時計の操作を完全には防止できません。</p><p id="petBreakdown">引き継ぎ ${g.legacyExp} / 時間 ${g.dayExp} / お世話 ${g.careExp} / 学習 ${g.learned.length*10} / 振り返り ${g.reviewExp} EXP</p></details>${g.clockWarning?'<p class="help">時刻の変化を検出しました。成長の加算を制限しています。</p>':''}</section>`;
 $('#petNameForm').oninput=()=>dirty=true;$('#petNameForm').onsubmit=guard(async e=>{e.preventDefault();const next=clone(data);next.settings.name=$('#petName').value.trim();await commit(next);growthScreen();});
 const care=guard(async()=>{if(busy)return;const button=$('#petCare'),beforeRewards=new Set(growthRewards(data).filter(x=>x.unlocked).map(x=>x.id));await commit(grow(data,'care'));if(!button.isConnected)return;const c=data.character,g=data.growthV2;button.innerHTML=companionFigure();$('#petLevel').textContent=`Lv.${c.level} · ${STAGE_NAMES[c.stage]}`;$('.nursery progress').value=c.exp%100;$('.nursery .wide-number').textContent=`${c.exp} EXP`;$('#petBond').textContent=`なつき度 ${g.bond} / 100`;$('#bondMeter').value=g.bond;$('#petBreakdown').textContent=`引き継ぎ ${g.legacyExp} / 時間 ${g.dayExp} / お世話 ${g.careExp} / 学習 ${g.learned.length*10} / 振り返り ${g.reviewExp} EXP`;$('#companionSpeech').textContent=companionState(data,jstToday()).phrase;$('#petReaction').textContent=(g.bond>=30?'そばにいると、ほっとするみたい。':c.stage===0?'ころん、と揺れた。':'うれしそうに、こちらを見ている。')+` ${g.careDay===jstToday()?g.careCount:0} / 3回 お世話済み`;$('#growthRewards').innerHTML=rewardItems(data);
 const unlock=growthRewards(data).find(x=>x.unlocked&&!beforeRewards.has(x.id));
 if(unlock){const panel=$('.reward-panel');panel.classList.add('reward-celebrate');$('#petReaction').textContent='🎉 '+unlock.name+'を獲得！ '+$('#petReaction').textContent;notify('ご褒美「'+unlock.name+'」を獲得しました。');}
 button.classList.remove('react');void button.offsetWidth;button.classList.add('react');companionReact('care');});$('#care').onclick=care;$('#petCare').onclick=care;$('#petTips').onclick=e=>openTips(e.currentTarget,data.settings.name);
  const lifeAction=action=>guard(async()=>{
   const before=companionProgress(data.growthV2,jstToday());
   await commit(grow(data,action));
   const after=companionProgress(data.growthV2,jstToday()),didPlay=action==='play'&&after.playCount>before.playCount;
   const message=action==='rest'?'のんびり休憩したよ。お世話の回数やEXPは変わらないよ。':didPlay?'うれしそうに走り回った！ なつき度が1上がったよ。':'今日のなつき度アップは2回まで。またいつでも遊べるよ。';
   growthScreen();companionReact(action);$('#companionActionStatus').textContent=message+' 今日の遊び '+after.playCount+' / 2回';
   $('#companionSpeech').textContent=action==='rest'?'心地よさそうに、ひと休みしている。':'一緒に遊べてうれしそう！';
  });
  $('#companionPlay').onclick=lifeAction('play');
  $('#companionRest').onclick=lifeAction('rest');
  $('#companionRoom').onchange=guard(async e=>{
   const selected=e.currentTarget.value;
   await commit(grow(data,'room',selected));
   growthScreen();
   $('#companionActionStatus').textContent='景色を「'+THEME_NAMES[selected]+'」に変更しました。';
  });
  $('#companionOutfit').onchange=guard(async e=>{
   const selected=e.currentTarget.value;
   await commit(grow(data,'outfit',selected));
   growthScreen();companionReact('outfit');
   $('#companionActionStatus').textContent='着せ替えを「'+OUTFIT_NAMES[selected]+'」に変更しました。';
  });
 document.querySelectorAll('[data-learn]').forEach(b=>b.onclick=guard(async()=>{await commit(grow(data,'learn',b.dataset.learn));growthScreen();$('#book').open=true;}));
 const reviewLoad=()=>{const v=$('#reviewWeek').value;if(!v)return;$('#reviewWeek').value=weekOf(v);const found=data.reviews.find(r=>r.week===$('#reviewWeek').value);$('#reviewText').value=found?.text||'';$('#reviewStatus').textContent=found?'記録済み。文章を訂正できます（EXPの追加付与なし）。':'未記録の週です。';};$('#reviewWeek').onchange=reviewLoad;reviewLoad();$('#reviewForm').oninput=()=>dirty=true;$('#reviewForm').onsubmit=guard(async e=>{e.preventDefault();const week=weekOf($('#reviewWeek').value),text=$('#reviewText').value.trim();check(week<w,'今週の終了後に記録できます。');check(text,'振り返りを入力してください。');const next=clone(data),r=next.reviews.find(r=>r.week===week);if(r)r.text=text;else next.reviews.push({id:uid(),week,text});await commit(grow(next,'review',week));growthScreen();$('#reviewDetails').open=true;notify('振り返りを保存しました。');});}
function settings(){app.innerHTML=`<h1>設定・データ管理</h1><section class="card"><h2>同梱重賞</h2><p>2026年 32件 / 2027年 6件</p><p class="help">2026年10月17日以降の重賞を年末まで掲載。2027年は一部予定のみで、未発表のレース番号は自動入力しません。個人取り込みデータの削除後も同梱情報は残ります。</p></section><div id="calendarManager"></div>${catalogPanel()}<section class="card"><form id="settingsForm"><label class="checklabel"><input id="motion" type="checkbox" ${data.settings.motion?'checked':''}>画面の動きを有効にする</label><button type="submit">設定を保存</button></form></section><section class="card" id="budgetSettings"><h2>月間購入予算（任意）</h2><p class="help">買った馬券の金額を月単位で確認するための設定です。払戻や育成には影響しません。</p><form id="budgetForm"><label>対象月<input id="budgetMonth" type="month" required min="2000-01" max="2199-12" value="${jstToday().slice(0,7)}"></label><label>購入予算（円）<input id="budgetAmount" type="number" min="0" max="1000000000000" step="1" inputmode="numeric" value="${data.settings.monthlyBudgets?.[jstToday().slice(0,7)]||0}"></label><p class="help" id="budgetCurrent"></p><button class="quiet full" type="submit">この月の予算を保存（0円で解除）</button></form></section><section class="card"><h2>バックアップ</h2><div id="backupSummary" class="backup-summary"><div class="day-metrics">${metric('レース',String(data.races.length)+'件')}${metric('購入記録',String(data.tickets.length)+'件')}${metric('買い目',String(data.lines.length)+'点')}</div><p id="lastLocalSave" class="help">端末内の保存日時を確認中</p><p id="lastBackupConfirmed" class="help" role="status">外部バックアップの確認状況を読み込み中</p><button id="backupConfirmed" type="button" class="quiet full">保存先でJSONファイルを確認済みにする</button></div><p class="help">データはこのブラウザ・端末内に保存されます。ブラウザデータの消去や端末故障に備えて、JSONファイルを定期的に保存してください。端末間の自動同期はありません。</p><button id="export" class="full">収支・育成を書き出す（JSON）</button><button id="exportCsv" class="quiet full" type="button">買い目の明細をCSVで出力</button><p class="help">CSVは表計算ソフトで確認するためのものです。復元にはJSONバックアップを使ってください。</p><p id="storageInfo" class="help muted"></p><button id="persist" class="quiet">永続ストレージをリクエスト</button></section><section class="card"><h2>バックアップから復元</h2><p class="help">全件置換です。先に現在のデータを書き出してください。読み込み後に内容を確認し、もう一度確認してから置換します。</p><label>JSONファイル<input type="file" id="import" accept=".json,application/json"></label><div id="restorePreview"></div></section><section class="card"><h2>このアプリについて</h2><p class="help">うまログ v2.1.0 正式版（自由入力・全支出の収支統合・入力項目別分析）<br>対象：JRA中央競馬10場・8券種。レース情報や結果の自動取得なし。記録は自己申告で、購入の証明にはなりません。<br>同時編集では古い画面の保存を拒否します。競合が出た場合はデータを確認してから再読込してください。保存は最後に保存した画面の内容が優先されます。</p></section>`;
 // dev29: put frequently used safety settings first; leave every legacy control reachable.
 const originalInfo=app.querySelector('.card'),motionCard=$('#settingsForm').closest('.card'),backupCard=$('#backupSummary').closest('.card'),restoreCard=$('#restorePreview').closest('.card'),budgetCard=$('#budgetSettings');
 for(const card of [motionCard,backupCard,restoreCard,budgetCard])app.insertBefore(card,originalInfo);
 const title=(name,node)=>{const label=document.createElement('h2');label.className='settings-group-title';label.textContent=name;app.insertBefore(label,node);};
 title('表示・操作',motionCard);title('データの保護',backupCard);title('レース情報・高度な設定',originalInfo);
 loadMainSaveTime().then(when=>{const el=$('#lastLocalSave');if(el)el.textContent='端末内で最後に保存した日時：'+(when?new Date(when).toLocaleString('ja-JP',{timeZone:'Asia/Tokyo'}):'不明（旧バージョンの記録）')+'。外部バックアップの保存日時ではありません。';}).catch(()=>{const el=$('#lastLocalSave');if(el)el.textContent='端末内の保存日時を取得できませんでした。';});
 const updateBackupCheck=()=>Promise.all([loadBackupConfirmation(),loadMainSaveTime()]).then(([confirmedAt,lastSavedAt])=>{
   const el=$('#lastBackupConfirmed');if(!el)return;
   const status=backupFreshness(confirmedAt,lastSavedAt);
   el.textContent=status.kind==='missing'?'外部バックアップは未確認です。':
     status.kind==='outdated'?'最後にバックアップを確認した後、収支・設定が更新されています。最新のJSONを再保存してください。':
     status.kind==='unknown'?'外部バックアップの確認記録はありますが、端末内の最終更新時刻が不明です。最新のJSONを保存してください。':
     status.kind==='aged'?'最後のバックアップ確認から約'+status.days+'日経過しています。最新のJSONを保存してください。':
     '外部バックアップの保存先を確認した日：'+new Date(confirmedAt).toLocaleDateString('ja-JP',{timeZone:'Asia/Tokyo'})+'（その後の記録更新なし）';
  }).catch(()=>{const el=$('#lastBackupConfirmed');if(el)el.textContent='バックアップの状態を取得できませんでした。';});
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
 $('#export').onclick=guard(async()=>{const content=JSON.stringify(recalculate(data),null,2),blob=new Blob([content],{type:'application/json'}),name=backupFileName();const file=new File([blob],name,{type:'application/json'});if(navigator.canShare&&navigator.canShare({files:[file]})){try{await navigator.share({files:[file],title:'うまログ バックアップ'});return;}catch(e){if(e.name==='AbortError')return;}}const a=document.createElement('a'),url=URL.createObjectURL(blob);a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),60000);notify('JSON書き出しを開始しました。ファイルアプリなどへの保存を確認してください。');});
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
function render(){try{document.body.classList.remove('entry-sheet-open');document.body.style.overflow='';data=recalculate(data);document.body.classList.toggle('no-motion',!data.settings.motion);const [route,id,venueParam]=(location.hash.slice(1)||'home').split('/');updateDock(route);if(route==='entry')entry(null,id?decodeURIComponent(id):null);else if(route==='entry-next'){check(validDate(id)&&VENUES.includes(decodeURIComponent(venueParam||'')),'引き継ぐ日付と競馬場が不正です。');entry();$('#date').value=id;$('#venue').value=decodeURIComponent(venueParam);$('#number').value='';$('#raceName').value='';$('#date').dispatchEvent(new Event('change'));}else if(route==='day')dayScreen(id);else if(route==='entry-date'){check(/^\d{4}-\d\d-\d\d$/.test(id||''),'日付が不正です。');entry();$('#date').value=id;$('#number').value='';$('#date').dispatchEvent(new Event('change'));}else if(route==='quick')simpleEntry();else if(route==='quick-date'){check(validDate(id),'購入日が不正です。');simpleEntry(null,id,true);}else if(route==='quick-edit')simpleEntry(id,null,venueParam==='day');else if(route==='edit')entry(id);else if(route==='edit-stakes'){entry(id);$('#openAmountEditor')?.click();}else if(route==='detail')detail(id);else if(route==='history')history();else if(route==='calendar')calendarScreen();else if(route==='analysis')analysis();else if(route==='growth')growthScreen();else if(route==='settings')settings();else home();window.scrollTo(0,0);}catch(e){app.innerHTML=`<div class="error">${esc(e.message)} <a href="#home">ホームへ</a></div>`;}}

/* Mobile Safari: keep the permanent bottom dock out of the keyboard's way.
   VisualViewport height changes are observational; no ledger or draft data is touched. */
function setupMobileKeyboard(){
 const viewport=window.visualViewport;
 if(!viewport)return;
 const isEditing=element=>element instanceof HTMLElement&&
  (element.matches('textarea,[contenteditable="true"]')||
   element.matches('input:not([type="checkbox"]):not([type="radio"]):not([type="date"]):not([type="month"]):not([type="file"]):not([type="hidden"])'));
 const sync=()=>{
  const active=document.activeElement;
  const open=window.innerWidth<=720&&isEditing(active)&&
   window.innerHeight-viewport.height>150;
  const wasOpen=document.body.classList.contains('mobile-keyboard-open');
  document.body.classList.toggle('mobile-keyboard-open',open);
  if(open&&!wasOpen&&app.contains(active)){
   requestAnimationFrame(()=>{
    if(document.activeElement!==active)return;
    const rect=active.getBoundingClientRect(),top=viewport.offsetTop||0,bottom=top+viewport.height;
    if(rect.bottom>bottom-20||rect.top<top+10)active.scrollIntoView({block:'center',behavior:'auto'});
   });
  }
 };
 viewport.addEventListener('resize',sync);
 viewport.addEventListener('scroll',sync);
 window.addEventListener('resize',sync);
 document.addEventListener('focusin',sync);
 document.addEventListener('focusout',()=>requestAnimationFrame(sync));
 window.addEventListener('pageshow',sync);
 sync();
}
setupMobileKeyboard();
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
try{const snapshot=await loadWithRevision();data=snapshot.data;ledgerRevision=snapshot.revision;const next=recalculate(grow(migrateGrowth(data)));
 if(JSON.stringify(next)!==JSON.stringify(data)){try{data=await save(next,{expectedRevision:ledgerRevision});ledgerRevision++;}catch(error){if(error.code!=='STALE_LEDGER')throw error;const fresh=await loadWithRevision();data=fresh.data;ledgerRevision=fresh.revision;}}
 try{catalog=validateCatalog((await loadCatalog())||emptyCatalog());}catch(e){catalogWarning="レース情報キャッシュを読み込めません。収支データには影響しません。";}try{calendarState=await loadCalendar();calendarState.calendar=validateCalendar(calendarState.calendar);}catch(e){calendarWarning='開催キャッシュが不正です。既存データは変更していません。';calendarState={revision:0,importedAt:null,calendar:emptyCalendar()};}render();await registerSW();}catch(e){app.innerHTML=`<h1>データを読み込めませんでした</h1><p class="error">${esc(e.message)}</p><p>ブラウザの保存設定・空き容量を確認してください。既存データは変更していません。</p><button onclick="location.reload()">再読み込み</button>`;}

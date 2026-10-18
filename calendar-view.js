import {emptyCalendar,validateCalendar,planCalendar,STATUS,meetingKey} from './calendar.js';
import {saveCalendar} from './db.js';
import {jstToday,VENUES} from './core.js';
import {planManualRace} from './manual-race.js';
import {editableManualRaces,planManualCorrection} from './manual-race-correction.js';
import {raceAudit,filterRaceAudit,RACE_AUDIT_LABELS} from './race-audit.js';
const esc=v=>String(v??'未取得').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const stamp=s=>s?new Date(s).toLocaleString('ja-JP',{timeZone:'Asia/Tokyo'}):'未取り込み';
const counts=c=>[2026,2027].map(y=>`${y}年：開催 ${c.meetings.filter(r=>r.date.startsWith(y+'')).length} / 競走 ${c.races.filter(r=>r.date.startsWith(y+'')).length} / 重賞予定 ${c.featuredEvents.filter(r=>r.date.startsWith(y+'')).length}`).join('<br>');
const label=r=>`${r.date} ${r.venue} ${r.number?`${r.number}R `:''}${r.name||''}`;
export function calendarHome(c){const dates=c.meetings.filter(r=>r.date>=jstToday()).map(r=>r.date).sort(),date=dates[0];return `<section class="card"><h2>開催予定</h2>${date?c.meetings.filter(r=>r.date===date).map(r=>`<p><strong>${esc(label(r))}</strong> <small>${STATUS[r.status]}${r.approval==='pending'?'・認可前':''}</small><br><small>情報更新：${esc(r.sourceUpdatedAt)}</small></p>`).join(''):'<p class="help">次回開催の情報は未取得です。</p>'}${c.featuredEvents.filter(r=>r.date===date).map(r=>`<p>${esc(r.name)} <small>${STATUS[r.status]}${r.gradeStatus==='pending'?'・格付け申請中':''}</small></p>`).join('')}<a href="#settings">レースデータ管理</a></section>`;}
export function mountCandidates(el,c,onChoose){const update=(date,venue)=>{const ms=c.meetings.filter(r=>r.date===date&&r.status!=='cancelled'),rs=c.races.filter(r=>r.date===date&&r.venue===venue&&!['cancelled','changed'].includes(r.status)&&ms.some(m=>m.venue===venue&&m.status!=='changed'));el.innerHTML=`<details><summary>保存済みの開催候補</summary><p class="help">${ms.length?'日付に対応する開催候補です。':'開催情報は未取得です。手動で登録できます。'}</p><div class="candidate-buttons">${ms.map(r=>`<button type="button" data-v="${esc(r.venue)}" class="quiet">${esc(r.venue)} · ${STATUS[r.status]}</button>`).join('')}</div><div class="candidate-buttons">${rs.map(r=>`<button type="button" data-n="${r.number}" class="quiet">${r.number}R ${esc(r.name||'名称未発表')}${r.approval==='unknown'?'（要確認）':''}</button>`).join('')}</div>${c.featuredEvents.filter(r=>r.date===date&&r.venue===venue).map(r=>`<p class="help">${esc(r.name)}：番号未発表 / ${STATUS[r.status]}</p>`).join('')}</details>`;el.querySelectorAll('[data-v]').forEach(b=>b.onclick=()=>onChoose({venue:b.dataset.v}));el.querySelectorAll('[data-n]').forEach(b=>b.onclick=()=>{const r=rs.find(r=>r.number===Number(b.dataset.n));onChoose({number:Number(b.dataset.n),name:r?.name||''});});};return update;}
async function download(c){const name=(c.format==='umalog-calendar-diff'?'umalog-calendar-diff-':'umalog-calendar-')+jstToday()+'.json',file=new File([JSON.stringify(c,null,2)],name,{type:'application/json'});if(navigator.canShare?.({files:[file]})){try{await navigator.share({files:[file],title:'開催カレンダー'});return;}catch(e){if(e.name==='AbortError')return;}}const a=document.createElement('a'),url=URL.createObjectURL(file);a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),60000);}
export function mountCalendarManager(el,state,{onSave,onDirty,warning=''}){let generation=0,pending=null,manualPending=null,correctionPending=null,working=false;const manualRows=editableManualRaces(state.calendar),audit=raceAudit(state.calendar);el.innerHTML=`<section class="card"><h2>レースデータ管理</h2><p>${counts(state.calendar)}</p><p class="help">最終取り込み：${esc(stamp(state.importedAt))}<br>自動取得：未提供</p>${warning?`<p role="alert">${esc(warning)}</p>`:''}<details class="race-audit-panel" id="raceAudit"><summary>レース情報の確認状況：要確認 ${audit.counts.attention} / 全 ${audit.counts.all} 件</summary><p class="help">保存済みの開催・レース情報を分類しています。「要確認」は端末内の情報状態を示すだけで、内容の正誤やJRAの公式認証を判定しません。リンク先を自身で確認してください。</p><div class="race-audit-counts"><span>未検証・不明 <strong>${audit.counts.unknown}</strong>件</span><span>認可前 <strong>${audit.counts.pending}</strong>件</span><span>変更・中止 <strong>${audit.counts.blocked}</strong>件</span><span>格付け未確定 <strong>${audit.counts.grade}</strong>件</span></div><div class="race-audit-filters"><label>確認状況<select id="raceAuditStatus"><option value="attention">要確認のみ</option><option value="all">すべて</option>${Object.entries(RACE_AUDIT_LABELS).map(([key,text])=>`<option value="${key}">${text}</option>`).join('')}</select></label><label>競馬場<select id="raceAuditVenue"><option value="all">全競馬場</option>${VENUES.map(v=>`<option value="${v}">${v}</option>`).join('')}</select></label><label class="race-audit-search">日付・名称・出典を検索<input id="raceAuditQuery" type="search" maxlength="200" placeholder="例：札幌、2026-10-18" autocomplete="off"></label></div><p class="help" id="raceAuditCount" role="status"></p><div id="raceAuditResults" class="race-audit-results"></div><button type="button" class="quiet full" id="raceAuditMore" hidden>さらに40件表示</button></details><details class="manual-race-panel" id="manualRaceDetails"><summary>レース情報を1件手入力</summary><p class="help">自分で確認した情報を端末内に保存します。自動取得・公式認証ではありません。出典URLを確認し、開催変更・中止には注意してください。馬券・収支・育成データには触れません。</p><form id="manualRaceForm"><label>開催日<input type="date" name="date" required min="2000-01-01" max="2199-12-31" value="${jstToday()}"></label><label>競馬場<select name="venue">${VENUES.map(v=>`<option value="${v}">${v}</option>`).join('')}</select></label><label>レース番号<select name="number">${Array.from({length:12},(_,i)=>`<option value="${i+1}">${i+1}R</option>`).join('')}</select></label><label>レース名（任意）<input type="text" name="name" maxlength="100" autocomplete="off"></label><label>コース種別<select name="surface"><option value="">未入力</option><option value="芝">芝</option><option value="ダート">ダート</option><option value="障害">障害</option></select></label><label>距離（m、任意）<input type="number" name="distance" min="100" max="10000" step="1" inputmode="numeric" placeholder="例：1600"></label><label>自分で確認した出典URL（HTTPS、必須）<input type="url" name="sourceURL" required maxlength="1000" placeholder="https://..." autocomplete="url"></label><button type="submit" class="quiet full">内容を確認する</button></form><div id="manualRacePreview" aria-live="polite"></div></details><details class="manual-correction-panel" id="manualCorrections"><summary>登録済みレース情報を訂正（${Math.min(manualRows.length,40)}件表示）</summary><p class="help">未検証の手入力と同じ形式のレース情報だけを表示します。開催日・競馬場・レース番号は変更できません。結果・払戻・馬券履歴は変更しません。訂正内容の出典を必ず確認してください。</p><div class="manual-correction-list">${manualRows.slice(0,40).map((r,i)=>`<div class="manual-correction-row"><div><strong>${esc(label(r))}</strong><small>要確認 · ${esc(r.surface||'コース未入力')} ${r.distance?r.distance+'m':''}</small><a href="${esc(r.sourceURL)}" target="_blank" rel="noopener noreferrer">現在の出典</a></div><button class="quiet" type="button" data-correct-race="${i}" ${warning?'disabled':''}>訂正</button></div>`).join('')||'<p class="help">訂正できる未検証レースはまだありません。</p>'}</div><div id="manualCorrectionEditor"></div></details><label>開催JSONを選ぶ<input id="calendarFile" type="file" accept=".json,application/json" ${warning?'disabled':''}></label><div id="calendarPreview" aria-live="polite"></div><div class="candidate-buttons"><button id="calendarExport" class="quiet">書き出す</button><button id="calendarTemplate" class="quiet">空のひな形</button></div><details><summary>保存内容・使い方</summary><p class="help">端末内だけで読み込みます。収支バックアップとは別形式です。省略された開催は残ります。日程・番号の変更は旧情報を「変更・中止」にしてから新情報を追加してください。馬券履歴は付け替えません。</p><p class="help">認可前・予定・入力された情報の真偽は出典で確認してください。</p><p class="help">開催一覧は先頭100件。全件は書き出しで確認できます。</p><div class="calendar-list">${state.calendar.meetings.slice(0,100).map(r=>`<p>${esc(label(r))} · ${STATUS[r.status]}<br><a href="${esc(r.sourceURL)}" target="_blank" rel="noopener noreferrer">出典</a> / ${esc(r.sourceUpdatedAt)}</p>`).join('')||'保存データなし'}</div></details><details><summary>カレンダーを削除</summary><p class="help">開催JSONの情報だけを削除します。馬券・収支・育成・従来のレースキャッシュは保持します。</p><button id="calendarClear" class="danger" ${warning?'disabled':''}>開催データだけ削除</button></details><p id="calendarMessage" role="status"></p></section>`;
 const q=s=>el.querySelector(s),message=s=>q('#calendarMessage').textContent=s;
 q('#manualRaceForm').oninput=()=>{manualPending=null;q('#manualRacePreview').replaceChildren();onDirty(Boolean(pending));};
 q('#manualRaceForm').onsubmit=e=>{
  e.preventDefault();manualPending=null;q('#manualRacePreview').replaceChildren();
  if(working||!e.currentTarget.reportValidity())return;
  const f=e.currentTarget;const values=Object.fromEntries(new FormData(f));
  try{
   manualPending=planManualRace(state.calendar,values);
   const p=manualPending.preview;
   onDirty(true);
   q('#manualRacePreview').innerHTML=`<h3>保存前の確認</h3><p><strong>${esc(p.date)} ${esc(p.venue)} ${p.number}R ${esc(p.name)}</strong></p><p class="help">コース：${esc(p.surface||'未入力')} ${p.distance?p.distance+'m':'距離未入力'} / ${p.createdMeeting?'開催情報も新しく追加':'既存の開催に追加'}<br>出典：${esc(p.sourceURL)}</p><p class="help">この情報は本人入力・未検証です。開催中止や変更は自動反映されません。</p><label class="checklabel"><input type="checkbox" id="manualRaceAgree">情報と出典・開催状態を確認した</label><button type="button" id="manualRaceApply" class="full">このレース情報を保存</button>`;
   q('#manualRaceApply').onclick=async()=>{
    if(working||!manualPending)return;
    if(!q('#manualRaceAgree').checked){message('出典と内容を確認し、チェックしてください。');return;}
    working=true;generation++;
    q('#manualRaceApply').disabled=true;
    try{
     const saved=await saveCalendar(manualPending.calendar,state.revision);
     manualPending=null;onDirty(false);onSave(saved);
     message('レース情報を保存しました。馬券・収支は変更していません。馬券登録画面で日付と競馬場を選ぶと候補に表示されます。');
    }catch(err){message('保存できません：'+err.message);if(el.isConnected&&q('#manualRaceApply'))q('#manualRaceApply').disabled=false;}
    finally{working=false;}
   };
  }catch(err){onDirty(Boolean(pending));message('手入力できません：'+err.message);}
 };

 const openCorrection=index=>{
  if(working)return;
  const race=manualRows[index],key=race.date+'|'+race.venue+'|'+race.number;
  correctionPending=null;onDirty(Boolean(pending)||Boolean(manualPending));
  q('#manualCorrectionEditor').innerHTML=`<form id="manualCorrectionForm"><h3>${esc(label(race))} を訂正</h3><p class="help">開催日・競馬場・R番号は固定です。日程変更・レース番号変更には開催JSONで変更前後の記録を管理してください。</p><label>レース名（任意）<input name="name" maxlength="100" value="${esc(race.name||'')}"></label><label>コース<select name="surface"><option value="">未入力</option>${['芝','ダート','障害'].map(k=>`<option value="${k}" ${race.surface===k?'selected':''}>${k}</option>`).join('')}</select></label><label>距離（m、任意）<input name="distance" type="number" min="100" max="10000" step="1" inputmode="numeric" value="${race.distance||''}"></label><label>再確認した出典URL（HTTPS、必須）<input name="sourceURL" type="url" required maxlength="1000" value="${esc(race.sourceURL)}"></label><div class="manual-correction-controls"><button class="quiet" type="button" id="manualCorrectionCancel">閉じる</button><button type="submit">訂正内容を確認する</button></div></form><div id="manualCorrectionPreview" role="status" aria-live="polite"></div>`;
  q('#manualCorrectionCancel').onclick=()=>{correctionPending=null;q('#manualCorrectionEditor').replaceChildren();onDirty(Boolean(pending)||Boolean(manualPending));};
  q('#manualCorrectionForm').oninput=()=>{correctionPending=null;q('#manualCorrectionPreview').replaceChildren();};
  q('#manualCorrectionForm').onsubmit=e=>{
   e.preventDefault();correctionPending=null;q('#manualCorrectionPreview').replaceChildren();
   if(working||!e.currentTarget.reportValidity())return;
   try{
    correctionPending=planManualCorrection(state.calendar,key,Object.fromEntries(new FormData(e.currentTarget)));
    const x=correctionPending,fmt=r=>`${r.name||'名称未入力'} / ${r.surface||'未入力'} ${r.distance?r.distance+'m':'距離未入力'} / ${r.sourceURL}`;
    onDirty(true);
    q('#manualCorrectionPreview').innerHTML=`<h3>訂正前後を比較</h3><p>変更項目：${x.changed.map(k=>({name:'レース名',surface:'コース',distance:'距離',sourceURL:'出典URL'})[k]).join('・')}</p><p class="help">訂正前：${esc(fmt(x.before))}</p><p class="help">訂正後：${esc(fmt(x.after))}</p><p class="help">レース照合キー（${esc(key)}）と既存の馬券・払戻は変更しません。</p><label class="checklabel"><input type="checkbox" id="manualCorrectionAgree">訂正内容と出典を再確認した</label><button type="button" id="manualCorrectionApply" class="full">この訂正を保存する</button>`;
    q('#manualCorrectionApply').onclick=async()=>{
     if(working||!correctionPending)return;
     if(!q('#manualCorrectionAgree').checked){message('訂正前後と出典を確認し、チェックしてください。');return;}
     working=true;q('#manualCorrectionApply').disabled=true;
     try{
      const saved=await saveCalendar(correctionPending.calendar,state.revision);
      correctionPending=null;onDirty(false);onSave(saved);
      message('レース情報を訂正しました。馬券・収支・育成は変更していません。');
     }catch(err){message('訂正を保存できません：'+err.message);const b=q('#manualCorrectionApply');if(b)b.disabled=false;}
     finally{working=false;}
    };
   }catch(err){onDirty(Boolean(pending)||Boolean(manualPending));message('訂正を確認できません：'+err.message);}
  };
 };
 q('#manualCorrections').querySelectorAll('[data-correct-race]').forEach(button=>button.onclick=()=>openCorrection(Number(button.dataset.correctRace)));
 let auditLimit=40;
 const renderAudit=()=>{
  const filtered=filterRaceAudit(audit,{status:q('#raceAuditStatus').value,venue:q('#raceAuditVenue').value,query:q('#raceAuditQuery').value,limit:auditLimit});
  q('#raceAuditCount').textContent=`該当 ${filtered.total} 件／表示 ${filtered.visible.length} 件（最新の日付順）。保存データの内容は自動検証されません。`;
  q('#raceAuditResults').innerHTML=filtered.visible.map(r=>{
   const idx=manualRows.findIndex(x=>x.date===r.date&&x.venue===r.venue&&x.number===r.number);
   const allowed=idx>=0&&r.auditStatus!=='blocked';
   return `<div class="race-audit-row"><div class="race-audit-info"><strong>${esc(label(r))}</strong><small>${esc(RACE_AUDIT_LABELS[r.auditStatus])} · ${esc(r.surface||'コース未入力')} ${r.distance?r.distance+'m':'距離未入力'}</small><small>保存情報の更新：${esc(stamp(r.retrievedAt))}</small><a href="${esc(r.sourceURL)}" target="_blank" rel="noopener noreferrer">出典を開く</a></div>${allowed?`<button type="button" class="quiet" data-audit-correct="${idx}">訂正</button>`:''}</div>`;
  }).join('')||'<p class="help">この条件のレース情報はありません。</p>';
  q('#raceAuditMore').hidden=!filtered.hasMore;
  q('#raceAuditResults').querySelectorAll('[data-audit-correct]').forEach(button=>button.onclick=()=>{
   q('#manualCorrections').open=true;
   openCorrection(Number(button.dataset.auditCorrect));
   const input=q('#manualCorrectionForm [name="name"]');
   input?.scrollIntoView({block:'nearest',behavior:'instant'});
   input?.focus({preventScroll:true});
  });
 };
 for(const field of ['raceAuditStatus','raceAuditVenue','raceAuditQuery']){
  q('#'+field).addEventListener(field==='raceAuditQuery'?'input':'change',()=>{auditLimit=40;renderAudit();});
 }
 q('#raceAuditMore').onclick=()=>{auditLimit=Math.min(30000,auditLimit+40);renderAudit();};
 renderAudit();
 q('#calendarExport').onclick=()=>download(state.calendar).catch(e=>message(e.message));q('#calendarTemplate').onclick=()=>download(emptyCalendar()).catch(e=>message(e.message));
 q('#calendarFile').onchange=async e=>{const token=++generation;pending=null;q('#calendarPreview').replaceChildren();onDirty(false);const file=e.target.files[0];if(!file)return;try{if(file.size>10*1024*1024)throw new Error('10MB以下のJSONを選んでください。');const raw=await file.text();if(token!==generation||!el.isConnected)return;const incoming=validateCalendar(JSON.parse(raw));pending=planCalendar(state.calendar,incoming);onDirty(true);q('#calendarPreview').innerHTML=`<h3>取り込み確認</h3><p>${counts(incoming)}</p><p>追加 ${pending.added} / 更新 ${pending.updated} / 同一 ${pending.duplicates}</p><p class="help">更新内容は入力情報です。古い情報への差し戻し・開催変更も出典と照合してください。</p><details><summary>新旧差分を確認（${pending.changes.length}件）</summary><p class="help">最初の100件を表示。全件は差分JSONで確認できます。</p><button id="calendarDiffExport" class="quiet">全差分を書き出す</button><div class="calendar-list">${pending.changes.slice(0,100).map(c=>`<details><summary>${esc(c.key)} ${c.before?'更新':'追加'}</summary><pre>旧：${esc(JSON.stringify(c.before,null,2))}\n新：${esc(JSON.stringify(c.after,null,2))}</pre></details>`).join('')}</div></details><label class="checklabel"><input type="checkbox" id="calendarAgree">内容と利用条件を確認した</label><button id="calendarApply">取り込む</button>`;q('#calendarDiffExport').onclick=()=>download({format:'umalog-calendar-diff',version:1,changes:pending.changes}).catch(e=>message(e.message));q('#calendarApply').onclick=async()=>{if(working||!pending)return;if(!q('#calendarAgree').checked){message('確認にチェックしてください。');return;}working=true;++generation;q('#calendarApply').disabled=true;q('#calendarFile').disabled=true;try{const saved=await saveCalendar(pending.calendar,state.revision);onDirty(false);onSave(saved);message('取り込み完了。収支・育成データは変更していません。');}catch(e){message(e.message);}finally{working=false;if(el.isConnected){q('#calendarFile').disabled=false;const b=q('#calendarApply');if(b)b.disabled=false;}}};}catch(e){pending=null;message('取り込みできません：'+e.message);}};
 q('#calendarClear').onclick=async()=>{if(working||!confirm('開催データだけを削除しますか？'))return;working=true;++generation;try{const saved=await saveCalendar(emptyCalendar(),state.revision);onDirty(false);onSave(saved);message('開催データだけ削除しました。');}catch(e){message(e.message);}finally{working=false;}};
}

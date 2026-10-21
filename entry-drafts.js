// v1.3.0 RC: isolated autosaved draft; never included in settled-ledger accounting.
import {VENUES,TYPES,check,combination,money,validDate} from './core.js';
import {saveEntryDraft} from './db.js';
const modes=['normal','box','flow','formation'];
const statuses=['pending','settled','void'];
export function validateEntryDraft(value){
 check(value&&value.version===1&&typeof value.key==='string'&&value.key.length<130,'下書きの形式が不正です。');
 const r=value.race;
 check(r&&validDate(r.date)&&VENUES.includes(r.venue)&&['',...Array.from({length:12},(_,i)=>String(i+1))].includes(r.number)&&typeof r.name==='string'&&r.name.length<=100,'下書きのレースが不正です。');
 check(Array.isArray(value.lines)&&value.lines.length<=10000,'下書きの買い目が不正です。');
 const ids=new Set();
 for(const l of value.lines){
  check(l&&typeof l.id==='string'&&l.id.length>0&&l.id.length<=100&&!ids.has(l.id),'下書きの買い目IDが不正です。');ids.add(l.id);
  check(TYPES.includes(l.type)&&(l.purchaseMode===undefined||modes.includes(l.purchaseMode))&&statuses.includes(l.status),'下書きの券種・結果が不正です。');
  check(JSON.stringify(combination(l.type,l.numbers))===JSON.stringify(l.numbers),'下書きの組番が不正です。');
  money(l.stake,true);
  check((Number.isNaN(l.payout)||Number.isSafeInteger(l.payout)&&l.payout>=0)&&Number.isSafeInteger(l.refund)&&l.refund>=0&&l.refund<=l.stake,'下書きの払戻・返還が不正です。');
  check(l.status!=='void'||(l.payout===0&&l.refund===l.stake),'下書きの返還が不正です。');
  check(l.status!=='pending'||(l.payout===0&&l.refund===0),'下書きの未入力結果が不正です。');
 }
 check(value.fields&&typeof value.fields==='object'&&!Array.isArray(value.fields),'下書きの入力が不正です。');
 const fieldNames=['type','mode','numbers','stake','duplicate','memo','saveNextRace','allowUnfinished'];
 for(const field of fieldNames)check(typeof value.fields[field]==='string'&&value.fields[field].length<=4000,'下書きの入力項目が不正です。');
 check(Number.isFinite(Date.parse(value.updatedAt)),'下書きの保存日時が不正です。');
 check(typeof value.baseSignature==='string'&&value.baseSignature.length<=800000,'下書きの元記録情報が不正です。');
 return value;
}

export function createEntryDraftAutosaver({key,capture,onSaved,onError,delay=350,persist=saveEntryDraft}){
 let timer=null,writing=Promise.resolve(),enabled=false,stopped=false,failure=null;
 function write(){
  clearTimeout(timer);timer=null;
  if(!enabled||stopped)return writing;
  try{
   const snapshot=validateEntryDraft(capture());
   writing=writing.catch(()=>{}).then(()=>persist(key,snapshot)).then(()=>{failure=null;onSaved(snapshot);},error=>{failure=error;onError(error);});
  }catch(error){failure=error;onError(error);}
  return writing;
 }
 return {
  start(){if(stopped)return;enabled=true;},
  schedule(){if(!enabled||stopped)return;clearTimeout(timer);timer=setTimeout(write,delay);},
  async flush(){if(timer||failure)await write();else await writing;if(failure)throw failure;},
  async pauseForCommit(){enabled=false;clearTimeout(timer);timer=null;await writing;},
  resume(){if(!stopped)enabled=true;},
  stop(){enabled=false;stopped=true;clearTimeout(timer);timer=null;return writing;}
 };
}

// Pure generators for purchased JRA ticket combinations. They never mutate ledger data.
import {TYPES,box,combination,check,money,uid} from './core.js';
// Read-only review. Same combinations across modes remain separate purchases.
export function reviewBets(lines){
 let total=0;const groups=new Map();
 for(const line of lines){
  const key=line.type+':'+combination(line.type,line.numbers).join(',');
  total=money(total+money(line.stake,true));
  const group=groups.get(key)||{key,type:line.type,numbers:combination(line.type,line.numbers),count:0,total:0};
  group.count++;group.total+=line.stake;groups.set(key,group);
 }
 return {count:lines.length,total,duplicates:[...groups.values()].filter(g=>g.count>1)};
}
const ordered=t=>t==='馬単'||t==='三連単';
const triple=t=>t==='三連複'||t==='三連単';
const single=t=>t==='単勝'||t==='複勝';
const maxNumber=t=>t==='枠連'?8:18;
const group=(raw,t)=>{
 check(Array.isArray(raw),'番号を選択してください。');
 check(raw.length<=maxNumber(t),'選択した番号が多すぎます。');
 const ns=raw.map(Number);
 check(ns.every(n=>Number.isInteger(n)&&n>=1&&n<=maxNumber(t)),'番号が正しくありません。');
 check(new Set(ns).size===ns.length,'同じグループ内で番号が重複しています。');
 return ns;
};
const MAX_LINES=10000;
export function generateBets(type,mode,options={}){
 check(TYPES.includes(type),'券種が不正です。');
 check(['normal','box','flow','formation'].includes(mode),'買い方が正しくありません。');
 if(single(type))check(mode==='normal'||mode==='box','単勝・複勝は通常またはBOXを選択してください。');
 if(mode==='normal')return [combination(type,options.numbers)];
 if(mode==='box'){
  const result=box(type,options.numbers);
  check(result.length<=MAX_LINES,'点数が多すぎます。');return result;
 }
 const results=[],seen=new Set();
 const put=ns=>{
  if(type!=='枠連'&&new Set(ns).size!==ns.length)return;
  const line=combination(type,ns),key=line.join(',');
  if(seen.has(key))return;seen.add(key);results.push(line);
  check(results.length<=MAX_LINES,'点数が多すぎます。');
 };
 if(mode==='formation'){
  const count=triple(type)?3:2;
  check(Array.isArray(options.groups)&&options.groups.length===count,'各列の番号を指定してください。');
  const groups=options.groups.map(ns=>group(ns,type));
  check(groups.every(g=>g.length),'すべての列で番号を選択してください。');
  if(count===2){for(const a of groups[0])for(const b of groups[1])put([a,b]);}
  else for(const a of groups[0])for(const b of groups[1])for(const c of groups[2])put([a,b,c]);
 }else{
  const axes=group(options.axes||[],type),partners=group(options.partners||[],type);
  const axisCount=Number(options.axisCount||1);
  check(axes.length===axisCount,'軸の番号を選択してください。');
  check(partners.length,'相手の番号を選択してください。');
  check(!triple(type)||axisCount===1||axisCount===2,'軸は1頭または2頭にしてください。');
  check(triple(type)||axisCount===1,'2頭軸は三連複・三連単のみ利用できます。');
  const position=options.position||'first';
  if(!triple(type)){
   check(!ordered(type)||['first','second','multi'].includes(position),'流しの位置が正しくありません。');
   for(const p of partners){
    if(!ordered(type))put([axes[0],p]);
    else if(position==='first')put([axes[0],p]);
    else if(position==='second')put([p,axes[0]]);
    else{put([axes[0],p]);put([p,axes[0]]);}
   }
  }else if(axisCount===1){
   const axis=axes[0];
   check(!ordered(type)||['first','second','third','multi'].includes(position),'流しの位置が正しくありません。');
   for(let i=0;i<partners.length;i++)for(let j=i+1;j<partners.length;j++){
    const a=partners[i],b=partners[j];
    if(!ordered(type))put([axis,a,b]);
    else if(position==='multi'){
     for(const v of [[axis,a,b],[axis,b,a],[a,axis,b],[b,axis,a],[a,b,axis],[b,a,axis]])put(v);
    }else if(position==='first'){put([axis,a,b]);put([axis,b,a]);}
    else if(position==='second'){put([a,axis,b]);put([b,axis,a]);}
    else{put([a,b,axis]);put([b,a,axis]);}
   }
  }else{
   const [a,b]=axes;
   check(!ordered(type)||['first','second','third','multi'].includes(position),'流しの位置が正しくありません。');
   for(const p of partners){
    if(!ordered(type))put([a,b,p]);
    else if(position==='multi'){
     for(const v of [[a,b,p],[a,p,b],[b,a,p],[b,p,a],[p,a,b],[p,b,a]])put(v);
    }else if(position==='first')put([a,b,p]); // two axes occupy 1st and 2nd
    else if(position==='second')put([a,p,b]); // two axes occupy 1st and 3rd
    else put([p,a,b]);                       // two axes occupy 2nd and 3rd
   }
  }
 }
 check(results.length>0,'有効な組み合わせがありません。番号を確認してください。');
 return results;
}

/* Read-only recent-purchase shortcuts; historical race and payout never transfer. */
export function recentPurchaseTemplates(data,{limit=4,maxLines=200}={}){
 const races=new Map(data.races.map(r=>[r.id,r])),byTicket=new Map();
 for(const line of data.lines){if(!byTicket.has(line.ticketId))byTicket.set(line.ticketId,[]);byTicket.get(line.ticketId).push(line);}
 return [...data.tickets].map(ticket=>({ticket,race:races.get(ticket.raceId),lines:byTicket.get(ticket.id)||[]}))
  .filter(x=>x.race&&x.lines.length>0&&x.lines.length<=maxLines)
  .sort((a,b)=>b.race.date.localeCompare(a.race.date)||b.ticket.createdAt.localeCompare(a.ticket.createdAt))
  .slice(0,limit)
  .map(x=>({id:x.ticket.id,date:x.race.date,venue:x.race.venue,number:x.race.number,type:x.ticket.type,
    count:x.lines.length,total:x.lines.reduce((n,l)=>n+l.stake,0),
    lines:x.lines.map(l=>({numbers:[...l.numbers],stake:l.stake,purchaseMode:l.purchaseMode||'normal'}))}));
}
export function copyPurchaseTemplate(template,idFactory=uid){
 check(template&&TYPES.includes(template.type)&&Array.isArray(template.lines)&&template.lines.length>0&&template.lines.length<=200,'再利用できる購入記録ではありません。');
 return template.lines.map(line=>{
  const numbers=combination(template.type,line.numbers);
  check(JSON.stringify(numbers)===JSON.stringify(line.numbers),'購入記録の組番が不正です。');
  const stake=money(line.stake,true),purchaseMode=['normal','box','flow','formation'].includes(line.purchaseMode)?line.purchaseMode:'normal';
  return {id:idFactory(),type:template.type,numbers:[...numbers],stake,purchaseMode,status:'pending',payout:0,refund:0};
 });
}

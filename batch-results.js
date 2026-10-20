// Manual candidate detection only. Never apply a JRA result or infer payout money.
// A completed unique 1st–3rd horse-number podium is required. Dead heats,
// cancelled races, bracket (枠) mapping and special placings require manual checking.
import {check,validatePodium,combination} from './core.js';

const equal=(a,b)=>a.length===b.length&&a.every((v,i)=>v===b[i]);
const sort=a=>[...a].sort((x,y)=>x-y);
export function candidateOutcome(type,numbers,podium,context={}){
 const top=validatePodium(podium);
 // Explicit user confirmation of a final, ordinary race is required.
 // Exceptional races are deliberately not inferred from three horse numbers.
 if(context.normalConfirmed!==true||context.deadHeat||context.cancelled||context.scratched||context.excluded||context.refund||context.corrected)return 'unknown';
 if(top.some(n=>n===null))return 'unknown';
 if(!Array.isArray(numbers))return 'unknown';
 try{numbers=combination(type,numbers);}catch{return 'unknown';}
 const [first,second,third]=top;
 const has=nums=>nums.every(n=>top.includes(n));
 const fst=[first,second], tri=[first,second,third];
 switch(type){
  case '単勝':return numbers[0]===first?'hit':'miss';
  case '複勝':{
   const count=context.startersAtSale;
   if(!Number.isInteger(count)||count<5||count>18)return 'unknown';
   return top.slice(0,count<=7?2:3).includes(numbers[0])?'hit':'miss';
  }
  case '枠連':return 'unknown'; // cannot infer frame number from horse number
  case '馬連':return equal(sort(numbers),sort(fst))?'hit':'miss';
  case '馬単':return equal(numbers,fst)?'hit':'miss';
  case 'ワイド':return has(numbers)?'hit':'miss';
  case '三連複':return equal(sort(numbers),sort(tri))?'hit':'miss';
  case '三連単':return equal(numbers,tri)?'hit':'miss';
  default:return 'unknown';
 }
}
export function raceCandidates(data,raceId,podium,context={}){
 const race=data.races.find(r=>r.id===raceId);
 check(race,'レースが見つかりません。');
 const top=validatePodium(podium);
 const types=new Map(data.tickets.filter(t=>t.raceId===raceId).map(t=>[t.id,t.type]));
 return data.lines.filter(l=>types.has(l.ticketId)).map(l=>({
  lineId:l.id,ticketId:l.ticketId,type:types.get(l.ticketId),
  numbers:[...l.numbers],stake:l.stake,payout:l.payout,refund:l.refund,status:l.payout===0&&l.refund===0?'candidate':'recorded',
  candidate:l.payout===0&&l.refund===0?candidateOutcome(types.get(l.ticketId),l.numbers,top,context):'settled'
 }));
}

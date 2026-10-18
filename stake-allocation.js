// v1.8.1 read/update draft allocation without touching bets or settlement.
import {money,check} from './core.js';
export const STAKE_PRESETS=[100,200,500,1000];
export function stakeBreakdown(lines){
 check(Array.isArray(lines),'買い目が不正です。');
 const result={count:lines.length,total:0,nonUniform:false,first:null};
 for(const line of lines){
  const amount=money(line.stake,true);
  if(result.first===null)result.first=amount;
  if(result.first!==amount)result.nonUniform=true;
  result.total=money(result.total+amount);
 }
 return result;
}
const validateChange=(line,amount)=>{
 const next=money(Number(amount),true);
 check(line&&typeof line==='object','編集する買い目が不正です。');
 check(line.refund===undefined||line.refund<=next,'返還金より少ない購入額には変更できません。');
 check(line.status!=='void'||line.stake===next,'全額返還の金額変更は詳細画面から行ってください。');
 check(!(line.status==='settled'&&line.refund===line.stake&&line.refund>0&&line.stake!==next),'全額返還済みの金額変更は詳細画面から行ってください。');
 return next;
};
export function setIndividualStake(lines,index,amount){
 check(Array.isArray(lines)&&Number.isInteger(index)&&index>=0&&index<lines.length,'編集する買い目が見つかりません。');
 const stake=validateChange(lines[index],amount);
 const output=lines.map((line,i)=>i===index?{...line,stake}:line);
 stakeBreakdown(output);
 return output;
}
export function setUniformStakes(lines,amount){
 check(Array.isArray(lines)&&lines.length>0,'買い目を追加してください。');
 const output=lines.map(line=>({...line,stake:validateChange(line,amount)}));
 stakeBreakdown(output);
 return output;
}

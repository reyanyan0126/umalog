// Read-only character presentation. Purchase, payout and loss never affect mood.
import {STAGES,STAGE_NAMES} from './core.js';
import {companionProgress} from './growth-v2.js';
export const THEME_NAMES={meadow:'草原',room:'おへや',stars:'星空'};
export const OUTFIT_NAMES={none:'なし',ribbon:'リボン',clover:'四つ葉',scarf:'マフラー'};
export const OUTFIT_ICONS={none:'',ribbon:'🎀',clover:'🍀',scarf:'🧣'};
export function companionState(data,date){
 const g=data.growthV2,stage=data.character.stage,bond=g.bond,careCount=g.careDay===date?g.careCount:0;
 const life=companionProgress(g,date);
 const moods=[
  {id:'cozy',label:'のんびり',line:'一緒にのんびりしている。'},
  {id:'curious',label:'わくわく',line:'新しいことを見つけたみたい。'},
  {id:'friend',label:'なかよし',line:'そばにいると、安心するみたい。'}
 ];
 const mood=bond>=30?moods[2]:stage>=2?moods[1]:moods[0];
 const phrase=life.restedToday?'ひと休みして、気持ちよさそう。':life.playCount>=2?'たくさん遊んで、楽しそう。':careCount===3?'今日はたくさん遊んだね。':mood.line;
 return {...mood,stage,careCount,remaining:Math.max(0,3-careCount),playCount:life.playCount,theme:life.theme,outfit:life.outfit,phrase};
}
export function companionAlbum(data,date){
 const exp=data.character?.exp||0,progress=companionProgress(data.growthV2,date);
 return {stages:STAGES.map((threshold,i)=>({stage:i,name:STAGE_NAMES[i],required:threshold,unlocked:exp>=threshold})),
  memories:[...progress.memories].reverse().map(m=>({...m,label:m.kind==='play'?'一緒に遊んだ日':'ひと休みした日'})),
  theme:progress.theme};
}
export function stageArtwork(stage){
 if(!Number.isInteger(stage)||stage<0||stage>4)throw new Error('成長段階が不正です。');
 return './assets/companion-'+stage+'.svg';
}

// Companion presentation only. No betting outcome, stake or payout influences mood.
export function companionState(data,date){
 const g=data.growthV2,stage=data.character.stage,bond=g.bond,careCount=g.careDay===date?g.careCount:0;
 const moods=[
  {id:'cozy',label:'のんびり',line:'一緒にのんびりしている。'},
  {id:'curious',label:'わくわく',line:'新しいことを見つけたみたい。'},
  {id:'friend',label:'なかよし',line:'そばにいると、安心するみたい。'}
 ];
 const mood=bond>=30?moods[2]:stage>=2?moods[1]:moods[0];
 return {...mood,stage,careCount,remaining:Math.max(0,3-careCount),
  phrase:careCount===3?'今日はたくさん遊んだね。':mood.line};
}
export function stageArtwork(stage){
 if(!Number.isInteger(stage)||stage<0||stage>4)throw new Error('成長段階が不正です。');
 return './assets/companion-'+stage+'.svg';
}

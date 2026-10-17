// Read-only decorative milestones derived from existing ledger and growthV2 data.
// Never grants EXP, affects payouts or expands saved schemas.
export function growthRewards(data){
 const g=data.growthV2||{bond:0,learned:[]};
 const exp=data.character?.exp||0;
 const days=new Set(data.races.map(r=>r.date)).size;
 const learned=g.learned?.length||0, bond=g.bond||0;
 const rewards=[
  {id:'sprout',icon:'🌱',name:'はじめの一歩',description:'育成EXPが40に到達',current:exp,goal:40},
  {id:'friend',icon:'🌸',name:'なかよし',description:'なつき度が10に到達',current:bond,goal:10},
  {id:'scholar',icon:'📚',name:'ものしり',description:'券種図鑑を4種類読む',current:learned,goal:4},
  {id:'diary',icon:'📖',name:'記録の習慣',description:'異なる10日分の記録を残す',current:days,goal:10},
  {id:'horse',icon:'⭐',name:'ちいさな相棒',description:'育成EXPが400に到達',current:exp,goal:400}
 ];
 return rewards.map(r=>({...r,unlocked:r.current>=r.goal,progress:Math.min(100,Math.floor(100*r.current/r.goal))}));
}

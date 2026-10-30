import {emptyData} from '../../core.js';
import {migrateGrowth} from '../../growth-v2.js';
// Synthetic purchases only. Half detailed, half simple; never a user's database.
export function qualityLedger(count){
 const d=migrateGrowth(emptyData(),new Date('2026-10-01T00:00:00Z'));
 d.simpleEntries=[];const raceIds=new Map();
 for(let i=0;i<count;i++){
  const date=new Date(Date.UTC(2026,0,1+i%365)).toISOString().slice(0,10),venue=i%3?'東京':'京都',number=i%12+1;
  const status=i%5===0?'pending':'settled',refund=status==='pending'?0:i%7===0?100:0,payout=status==='pending'||refund?0:i%3===0?230:0;
  if(i%2){d.simpleEntries.push({id:'s'+i,date,venue,number,type:'単勝',name:'合成',memo:'',stake:100,status,payout,refund});continue;}
  const key=[date,venue,number].join('|');let rid=raceIds.get(key);
  if(!rid){rid='r'+i;raceIds.set(key,rid);d.races.push({id:rid,date,venue,number,name:'合成レース'});}
  const id='t'+i;d.tickets.push({id,raceId:rid,type:'単勝',kind:'reported',memo:'',createdAt:date+'T00:00:00Z'});
  d.lines.push({id:'l'+i,ticketId:id,numbers:[1],stake:100,status,payout,refund});
 }
 return d;
}

// Deterministic, offline-only personal analytics. No prediction or external data access.
const settled = l => l.status === 'settled' && Number.isFinite(l.payout) && Number.isFinite(l.stake) && Number(l.refund||0)<Number(l.stake);
const popularityMap=meta=>{
 const map=new Map();
 for(let p=1;p<=3;p++){
  const n=Number(String(meta[p+'着']||'').match(/^0?(\\d{1,2})(?=\\s)/)?.[1]);
  const pop=Number(meta[p+'着単勝人気']);
  if(n>0&&pop>0&&Number.isInteger(pop))map.set(n,pop);
 }
 for(const row of String(meta['出走馬']||'').split(/[\\n;；]/)){
  const m=row.trim().match(/^(\\d{1,2})[：:、,\\s]+.*?(\\d+)番人気/);
  if(m&&!map.has(Number(m[1])))map.set(Number(m[1]),Number(m[2]));
 }
 return map;
};
const num = n => Number.isFinite(Number(n)) ? Number(n) : 0;
export function buildPersonalAnalytics(source){
 const races = new Map(source.races.map(r=>[r.id,r]));
 const tickets = new Map(source.tickets.map(t=>[t.id,t]));
 const groups = new Map();
 const overall={stake:0,payout:0,refund:0,lines:0,hits:0,pending:0,races:0,hitRaces:0};
 const raceHit=new Map(),raceSeen=new Set();
 const add=(axis,key,line)=>{
  if(!key)return;
  const id=axis+':'+key,g=groups.get(id)||{axis,key,stake:0,payout:0,refund:0,lines:0,hits:0};
  g.stake+=num(line.stake);g.payout+=num(line.payout);g.refund+=num(line.refund);g.lines++;if(num(line.payout)>0)g.hits++;groups.set(id,g);
 };
 for(const line of source.lines){
  const ticket=tickets.get(line.ticketId),race=ticket&&races.get(ticket.raceId);
  if(!race||!settled(line)){if(race&&line.status==='pending')overall.pending++;continue;}
  raceSeen.add(race.id);if(num(line.payout)>0)raceHit.set(race.id,true);
  overall.stake+=num(line.stake);overall.payout+=num(line.payout);overall.refund+=num(line.refund);overall.lines++;if(line.payout>0)overall.hits++;
  add('競馬場',race.venue,line);add('券種',ticket.type,line);
  const m=ticket.aiImport?.metadata||{};
  const nums=Array.isArray(line.numbers)?line.numbers.map(Number):[];
  const popularity=popularityMap(m);
  const pops=nums.map(n=>popularity.get(n)).filter(n=>n>0);
  if(pops.length===nums.length&&nums.length){
   const max=Math.max(...pops);
   add('人気帯',max<=3?'全頭3番人気以内':max<=6?'6番人気以内を含む':'7番人気以下を含む',line);
  }
  if(nums.length){add('買い目構成',nums.length+'頭組',line);}
  if(ticket.type==='ワイド'||ticket.type==='馬連'||ticket.type==='馬単'||ticket.type==='三連複'||ticket.type==='三連単'){
   const key=nums.length===2?'2頭':nums.length===3?'3頭':'';if(key)add('組み合わせ頭数',key,line);
  }
  const surface=m['芝・ダート']||'';if(surface)add('馬場種別',surface,line);
  const distance=Number(String(m['距離']||'').replace(/[^0-9]/g,''));if(distance>0&&distance<=5000)add('距離',distance+'m',line);
  const count=Number(m['出走頭数']);if(count>=2&&count<=30)add('頭数',count+'頭',line);
  const size=line.stake<=100?'100円':line.stake<=500?'101〜500円':line.stake<=1000?'501〜1,000円':'1,001円以上';add('1点購入額',size,line);
 }
 overall.races=raceSeen.size;overall.hitRaces=raceHit.size;
 const rows=[...groups.values()].map(g=>({...g,profit:g.payout+g.refund-g.stake,roi:g.stake?100*(g.payout+g.refund)/g.stake:null,hitRate:g.lines?100*g.hits/g.lines:null})).sort((a,b)=>b.stake-a.stake||a.key.localeCompare(b.key));
 const eligible=rows.filter(r=>r.lines>=10);
 const best=[...eligible].sort((a,b)=>b.profit-a.profit)[0]||null;
 const worst=[...eligible].sort((a,b)=>a.profit-b.profit)[0]||null;
 const notes=[];
 if(!overall.lines)notes.push('確定した買い目がありません。結果を入力すると購入傾向を分析できます。');
 else{
  notes.push('確定済み'+overall.lines+'点のうち、払戻のある買い目は'+overall.hits+'点です。レース単位では'+overall.hitRaces+' / '+overall.races+'レースで的中しました。');
  if(best)notes.push(best.axis+'「'+best.key+'」は'+best.lines+'点で収支'+(best.profit>=0?'+':'')+best.profit.toLocaleString('ja-JP')+'円でした。');
  if(worst&&worst!==best)notes.push(worst.axis+'「'+worst.key+'」は'+worst.lines+'点で収支'+(worst.profit>=0?'+':'')+worst.profit.toLocaleString('ja-JP')+'円でした。');
  if(!eligible.length)notes.push('条件別の確定買い目が10点未満のため、好調・不調の判定は保留しています。');
 }
 if(overall.pending)notes.push('未確定の買い目'+overall.pending+'点は分析対象外です。');
 notes.push('過去の記録の説明であり、次のレースの的中や利益を予測するものではありません。');
 return {overall,rows,notes,best,worst};
}

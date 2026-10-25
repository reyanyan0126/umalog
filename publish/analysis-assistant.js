// Local, deterministic explanations. No external AI or implied future predictions.
const yen=n=>Math.round(n).toLocaleString('ja-JP')+'円';
export const QUESTION_OPTIONS=[
 {id:'summary',label:'今の収支は？'},
 {id:'strong',label:'得意な条件は？'},
 {id:'weak',label:'損失が大きい条件は？'},
 {id:'pattern',label:'買い方の傾向は？'},
 {id:'quality',label:'データは十分？'}
];
export function answerPersonalQuestion(report,question){
 const o=report.overall,rows=report.rows||[],min=10;
 if(!o.lines)return '確定した買い目がありません。購入額・結果を記録すると分析できます。';
 if(question==='summary'){
  const profit=o.payout+o.refund-o.stake;
  return '確定'+o.lines+'点、的中'+o.hits+'点（買い目単位 '+(100*o.hits/o.lines).toFixed(1)+'%）。的中レース '+o.hitRaces+'/'+o.races+'。購入'+yen(o.stake)+'、払戻・返還'+yen(o.payout+o.refund)+'、収支'+(profit>=0?'+':'−')+yen(Math.abs(profit))+'です。';
 }
 if(question==='quality'){
  const sparse=rows.filter(r=>r.lines<min).length;
  return '確定'+o.lines+'点、未確定'+o.pending+'点。条件別のうち'+sparse+'区分は10点未満です。少数の結果から「得意」とは判断できません。馬券の人気帯は着順・人気の登録がある場合だけ集計します。';
 }
 if(question==='pattern'){
  const list=rows.filter(r=>['1点購入額','買い目構成','人気帯','券種'].includes(r.axis)).sort((a,b)=>b.stake-a.stake).slice(0,3);
  return list.length?'購入金額が多い区分：'+list.map(r=>r.axis+'「'+r.key+'」'+yen(r.stake)+'（'+r.lines+'点）').join('、')+'。購入額の偏りであり、的中しやすさの証明ではありません。':'買い方の分類に必要な記録がありません。';
 }
 const valid=rows.filter(r=>r.lines>=min);
 if(!valid.length)return '同じ条件の確定買い目が10点以上ある区分がありません。優劣はまだ判断しません。';
 const sorted=[...valid].sort((a,b)=>question==='weak'?a.profit-b.profit:b.profit-a.profit);
 const r=sorted[0];
 return (question==='weak'?'収支が最も低い':'収支が最も高い')+'記録済み区分は'+r.axis+'「'+r.key+'」（'+r.lines+'点、収支'+(r.profit>=0?'+':'−')+yen(Math.abs(r.profit))+'、回収率'+r.roi.toFixed(1)+'%）です。条件同士は重複集計されるため合算できません。過去の実績であり次の的中を保証しません。';
}
export function officialSourceAudit(source){
 const results=[];
 const seen=new Set();
 for(const ticket of source.tickets||[]){
  const meta=ticket.aiImport?.metadata;if(!meta)continue;
  const url=String(meta['出典']||'');
  const key=ticket.raceId;
  if(seen.has(key))continue;seen.add(key);
  const official=/^https:\/\/(?:www\.|sp\.)?jra\.go\.jp\//i.test(url);
  const podium=[1,2,3].every(p=>/^0?\d{1,2}\s+\S/.test(meta[p+'着']||''));
  const jockey=[1,2,3].every(p=>!!String(meta[p+'着騎手']||'').trim());
  results.push({raceId:key,sourceUrl:official?url:null,officialLink:official,podium,jockey,verified:false});
 }
 return results;
}

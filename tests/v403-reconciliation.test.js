import test from 'node:test';
import assert from 'node:assert/strict';
import {buildPersonalAnalytics} from '../personal-analytics.js';
import {officialSourceAudit} from '../analysis-assistant.js';
test('four-race accounting fixture reconciles 5100 stake, 2160 payout, 2940 loss',()=>{
 const races=[['kyoto1','京都'],['kyoto8','京都'],['niigata4','新潟'],['tokyo11','東京']].map(([id,venue])=>({id,venue}));
 const tickets=races.map((r,i)=>({id:'t'+i,raceId:r.id,type:'三連複',aiImport:{metadata:{'芝・ダート':'芝','距離':'1600m'}}}));
 const stakes=[1600,1500,1000,1000];
 const lines=stakes.map((stake,i)=>({ticketId:'t'+i,status:'settled',stake,payout:i===0?2160:0,refund:0,numbers:[3,9,11]}));
 const report=buildPersonalAnalytics({races,tickets,lines});
 assert.equal(report.overall.stake,5100);assert.equal(report.overall.payout,2160);
 assert.equal(report.overall.payout+report.overall.refund-report.overall.stake,-2940);
 assert.equal(report.overall.races,4);assert.equal(report.overall.hitRaces,1);
 assert.equal(report.overall.hits,1);assert.equal(report.overall.lines,4);
 assert.equal(report.rows.filter(r=>r.axis==='競馬場').reduce((s,r)=>s+r.stake,0),5100);
});
test('runner popularity is used only when every selected horse has known popularity',()=>{
 const base={races:[{id:'r',venue:'京都'}],tickets:[{id:'t',raceId:'r',type:'三連複',aiImport:{metadata:{'出走馬':'03 馬A（2番人気）;09 馬B（1番人気）;11 馬C（7番人気）'}}}],lines:[{ticketId:'t',status:'settled',numbers:[3,9,11],stake:100,payout:0,refund:0}]};
 const report=buildPersonalAnalytics(base);
 assert.equal(report.rows.find(r=>r.axis==='人気帯')?.key,'7番人気以下を含む');
 const copy=structuredClone(base);copy.tickets[0].aiImport.metadata['出走馬']='03 馬A（2番人気）;09 馬B（1番人気）';
 assert.equal(buildPersonalAnalytics(copy).rows.some(r=>r.axis==='人気帯'),false);
});
test('source completeness combines records of the same race without claiming verification',()=>{
 const s={tickets:[{raceId:'r',aiImport:{metadata:{}}},{raceId:'r',aiImport:{metadata:{'出典':'https://www.jra.go.jp/result','1着':'03 A','2着':'09 B','3着':'11 C','1着騎手':'A','2着騎手':'B','3着騎手':'C'}}}]};
 const rows=officialSourceAudit(s);assert.equal(rows.length,1);assert.equal(rows[0].officialLink,true);assert.equal(rows[0].podium,true);assert.equal(rows[0].jockey,true);assert.equal(rows[0].verified,false);
});

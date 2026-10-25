import test from 'node:test';
import assert from 'node:assert/strict';
import {answerPersonalQuestion,officialSourceAudit,QUESTION_OPTIONS} from '../analysis-assistant.js';
import {buildPersonalAnalytics} from '../personal-analytics.js';
const source={races:[{id:'r',venue:'京都'}],tickets:[{id:'t',raceId:'r',type:'三連複',aiImport:{metadata:{'1着':'03 A','2着':'09 B','3着':'11 C','1着騎手':'騎手A','2着騎手':'騎手B','3着騎手':'騎手C','出典':'https://www.jra.go.jp/JRADB/accessS.html'}}}],lines:[{ticketId:'t',status:'settled',numbers:[3,9,11],stake:100,payout:2160,refund:0}]};
test('questions explain observed data without pretending to predict',()=>{const report=buildPersonalAnalytics(source);assert.match(answerPersonalQuestion(report,'summary'),/2,160円/);assert.match(answerPersonalQuestion(report,'strong'),/10点以上/);assert.match(answerPersonalQuestion(report,'quality'),/未確定0点/);assert.equal(QUESTION_OPTIONS.length,5)});
test('JRA source URL is never treated as verified race result',()=>{const [audit]=officialSourceAudit(source);assert.equal(audit.officialLink,true);assert.equal(audit.verified,false);assert.equal(audit.jockey,true);const tampered=structuredClone(source);tampered.tickets[0].aiImport.metadata['出典']='https://jra.go.jp.attacker.example/fake';assert.equal(officialSourceAudit(tampered)[0].officialLink,false)});

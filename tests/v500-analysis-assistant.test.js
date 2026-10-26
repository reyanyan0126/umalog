import test from 'node:test';
import assert from 'node:assert/strict';
import {answerPersonalQuestion,QUESTION_OPTIONS} from '../analysis-assistant.js';

test('AI-style explanations do not fabricate results without settled entries',()=>{
 const report={overall:{lines:0,hits:0,pending:2,races:0,hitRaces:0,stake:0,payout:0,refund:0},rows:[]};
 for(const option of QUESTION_OPTIONS){
  assert.match(answerPersonalQuestion(report,option.id),/確定した買い目がありません/);
 }
});
test('explanations disclose low sample sizes rather than declaring an advantage',()=>{
 const report={overall:{lines:2,hits:1,pending:0,races:1,hitRaces:1,stake:200,payout:300,refund:0},rows:[{axis:'券種',key:'単勝',lines:2,stake:200,profit:100,roi:150}]};
 assert.match(answerPersonalQuestion(report,'strong'),/10点以上/);
 assert.match(answerPersonalQuestion(report,'quality'),/10点未満/);
});
test('summary uses the same payout plus refund less stake identity',()=>{
 const report={overall:{lines:2,hits:1,pending:0,races:1,hitRaces:1,stake:1200,payout:1500,refund:200},rows:[]};
 const answer=answerPersonalQuestion(report,'summary');
 assert.match(answer,/収支\+500円/);
 assert.match(answer,/1,700円/);
});

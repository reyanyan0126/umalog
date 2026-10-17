import test from 'node:test';
import assert from 'node:assert/strict';
import {generateBets} from '../bet-patterns.js';
import {emptyData,aggregate,validateData,money} from '../core.js';
const build=(type,mode,options)=>generateBets(type,mode,options);
test('existing normal and BOX behavior: 5 horses for trio / trifecta',()=>{
 assert.deepEqual(build('ワイド','normal',{numbers:[9,3]}),[[3,9]]);
 assert.equal(build('三連複','box',{numbers:[1,2,3,4,5]}).length,10);
 assert.equal(build('三連単','box',{numbers:[1,2,3,4,5]}).length,60);
 assert.equal(build('単勝','box',{numbers:[1,2,3]}).length,3);
});
test('axis flows handle win/place, frame exact-duplicate, unordered and ordered pairs',()=>{
 assert.deepEqual(build('馬連','flow',{axes:[3],partners:[1,2,3,4]}),[[1,3],[2,3],[3,4]]);
 assert.deepEqual(build('枠連','flow',{axes:[1],partners:[1,2]}),[[1,1],[1,2]]);
 assert.deepEqual(build('馬単','flow',{axes:[1],partners:[2,3],position:'multi'}),[[1,2],[2,1],[1,3],[3,1]]);
 assert.deepEqual(build('馬単','flow',{axes:[1],partners:[2,3],position:'second'}),[[2,1],[3,1]]);
});
test('trio one-axis and two-axis flows create unique two/three horse sets',()=>{
 assert.deepEqual(build('三連複','flow',{axisCount:1,axes:[1],partners:[2,3,4]}),[[1,2,3],[1,2,4],[1,3,4]]);
 assert.deepEqual(build('三連複','flow',{axisCount:2,axes:[1,2],partners:[1,3,4]}),[[1,2,3],[1,2,4]]);
});
test('trifecta one/two axis with fixed first, second, third and multi',()=>{
 const cfg={axes:[1],partners:[2,3,4],axisCount:1};
 assert.equal(build('三連単','flow',{...cfg,position:'first'}).length,6);
 assert.equal(build('三連単','flow',{...cfg,position:'second'}).length,6);
 assert.equal(build('三連単','flow',{...cfg,position:'third'}).length,6);
 const multi=build('三連単','flow',{...cfg,position:'multi'});
 assert.equal(multi.length,18);
 assert.equal(new Set(multi.map(a=>a.join(','))).size,18);
 const cfg2={axes:[7,3],partners:[2,4],axisCount:2};
 assert.deepEqual(build('三連単','flow',{...cfg2,position:'first'}),[[7,3,2],[7,3,4]]);
 assert.deepEqual(build('三連単','flow',{...cfg2,position:'second'}),[[7,2,3],[7,4,3]]);
 assert.deepEqual(build('三連単','flow',{...cfg2,position:'third'}),[[2,7,3],[4,7,3]]);
 assert.equal(build('三連単','flow',{...cfg2,position:'multi'}).length,12);
});
test('formation expands cross product, drops repeated horse and duplicate unordered bet',()=>{
 assert.deepEqual(build('馬連','formation',{groups:[[1,2],[2,3]]}),[[1,2],[1,3],[2,3]]);
 assert.deepEqual(build('枠連','formation',{groups:[[1],[1,2]]}),[[1,1],[1,2]]);
 assert.deepEqual(build('三連単','formation',{groups:[[1,2],[2,3],[3,4]]}),
 [[1,2,3],[1,2,4],[1,3,4],[2,3,4]]);
 assert.deepEqual(build('三連複','formation',{groups:[[1,2],[2,3],[3,4]]}),
 [[1,2,3],[1,2,4],[1,3,4],[2,3,4]]);
});
test('invalid pools and unsupported patterns fail without partial output',()=>{
 for(const [t,mode,o] of [
 ['単勝','flow',{axes:[1],partners:[2]}],
 ['複勝','formation',{groups:[[1],[2]]}],
 ['三連複','flow',{axisCount:2,axes:[1],partners:[2,3]}],
 ['三連単','formation',{groups:[[1],[2],[]]}],
 ['馬連','flow',{axes:[1],partners:[]}],
 ['三連単','formation',{groups:[[1,1],[2],[3]]}],
 ['馬連','formation',{groups:[[0],[2]]}],
 ['枠連','formation',{groups:[[9],[2]]}],
 ])assert.throws(()=>build(t,mode,o),t+' '+mode);
});
test('individual 100-yen stakes are preserved through legacy ledger and JSON validation',()=>{
 const d=emptyData();d.races=[{id:'r',date:'2026-10-17',venue:'東京',number:11,name:'例'}];
 d.tickets=[{id:'t',raceId:'r',type:'三連複',kind:'reported',memo:'',createdAt:'2026-10-17T03:00:00Z'}];
 const bets=build('三連複','formation',{groups:[[1],[2,3],[4,5]]});
 const amounts=[100,500,300,200];
 assert.equal(bets.length,4);
 d.lines=bets.map((numbers,i)=>({id:'l'+i,ticketId:'t',numbers,stake:money(amounts[i],true),status:'settled',payout:i===1?3000:0,refund:0}));
 const valid=validateData(d),s=aggregate(valid);
 assert.equal(s.purchase,1100);assert.equal(s.payout,3000);assert.equal(s.profit,1900);
 assert.equal(JSON.parse(JSON.stringify(valid)).lines[1].stake,500);
});

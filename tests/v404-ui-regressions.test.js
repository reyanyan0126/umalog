import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
for(const path of ['../app.js','../publish/app.js']){
 const source=readFileSync(new URL(path,import.meta.url),'utf8');
 test(path+' avoids clipboard permission request and exposes manual paste',()=>{
  assert.ok(source.includes('id="aiImportPaste"'));
  assert.ok(source.includes("$('#aiImportPaste').value.trim()"));
  assert.equal(source.includes('navigator.clipboard.readText()'),false);
  assert.ok(source.includes('id="aiImportFile"'));
 });
 test(path+' supports grade filtering and reset',()=>{
  assert.ok(source.includes('id="historyGrade"'));
  assert.ok(source.includes("filter==='graded'"));
  assert.ok(source.includes("filter==='other'"));
  assert.ok(source.includes("$('#historyGrade').value=''"));
 });
 test(path+' supports month year all with current year selector',()=>{
  assert.ok(source.includes('id="analysisCurrentMonth"'));
  assert.ok(source.includes('id="analysisCurrentYear"'));
  assert.ok(source.includes('id="analysisAllTime"'));
  assert.ok(source.includes("analysisRange='year';analysisYear=jstToday().slice(0,4)"));
 });
}

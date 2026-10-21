import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const css=readFileSync(new URL('../style.css',import.meta.url),'utf8');
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
test('home hash never hides the title screen',()=>{
 assert.doesNotMatch(css,/body:has\(#home:target\)\s*\.launch-screen/);
 assert.match(css,/\.launch-screen\[hidden\]\s*\{display:none!important\}/);
});
test('Start is the explicit title dismissal action',()=>{
 assert.match(html,/id="launchStart"[^>]*href="#home"/);
 assert.match(html,/start\.addEventListener\("click",close\)/);
});
test('update checks do not immediately dismiss title',()=>{
 const update=html.split("getElementById('launchUpdate')")[1].split('</script>')[0];
 assert.doesNotMatch(update,/splash\.hidden\s*=\s*true/);
 assert.match(update,/最新版の確認が完了しました/);
});

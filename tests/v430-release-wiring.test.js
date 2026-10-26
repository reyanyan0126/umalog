import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const app=readFileSync(new URL('../app.js',import.meta.url),'utf8');
const sw=readFileSync(new URL('../sw.js',import.meta.url),'utf8');
const manifest=JSON.parse(readFileSync(new URL('../release.json',import.meta.url),'utf8'));
const pkg=JSON.parse(readFileSync(new URL('../package.json',import.meta.url),'utf8'));
test('analysis trend is actually mounted, not merely declared',()=>{
 assert.match(app,/\$\{cashTrendPanel\(\)\}[\s\S]*\$\{analysisAssistantPanel\(analysisLedger\(\)\)\}/);
 assert.match(app,/import \{monthlyCashTrend\} from '\.\/monthly-cash-trend\.js'/);
});
test('offline installation precaches the trend dependency',()=>{
 assert.match(sw,/'\.\/monthly-cash-trend\.js'/);
});
test('release, package and application use the same version',()=>{
 assert.equal(pkg.version,manifest.version);
 assert.ok(app.includes("currentVersion:'"+manifest.version+"'"));
 assert.ok(sw.includes("const VERSION='"+manifest.version+"'"));
});

test('HTML entrypoint uses current release cache-busting suffix',()=>{
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 const suffix=manifest.version.replace(/\./g,'');
 assert.ok(html.includes('./app.js?v='+suffix));
});

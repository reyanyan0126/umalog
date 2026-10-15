import test from 'node:test';
import assert from 'node:assert/strict';
import {TIPS} from '../tips.js';
import {box} from '../core.js';
test('tips examples agree with existing combination generator',()=>{
 assert.equal(box('ワイド',[1,2,3,4,5]).length,10);
 assert.equal(box('三連複',[1,2,3,4,5]).length,10);
 assert.equal(box('三連単',[1,2,3,4,5]).length,60);
 assert.equal(box('馬連',[1,2,3,4]).length,6);
 assert.equal(box('馬単',[1,2,3,4]).length,12);
 assert.equal(TIPS.length,50);
 assert.equal(new Set(TIPS.map(t=>t.title)).size,50);
});

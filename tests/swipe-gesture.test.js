import test from 'node:test';
import assert from 'node:assert/strict';
import {swipeDirection} from '../swipe.js';

test('horizontal gestures navigate both directions',()=>{
 assert.equal(swipeDirection(-90,8,250),1);
 assert.equal(swipeDirection(90,8,250),-1);
});
test('vertical scroll and accidental gestures never navigate',()=>{
 assert.equal(swipeDirection(-80,90,200),0);
 assert.equal(swipeDirection(-74,0,200),0);
 assert.equal(swipeDirection(-120,10,1500),0);
 assert.equal(swipeDirection(NaN,0,100),0);
});

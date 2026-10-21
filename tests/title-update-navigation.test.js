import test from 'node:test';
import assert from 'node:assert/strict';
import {createUpdates} from '../updates.js';
function harness({dirty=false,waiting=null,controller={}}={}){
 let reloads=0,offers=0,registrations=0;const events={},messages=[];
 const reg={waiting,installing:null,update:async()=>{},addEventListener(){}};
 const serviceWorker={controller,addEventListener:(name,fn)=>events[name]=fn,register:async()=>{registrations++;return reg;}};
 const updates=createUpdates({serviceWorker,onStatus:m=>messages.push(m),onOffer:()=>offers++,canReload:()=>!dirty,reload:()=>reloads++});
 return {updates,reg,events,messages,get reloads(){return reloads},get registrations(){return registrations}};
}
test('no-update check never reloads and registration is shared',async()=>{const h=harness();await Promise.all([h.updates.register(),h.updates.check()]);assert.equal(h.registrations,1);assert.equal(h.reloads,0);assert.match(h.messages.at(-1),/確認が完了/);});
test('apply and duplicate controllerchange reload exactly once',async()=>{let applied=0;const h=harness({waiting:{postMessage:()=>applied++}});await h.updates.check();assert.equal(applied,1);h.events.controllerchange();h.events.controllerchange();assert.equal(h.reloads,1);});
test('dirty input blocks apply and automatic reload',async()=>{let applied=0;const h=harness({dirty:true,waiting:{postMessage:()=>applied++}});await h.updates.check();h.events.controllerchange();assert.equal(applied,0);assert.equal(h.reloads,0);});
test('initial worker claim does not reload',async()=>{const h=harness({controller:null});await h.updates.register();h.events.controllerchange();assert.equal(h.reloads,0);});
test('network failure reports retryable failure',async()=>{const h=harness();h.reg.update=async()=>{throw Error('offline')};await h.updates.check();assert.match(h.messages.at(-1),/通信状態/);assert.equal(h.reloads,0);});

test('already installed update is applied without starting a second update job',async()=>{let applied=0;const h=harness({waiting:{postMessage:()=>applied++}});h.reg.update=async()=>{throw Error('must not restart update')};await h.updates.check();assert.equal(applied,1);});

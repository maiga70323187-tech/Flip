import test from 'node:test';import assert from 'node:assert/strict';import {frameDurationMs,totalDurationMs,clamp} from '../src/lib/time.js';
test('frame duration at 12 fps',()=>assert.ok(Math.abs(frameDurationMs(12)-83.3333)<0.01));
test('total duration',()=>assert.equal(totalDurationMs([{duration_ms:100},{duration_ms:250}]),350));
test('clamp',()=>assert.equal(clamp(12,0,10),10));

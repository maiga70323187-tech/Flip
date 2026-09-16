import test from 'node:test'; import assert from 'node:assert/strict';
import { newProject, newFrame, newElement } from '../src/lib/model.js';
import { assertElementInput } from '../src/lib/validate.js';

test('project defaults to vertical 1080x1920',()=>{const p=newProject({name:'x'});assert.equal(p.width,1080);assert.equal(p.height,1920);assert.equal(p.fps,12);});
test('element normalizes numeric transforms',()=>{const e=newElement({x:'10',scale:'2'});assert.equal(e.x,10);assert.equal(e.scale,2);});
test('invalid scale is rejected',()=>assert.throws(()=>assertElementInput({scale:0}),/scale/));

import test from 'node:test';import assert from 'node:assert/strict';import {TOOL_NAMES} from '../src/toolDefinitions.js';
test('required MCP tool surface is complete',()=>{for(const n of ['generate_character','create_frame','move_element','inpaint_region','preview_animation','export_animation'])assert.ok(TOOL_NAMES.includes(n));assert.equal(new Set(TOOL_NAMES).size,TOOL_NAMES.length);});

import test from 'node:test';
import assert from 'node:assert/strict';
import { asContent } from '../src/toolDefinitions.js';

test('asContent wraps objects into MCP text content', () => {
  const r = asContent({ ok: true });
  assert.equal(r.content[0].type, 'text');
  assert.match(r.content[0].text, /"ok": true/);
});

test('asContent passes strings through', () => {
  const r = asContent('hello');
  assert.equal(r.content[0].text, 'hello');
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { RUNTIMES, findRuntime } from '../src/runtimes.mjs';

test('RUNTIMES includes Claude Code as first entry', () => {
  assert.equal(RUNTIMES[0].id, 'claude');
  assert.equal(RUNTIMES[0].cmd, 'claude');
});

test('every runtime has id, label, cmd, description', () => {
  for (const r of RUNTIMES) {
    assert.ok(r.id, 'missing id');
    assert.ok(r.label, `${r.id} missing label`);
    assert.ok(r.cmd, `${r.id} missing cmd`);
    assert.ok(r.description, `${r.id} missing description`);
  }
});

test('runtime ids are unique', () => {
  const ids = RUNTIMES.map(r => r.id);
  assert.equal(new Set(ids).size, ids.length);
});

test('findRuntime works by id and by cmd', () => {
  assert.equal(findRuntime('claude').label, 'Claude Code');
  assert.equal(findRuntime('aider').label, 'Aider');
  assert.equal(findRuntime('unknown'), undefined);
});

test('plain shell is the last (escape hatch)', () => {
  assert.equal(RUNTIMES[RUNTIMES.length - 1].id, 'shell');
});

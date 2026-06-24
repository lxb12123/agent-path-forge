// test/managed-block.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { upsertBlock } from '../lib/managed-block.mjs';

const S = '# >>> start >>>';
const E = '# <<< end <<<';

test('empty content -> writes a single managed block', () => {
  const out = upsertBlock('', S, E, 'a\nb');
  assert.equal(out, `${S}\na\nb\n${E}\n`);
});

test('idempotent: repeated upsert with the same body is unchanged', () => {
  const once = upsertBlock('', S, E, 'a\nb');
  const twice = upsertBlock(once, S, E, 'a\nb');
  assert.equal(twice, once);
});

test('replaces an existing block body, preserving user content before and after', () => {
  const start = upsertBlock('user-top\n', S, E, 'old');
  const updated = upsertBlock(start + 'user-bottom\n', S, E, 'new');
  assert.match(updated, /user-top/);
  assert.match(updated, /user-bottom/);
  assert.match(updated, /new/);
  assert.doesNotMatch(updated, /old/);
  // upsert the same body again -> idempotent
  assert.equal(upsertBlock(updated, S, E, 'new'), updated);
});

test('appends after existing user content, separated by a blank line', () => {
  const out = upsertBlock('keep me\n', S, E, 'x');
  assert.match(out, /keep me\n\n# >>> start >>>/);
});

test('B1: file only mentions the end marker in prose, no real block -> does not grow unbounded', () => {
  const prose = `# My project\n\nNote: agent-plugin-kit uses ${E} to delimit its block.\n`;
  const r1 = upsertBlock(prose, S, E, 'rule body');
  const r2 = upsertBlock(r1, S, E, 'rule body');
  assert.equal(r2, r1);                         // stable from the second run on, no drift
  assert.equal(r2.split(S).length - 1, 1);      // only one block exists
});

test('B2: two duplicate blocks already exist -> converge to one, old content cleared, and idempotent', () => {
  const dup = `top\n\n${S}\nOLD\n${E}\n\nmid\n\n${S}\nOLD\n${E}\n\nbot\n`;
  const out = upsertBlock(dup, S, E, 'NEW');
  assert.equal(out.split(S).length - 1, 1);
  assert.match(out, /NEW/);
  assert.doesNotMatch(out, /OLD/);
  assert.match(out, /top/); assert.match(out, /bot/);
  assert.equal(upsertBlock(out, S, E, 'NEW'), out);
});

test('body contains a marker -> throws (avoids corrupting block boundaries)', () => {
  assert.throws(() => upsertBlock('', S, E, `x ${E} y`), /must not contain/);
});

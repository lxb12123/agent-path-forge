// test/eval-rubric.test.mjs — the LLM-rubric subjective verdict mode of /eval
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { gradeOutput, runEval } from '../lib/eval.mjs';

function tmp() { return mkdtempSync(join(tmpdir(), 'mh-')); }

test('gradeOutput: with a rubric, it only passes when rubricVerdict===true', () => {
  assert.equal(gradeOutput('x', { rubric: 'should be clear' }, true).pass, true);
  assert.equal(gradeOutput('x', { rubric: 'should be clear' }, false).pass, false);
  assert.equal(gradeOutput('x', { rubric: 'should be clear' }).pass, false); // no verdict provided → fail
});

test('gradeOutput: passes only when both the deterministic assertions and the rubric are met', () => {
  assert.equal(gradeOutput('has good', { contains: ['good'], rubric: 'r' }, true).pass, true);
  assert.equal(gradeOutput('missing', { contains: ['good'], rubric: 'r' }, true).pass, false);
});

test('runEval: runs supports {output, rubric} objects', () => {
  const d = tmp(); mkdirSync(join(d, 'evals'), { recursive: true });
  writeFileSync(join(d, 'evals', 'q.json'), JSON.stringify({ name: 'q', input: 'i', expect: { rubric: 'clear' } }), 'utf8');
  assert.equal(runEval(d, { q: { output: 'whatever', rubric: true } }).passed, 1);
  assert.equal(runEval(d, { q: { output: 'whatever', rubric: false } }).failed, 1);
  rmSync(d, { recursive: true, force: true });
});

test('runEval: string runs remain compatible (cases without a rubric)', () => {
  const d = tmp(); mkdirSync(join(d, 'evals'), { recursive: true });
  writeFileSync(join(d, 'evals', 'c.json'), JSON.stringify({ name: 'c', input: 'i', expect: { contains: ['ok'] } }), 'utf8');
  assert.equal(runEval(d, { c: 'this is ok' }).passed, 1);
  rmSync(d, { recursive: true, force: true });
});

// test/eval-rubric.test.mjs — /eval 的 LLM-rubric 主观裁决模式
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { gradeOutput, runEval } from '../lib/eval.mjs';

function tmp() { return mkdtempSync(join(tmpdir(), 'mh-')); }

test('gradeOutput: 有 rubric 时需 rubricVerdict===true 才过', () => {
  assert.equal(gradeOutput('x', { rubric: '应清晰' }, true).pass, true);
  assert.equal(gradeOutput('x', { rubric: '应清晰' }, false).pass, false);
  assert.equal(gradeOutput('x', { rubric: '应清晰' }).pass, false); // 未提供裁决 → fail
});

test('gradeOutput: 确定性断言 + rubric 都满足才 pass', () => {
  assert.equal(gradeOutput('has good', { contains: ['good'], rubric: 'r' }, true).pass, true);
  assert.equal(gradeOutput('missing', { contains: ['good'], rubric: 'r' }, true).pass, false);
});

test('runEval: runs 支持 {output, rubric} 对象', () => {
  const d = tmp(); mkdirSync(join(d, 'evals'), { recursive: true });
  writeFileSync(join(d, 'evals', 'q.json'), JSON.stringify({ name: 'q', input: 'i', expect: { rubric: '清晰' } }), 'utf8');
  assert.equal(runEval(d, { q: { output: 'whatever', rubric: true } }).passed, 1);
  assert.equal(runEval(d, { q: { output: 'whatever', rubric: false } }).failed, 1);
  rmSync(d, { recursive: true, force: true });
});

test('runEval: 字符串 runs 仍兼容(无 rubric 的用例)', () => {
  const d = tmp(); mkdirSync(join(d, 'evals'), { recursive: true });
  writeFileSync(join(d, 'evals', 'c.json'), JSON.stringify({ name: 'c', input: 'i', expect: { contains: ['ok'] } }), 'utf8');
  assert.equal(runEval(d, { c: 'this is ok' }).passed, 1);
  rmSync(d, { recursive: true, force: true });
});

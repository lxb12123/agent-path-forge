// test/eval.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadCases, gradeOutput, summarize, runEval } from '../lib/eval.mjs';

function tmp() { return mkdtempSync(join(tmpdir(), 'mh-')); }

test('gradeOutput: contains / notContains / matches', () => {
  assert.deepEqual(
    gradeOutput('has blocker and null', { contains: ['blocker'], matches: ['null|空'] }),
    { pass: true, failures: [] },
  );
  const bad = gradeOutput('clean', { contains: ['blocker'], notContains: ['clean'] });
  assert.equal(bad.pass, false);
  assert.equal(bad.failures.length, 2);
});

test('loadCases 读 evals/*.json 并按名排序', () => {
  const d = tmp();
  mkdirSync(join(d, 'evals'), { recursive: true });
  writeFileSync(join(d, 'evals', 'b.json'), JSON.stringify({ name: 'b', input: 'x', expect: {} }), 'utf8');
  writeFileSync(join(d, 'evals', 'a.json'), JSON.stringify({ name: 'a', input: 'y', expect: {} }), 'utf8');
  assert.deepEqual(loadCases(d).map((c) => c.name), ['a', 'b']);
  rmSync(d, { recursive: true, force: true });
});

test('loadCases: 无 evals 目录返回空数组', () => {
  const d = tmp();
  assert.deepEqual(loadCases(d), []);
  rmSync(d, { recursive: true, force: true });
});

test('summarize 统计 total/passed/failed', () => {
  assert.deepEqual(summarize([{ pass: true }, { pass: false }, { pass: true }]),
    { total: 3, passed: 2, failed: 1 });
});

test('runEval: 按用例对收集的输出判分', () => {
  const d = tmp();
  mkdirSync(join(d, 'evals'), { recursive: true });
  writeFileSync(join(d, 'evals', 'ok.json'),
    JSON.stringify({ name: 'ok', input: 'i', expect: { contains: ['good'] } }), 'utf8');
  writeFileSync(join(d, 'evals', 'bad.json'),
    JSON.stringify({ name: 'bad', input: 'i', expect: { contains: ['missing'] } }), 'utf8');
  const report = runEval(d, { ok: 'this is good', bad: 'nope' });
  assert.equal(report.total, 2);
  assert.equal(report.passed, 1);
  assert.equal(report.failed, 1);
  assert.equal(report.cases.find((c) => c.name === 'ok').pass, true);
  assert.equal(report.cases.find((c) => c.name === 'bad').pass, false);
  rmSync(d, { recursive: true, force: true });
});

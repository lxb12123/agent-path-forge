// test/collect-diff.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { collectDiff } from '../gene/golden-skill/scripts/collect-diff.mjs';

function gitRepo() {
  const d = mkdtempSync(join(tmpdir(), 'mh-git-'));
  const run = (...a) => execFileSync('git', a, { cwd: d });
  run('init');
  run('config', 'user.email', 't@t.io');
  run('config', 'user.name', 't');
  writeFileSync(join(d, 'a.txt'), 'one\n');
  run('add', '.'); run('commit', '-m', 'init');
  return { d, run };
}

test('collectDiff 列出改动文件与 diff 文本', () => {
  const { d } = gitRepo();
  writeFileSync(join(d, 'a.txt'), 'one\ntwo\n');           // 改动
  const r = collectDiff(d, 'HEAD');
  assert.deepEqual(r.files, ['a.txt']);
  assert.match(r.diff, /\+two/);
  rmSync(d, { recursive: true, force: true });
});

test('无改动时 files 为空', () => {
  const { d } = gitRepo();
  const r = collectDiff(d, 'HEAD');
  assert.deepEqual(r.files, []);
  rmSync(d, { recursive: true, force: true });
});

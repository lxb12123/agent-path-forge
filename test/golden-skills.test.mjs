// test/golden-skills.test.mjs — script behavior of the new golden skills + gene compliance
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync, readFileSync, existsSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { collectStaged } from '../gene/commit/scripts/collect-staged.mjs';
import { collectCommits } from '../gene/pr-description/scripts/collect-commits.mjs';
import { readSkillMeta } from '../lib/registry.mjs';

function gitRepo() {
  const d = mkdtempSync(join(tmpdir(), 'mh-gold-'));
  const run = (...a) => execFileSync('git', a, { cwd: d, encoding: 'utf8' });
  run('init');
  run('config', 'user.email', 't@t.io');
  run('config', 'user.name', 't');
  writeFileSync(join(d, 'a.txt'), 'one\n');
  run('add', '.'); run('commit', '-m', 'init');
  return { d, run };
}

test('collectStaged gets staged changes; unstaged is not counted', () => {
  const { d, run } = gitRepo();
  writeFileSync(join(d, 'b.txt'), 'new\n');   // unstaged
  assert.deepEqual(collectStaged(d).files, []);
  run('add', 'b.txt');                         // staged
  const r = collectStaged(d);
  assert.deepEqual(r.files, ['b.txt']);
  assert.match(r.diff, /\+new/);
  rmSync(d, { recursive: true, force: true });
});

test('collectCommits lists commit subjects and diffstat relative to the baseline', () => {
  const { d, run } = gitRepo();
  const base = run('rev-parse', 'HEAD').trim();   // use the initial commit SHA as the baseline to avoid branch-name differences
  writeFileSync(join(d, 'a.txt'), 'one\ntwo\n');
  run('add', '.'); run('commit', '-m', 'feat: add two');
  const r = collectCommits(d, base);
  assert.deepEqual(r.commits, ['feat: add two']);
  assert.match(r.diffstat, /a\.txt/);
  rmSync(d, { recursive: true, force: true });
});

for (const name of ['commit', 'pr-description']) {
  test(`gene/${name} gene compliance: skill.yaml + prompt + script + evals`, () => {
    const dir = resolve('gene', name);
    const meta = readSkillMeta(dir);
    assert.equal(meta.name, name);                       // name matches the directory
    assert.ok(meta.version, 'has version');
    assert.ok(Array.isArray(meta.uses.permissions) && meta.uses.permissions.length, 'declares permissions');
    assert.equal(existsSync(join(dir, 'prompt.md')), true);
    assert.ok(readdirSync(join(dir, 'scripts')).some((f) => f.endsWith('.mjs')), 'has a script');
    const evals = readdirSync(join(dir, 'evals')).filter((f) => f.endsWith('.json'));
    assert.ok(evals.length, 'has eval cases');
    const cases = evals.map((e) => JSON.parse(readFileSync(join(dir, 'evals', e), 'utf8')));  // valid JSON
    assert.ok(
      cases.some((c) => c.expect && typeof c.expect.rubric === 'string' && c.expect.rubric),
      'has a happy-path rubric eval (not only the empty-case assertion)',
    );
  });
}

test('collectStaged/collectCommits in a non-git directory → empty result instead of throwing', () => {
  const d = mkdtempSync(join(tmpdir(), 'mh-nogit-'));
  assert.deepEqual(collectStaged(d), { files: [], diff: '', status: '' });
  assert.deepEqual(collectCommits(d, 'main'), { base: 'main', commits: [], diffstat: '' });
  rmSync(d, { recursive: true, force: true });
});

// test/cli.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { inherit } from '../lib/cli.mjs';
import { readManifest } from '../lib/manifest.mjs';

function tmp() { return mkdtempSync(join(tmpdir(), 'mh-')); }
function makeSrc(name, desc, when) {
  const src = tmp();
  writeFileSync(join(src, 'skill.yaml'), `name: ${name}\ndescription: ${desc}\nwhen-to-use: ${when}\n`, 'utf8');
  return src;
}

test('inherit on an empty project: stamps the foundation + installs the skill + compiles, manifest includes the skill', () => {
  const d = tmp();
  const src = makeSrc('review', 'code review', 'review the diff before committing');
  const r = inherit(d, { name: 'review', from: src });
  assert.equal(r.stamped, true);
  assert.equal(r.skill.changed, true);
  assert.equal(r.compiledSkills, 1);
  assert.equal(readManifest(d).skills[0].name, 'review');
  assert.match(readFileSync(join(d, 'AGENTS.md'), 'utf8'), /### review/);
  rmSync(d, { recursive: true, force: true }); rmSync(src, { recursive: true, force: true });
});

test('second inherit adding a new skill: does not re-stamp the foundation (stamped=false), manifest includes both skills', () => {
  const d = tmp();
  const src1 = makeSrc('review', 'code review', 'x');
  const src2 = makeSrc('audit', 'design review', 'y');
  inherit(d, { name: 'review', from: src1 });
  const r2 = inherit(d, { name: 'audit', from: src2 });
  assert.equal(r2.stamped, false);                       // the foundation is stamped only once
  assert.deepEqual(readManifest(d).skills.map((s) => s.name), ['audit', 'review']);
  rmSync(d, { recursive: true, force: true });
});

test('repeating inherit for the same skill: idempotent (skill.changed=false)', () => {
  const d = tmp();
  const src = makeSrc('review', 'code review', 'x');
  inherit(d, { name: 'review', from: src });
  const r2 = inherit(d, { name: 'review', from: src });
  assert.equal(r2.skill.changed, false);
  assert.equal(readManifest(d).skills.length, 1);
  rmSync(d, { recursive: true, force: true });
});

test('illegal skill names are rejected (guards against directory traversal)', () => {
  const d = tmp();
  const src = makeSrc('x', 'd', 'w');
  assert.throws(() => inherit(d, { name: '../pwned', from: src }), /invalid skill name/);
  assert.throws(() => inherit(d, { name: 'Bad Name', from: src }), /invalid skill name/);
  rmSync(d, { recursive: true, force: true }); rmSync(src, { recursive: true, force: true });
});

// test/skill-install.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { installSkill, fingerprintDir } from '../lib/skill-install.mjs';

function tmp() { return mkdtempSync(join(tmpdir(), 'mh-')); }

function makeSkill(dir, body) {
  mkdirSync(join(dir, 'scripts'), { recursive: true });
  writeFileSync(join(dir, 'skill.yaml'), 'name: demo\n', 'utf8');
  writeFileSync(join(dir, 'scripts', 'x.mjs'), body, 'utf8');
}

test('first install: changed=true, files are copied', () => {
  const src = tmp(); const dst = tmp();
  makeSkill(src, 'export const v = 1;');
  const r = installSkill(dst, src, 'demo');
  assert.equal(r.changed, true);
  assert.equal(r.name, 'demo');
  assert.equal(existsSync(join(dst, 'skills', 'demo', 'scripts', 'x.mjs')), true);
  rmSync(src, { recursive: true, force: true }); rmSync(dst, { recursive: true, force: true });
});

test('reinstalling identical content: changed=false (idempotent)', () => {
  const src = tmp(); const dst = tmp();
  makeSkill(src, 'export const v = 1;');
  installSkill(dst, src, 'demo');
  const r2 = installSkill(dst, src, 'demo');
  assert.equal(r2.changed, false);
  rmSync(src, { recursive: true, force: true }); rmSync(dst, { recursive: true, force: true });
});

test('changed source content changes the fingerprint', () => {
  const a = tmp(); const b = tmp();
  makeSkill(a, 'export const v = 1;');
  makeSkill(b, 'export const v = 2;');
  assert.notEqual(fingerprintDir(a), fingerprintDir(b));
  rmSync(a, { recursive: true, force: true }); rmSync(b, { recursive: true, force: true });
});

test('when a file is deleted from the source on reinstall: the target leaves no stale files', () => {
  const src = tmp(); const dst = tmp();
  mkdirSync(join(src, 'scripts'), { recursive: true });
  writeFileSync(join(src, 'skill.yaml'), 'name: demo\n', 'utf8');
  writeFileSync(join(src, 'scripts', 'a.mjs'), 'a', 'utf8');
  writeFileSync(join(src, 'scripts', 'b.mjs'), 'b', 'utf8');
  installSkill(dst, src, 'demo');
  rmSync(join(src, 'scripts', 'b.mjs'));                 // delete b from the source
  writeFileSync(join(src, 'scripts', 'a.mjs'), 'a2', 'utf8'); // change a → fingerprint change triggers reinstall
  const r = installSkill(dst, src, 'demo');
  assert.equal(r.changed, true);
  assert.equal(existsSync(join(dst, 'skills', 'demo', 'scripts', 'b.mjs')), false); // the stale file is gone
  rmSync(src, { recursive: true, force: true }); rmSync(dst, { recursive: true, force: true });
});

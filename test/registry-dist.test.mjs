// test/registry-dist.test.mjs — distribution registry: listing + resolve-by-name + end-to-end inherit
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, existsSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadRegistry, listRegistry, resolveSource, pluginRoot, readSkillMeta } from '../lib/registry.mjs';
import { inherit } from '../lib/cli.mjs';
import { readManifest } from '../lib/manifest.mjs';

function tmp() { return mkdtempSync(join(tmpdir(), 'mh-reg-')); }

test('loadRegistry reads the golden-skill list from the plugin root', () => {
  const names = listRegistry().map((s) => s.name);
  assert.ok(names.includes('review'));
  assert.ok(names.includes('commit'));
  assert.ok(names.includes('pr-description'));
});

test('resolveSource: by name → real source directory (contains skill.yaml)', () => {
  const src = resolveSource('review');
  assert.equal(existsSync(join(src, 'skill.yaml')), true);
  assert.ok(src.startsWith(pluginRoot()));
});

test('resolveSource: already a skill path → returned as-is', () => {
  const path = join(pluginRoot(), 'gene', 'commit');
  assert.equal(resolveSource(path), path);
});

test('resolveSource: unknown name → returned as-is (let downstream error)', () => {
  assert.equal(resolveSource('no-such-skill-xyz'), 'no-such-skill-xyz');
});

test('loadRegistry: a root with no registry.json → empty list', () => {
  const d = tmp();
  assert.deepEqual(loadRegistry(d), { skills: [] });
  rmSync(d, { recursive: true, force: true });
});

test('inherit --from <registry name> inherits a golden skill end-to-end', () => {
  const d = tmp();
  const r = inherit(d, { name: 'review', from: 'review' });   // use the name, not a path
  assert.equal(existsSync(join(d, 'skills', 'review', 'prompt.md')), true);
  assert.equal(r.version, '0.1.0');
  assert.deepEqual(readManifest(d).skills.map((s) => s.name), ['review']);
  rmSync(d, { recursive: true, force: true });
});

test('resolveSource rejects a source that escapes the plugin root (prevent directory traversal)', () => {
  const d = tmp();
  writeFileSync(join(d, 'registry.json'), JSON.stringify({ skills: [{ name: 'evil', source: '../../etc' }] }), 'utf8');
  assert.throws(() => resolveSource('evil', d), /escapes plugin root/);
  writeFileSync(join(d, 'registry.json'), JSON.stringify({ skills: [{ name: 'abs', source: '/etc' }] }), 'utf8');
  assert.throws(() => resolveSource('abs', d), /must be relative/);
  rmSync(d, { recursive: true, force: true });
});

test('readSkillMeta corrupt skill.yaml → {} without throwing', () => {
  const d = tmp();
  writeFileSync(join(d, 'skill.yaml'), 'version: "1.0\n bad: [', 'utf8');
  assert.deepEqual(readSkillMeta(d), {});
  rmSync(d, { recursive: true, force: true });
});

test('inherit with an unknown --from → friendly error', () => {
  const d = tmp();
  assert.throws(() => inherit(d, { name: 'x', from: 'no-such-skill-xyz' }), /unknown skill or invalid/);
  rmSync(d, { recursive: true, force: true });
});

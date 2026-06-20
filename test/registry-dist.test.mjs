// test/registry-dist.test.mjs — 分发注册表:目录 + 按名解析 + 端到端 inherit
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, existsSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadRegistry, listRegistry, resolveSource, pluginRoot, readSkillMeta } from '../lib/registry.mjs';
import { inherit } from '../lib/cli.mjs';
import { readManifest } from '../lib/manifest.mjs';

function tmp() { return mkdtempSync(join(tmpdir(), 'mh-reg-')); }

test('loadRegistry 从插件根读出黄金技能目录', () => {
  const names = listRegistry().map((s) => s.name);
  assert.ok(names.includes('review'));
  assert.ok(names.includes('commit'));
  assert.ok(names.includes('pr-description'));
});

test('resolveSource:按名 → 真实源目录(含 skill.yaml)', () => {
  const src = resolveSource('review');
  assert.equal(existsSync(join(src, 'skill.yaml')), true);
  assert.ok(src.startsWith(pluginRoot()));
});

test('resolveSource:已是技能路径 → 原样返回', () => {
  const path = join(pluginRoot(), 'gene', 'commit');
  assert.equal(resolveSource(path), path);
});

test('resolveSource:未知名 → 原样返回(交下游报错)', () => {
  assert.equal(resolveSource('no-such-skill-xyz'), 'no-such-skill-xyz');
});

test('loadRegistry:无 registry.json 的根 → 空目录', () => {
  const d = tmp();
  assert.deepEqual(loadRegistry(d), { skills: [] });
  rmSync(d, { recursive: true, force: true });
});

test('inherit --from <注册表名> 端到端继承黄金技能', () => {
  const d = tmp();
  const r = inherit(d, { name: 'review', from: 'review' });   // 用名字而非路径
  assert.equal(existsSync(join(d, 'skills', 'review', 'prompt.md')), true);
  assert.equal(r.version, '0.1.0');
  assert.deepEqual(readManifest(d).skills.map((s) => s.name), ['review']);
  rmSync(d, { recursive: true, force: true });
});

test('resolveSource 拒绝逃出插件根的 source(防目录穿越)', () => {
  const d = tmp();
  writeFileSync(join(d, 'registry.json'), JSON.stringify({ skills: [{ name: 'evil', source: '../../etc' }] }), 'utf8');
  assert.throws(() => resolveSource('evil', d), /escapes plugin root/);
  writeFileSync(join(d, 'registry.json'), JSON.stringify({ skills: [{ name: 'abs', source: '/etc' }] }), 'utf8');
  assert.throws(() => resolveSource('abs', d), /must be relative/);
  rmSync(d, { recursive: true, force: true });
});

test('readSkillMeta 损坏 skill.yaml → {} 不抛', () => {
  const d = tmp();
  writeFileSync(join(d, 'skill.yaml'), 'version: "1.0\n bad: [', 'utf8');
  assert.deepEqual(readSkillMeta(d), {});
  rmSync(d, { recursive: true, force: true });
});

test('inherit 未知 --from → 友好报错', () => {
  const d = tmp();
  assert.throws(() => inherit(d, { name: 'x', from: 'no-such-skill-xyz' }), /unknown skill or invalid/);
  rmSync(d, { recursive: true, force: true });
});

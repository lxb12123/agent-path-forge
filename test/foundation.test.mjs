// test/foundation.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { stampFoundation } from '../lib/foundation.mjs';
import { hasGene } from '../lib/manifest.mjs';

function tmp() { return mkdtempSync(join(tmpdir(), 'mh-')); }

test('首次刻地基: stamped=true, 生成 .gene 与 GENE.md', () => {
  const d = tmp();
  const r = stampFoundation(d);
  assert.equal(r.stamped, true);
  assert.equal(hasGene(d), true);
  assert.equal(existsSync(join(d, 'GENE.md')), true);
  rmSync(d, { recursive: true, force: true });
});

test('已存在地基则幂等: stamped=false, 不覆盖 GENE.md', () => {
  const d = tmp();
  stampFoundation(d);
  writeFileSync(join(d, 'GENE.md'), 'USER EDIT', 'utf8');   // 用户改了
  const r2 = stampFoundation(d);
  assert.equal(r2.stamped, false);
  assert.equal(readFileSync(join(d, 'GENE.md'), 'utf8'), 'USER EDIT'); // 不被覆盖
  rmSync(d, { recursive: true, force: true });
});

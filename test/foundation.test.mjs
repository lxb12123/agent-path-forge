// test/foundation.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { stampFoundation } from '../lib/foundation.mjs';
import { hasGene } from '../lib/manifest.mjs';

function tmp() { return mkdtempSync(join(tmpdir(), 'mh-')); }

test('first foundation stamp: stamped=true, creates .gene, GENE.md and MEMORY.md', () => {
  const d = tmp();
  const r = stampFoundation(d);
  assert.equal(r.stamped, true);
  assert.equal(hasGene(d), true);
  assert.equal(existsSync(join(d, 'GENE.md')), true);
  assert.equal(existsSync(join(d, 'MEMORY.md')), true);   // gene #4: committable memory artifact
  rmSync(d, { recursive: true, force: true });
});

test('existing foundation is idempotent: stamped=false, does not overwrite GENE.md / MEMORY.md', () => {
  const d = tmp();
  stampFoundation(d);
  writeFileSync(join(d, 'GENE.md'), 'USER EDIT', 'utf8');     // user edited it
  writeFileSync(join(d, 'MEMORY.md'), 'USER MEMORY', 'utf8'); // user edited it
  const r2 = stampFoundation(d);
  assert.equal(r2.stamped, false);
  assert.equal(readFileSync(join(d, 'GENE.md'), 'utf8'), 'USER EDIT');      // not overwritten
  assert.equal(readFileSync(join(d, 'MEMORY.md'), 'utf8'), 'USER MEMORY');  // not overwritten
  rmSync(d, { recursive: true, force: true });
});

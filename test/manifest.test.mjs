// test/manifest.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  hasGene, readManifest, writeManifest, emptyManifest, upsertSkill, GENE_VERSION,
} from '../lib/manifest.mjs';

function tmp() { return mkdtempSync(join(tmpdir(), 'mh-')); }

test('empty project hasGene=false, readManifest=null', () => {
  const d = tmp();
  assert.equal(hasGene(d), false);
  assert.equal(readManifest(d), null);
  rmSync(d, { recursive: true, force: true });
});

test('readable back after writing, hasGene=true', () => {
  const d = tmp();
  writeManifest(d, emptyManifest());
  assert.equal(hasGene(d), true);
  const m = readManifest(d);
  assert.equal(m.geneVersion, GENE_VERSION);
  assert.deepEqual(m.skills, []);
  rmSync(d, { recursive: true, force: true });
});

test('upsertSkill adds and sorts by name, overwrites on same name', () => {
  let m = emptyManifest();
  m = upsertSkill(m, 'review', 'aaa');
  m = upsertSkill(m, 'audit', 'bbb');
  assert.deepEqual(m.skills.map(s => s.name), ['audit', 'review']);
  m = upsertSkill(m, 'review', 'ccc');                 // overwrite
  assert.equal(m.skills.find(s => s.name === 'review').fingerprint, 'ccc');
  assert.equal(m.skills.length, 2);                    // no duplicates
});

test('readManifest normalizes an empty gene.json into a valid manifest', () => {
  const d = tmp();
  mkdirSync(join(d, '.gene'), { recursive: true });
  writeFileSync(join(d, '.gene', 'gene.json'), '', 'utf8');   // empty file
  const m = readManifest(d);
  assert.equal(m.geneVersion, GENE_VERSION);
  assert.deepEqual(m.skills, []);
  rmSync(d, { recursive: true, force: true });
});

test('upsertSkill is robust against a manifest missing skills', () => {
  const m = upsertSkill({ geneVersion: GENE_VERSION }, 'review', 'aaa'); // no skills key
  assert.deepEqual(m.skills.map(s => s.name), ['review']);
});

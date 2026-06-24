// test/ignore.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadIgnorePatterns, compileIgnore } from '../lib/ignore.mjs';

function tmp() { return mkdtempSync(join(tmpdir(), 'mh-ign-')); }
function setIgnore(dir, text) {
  mkdirSync(join(dir, '.gene'), { recursive: true });
  writeFileSync(join(dir, '.gene', 'ignore'), text, 'utf8');
}

test('loadIgnorePatterns strips comments and blank lines', () => {
  const d = tmp();
  setIgnore(d, '# secrets\nsecrets/\n\n*.key\n');
  assert.deepEqual(loadIgnorePatterns(d), ['secrets/', '*.key']);
  rmSync(d, { recursive: true, force: true });
});

test('compileIgnore writes the managed block in all three ignore files, idempotent, preserves user entries', () => {
  const d = tmp();
  setIgnore(d, 'secrets/\n*.key\n');
  writeFileSync(join(d, '.gitignore'), 'node_modules/\n', 'utf8'); // user already has
  const n = compileIgnore(d);
  assert.equal(n, 2);
  for (const f of ['.gitignore', '.cursorignore', '.geminiignore']) {
    assert.equal(existsSync(join(d, f)), true);
    assert.match(readFileSync(join(d, f), 'utf8'), /agent-plugin-kit:ignore/);
    assert.match(readFileSync(join(d, f), 'utf8'), /secrets\//);
  }
  const git1 = readFileSync(join(d, '.gitignore'), 'utf8');
  assert.match(git1, /node_modules\//);                 // user entry preserved
  compileIgnore(d);
  assert.equal(readFileSync(join(d, '.gitignore'), 'utf8'), git1); // idempotent
  rmSync(d, { recursive: true, force: true });
});

test('no ignore source -> no-op, returns 0, creates no files', () => {
  const d = tmp();
  assert.equal(compileIgnore(d), 0);
  assert.equal(existsSync(join(d, '.gitignore')), false);
  rmSync(d, { recursive: true, force: true });
});

// test/diagnostics.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extractErrors, tail, runDiagnostics } from '../lib/diagnostics.mjs';

test('extractErrors picks out lines containing error/fail', () => {
  const errs = extractErrors('ok\nError: boom\nfine\nFAILED here');
  assert.equal(errs.length, 2);
  assert.match(errs[0], /boom/);
});

test('tail takes the last N lines', () => {
  assert.equal(tail('a\nb\nc\nd', 2), 'c\nd');
});

test('runDiagnostics: successful command gives ok=true, exitCode=0', () => {
  const r = runDiagnostics('node -e "console.log(\'all good\')"');
  assert.equal(r.ok, true);
  assert.equal(r.exitCode, 0);
});

test('runDiagnostics: failing command gives ok=false + captures error lines', () => {
  const r = runDiagnostics('node -e "console.error(\'Error: boom\'); process.exit(1)"');
  assert.equal(r.ok, false);
  assert.equal(r.exitCode, 1);
  assert.ok(r.errors.some((l) => /boom/.test(l)));
});

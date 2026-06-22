// test/fingerprint.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hashContent } from '../lib/fingerprint.mjs';

test('hashContent is stable and gives the same output for the same input', () => {
  assert.equal(hashContent('hello'), hashContent('hello'));
});

test('hashContent gives different output for different input', () => {
  assert.notEqual(hashContent('hello'), hashContent('world'));
});

test('hashContent returns 16 hex digits', () => {
  assert.match(hashContent('x'), /^[0-9a-f]{16}$/);
});

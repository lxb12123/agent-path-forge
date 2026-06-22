// test/yaml-lite.test.mjs — zero-dependency YAML subset: parsing + frontmatter output
// (differentially validated against js-yaml during development; this locks in the behavior and depends on no third party itself)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseYaml, toFrontmatter } from '../lib/yaml-lite.mjs';

test('flat scalars: string / quoted-with-colon / number / boolean / null / bare key', () => {
  assert.deepEqual(
    parseYaml('a: hello\nb: "x: y"\nc: 42\nd: true\ne: false\nf: null\ng:'),
    { a: 'hello', b: 'x: y', c: 42, d: true, e: false, f: null, g: null },
  );
});

test('nested map + inline empty array + block array', () => {
  const y = 'uses:\n  mcp: []\n  permissions:\n    - "Bash(node *)"\n    - Read\n  subagents: []';
  assert.deepEqual(parseYaml(y), { uses: { mcp: [], permissions: ['Bash(node *)', 'Read'], subagents: [] } });
});

test('inline array (with quoted elements containing special chars)', () => {
  assert.deepEqual(parseYaml('p: ["Bash(node *)", "x"]'), { p: ['Bash(node *)', 'x'] });
});

test('comments: whole-line / inline (including after an array) / # inside quotes preserved', () => {
  const y = '# whole-line comment\nname: x   # inline comment\narr: ["a"]   # comment after array\nnote: "has a # sign"';
  assert.deepEqual(parseYaml(y), { name: 'x', arr: ['a'], note: 'has a # sign' });
});

test('toFrontmatter round-trip: parses back to the original object', () => {
  for (const o of [
    { description: 'code review pre-commit', 'allowed-tools': 'Bash(node *)' },
    { description: 'd', globs: '*.ts', alwaysApply: false },
    { description: 'd', alwaysApply: true },
  ]) {
    assert.deepEqual(parseYaml(toFrontmatter(o)), o);
  }
});

test('toFrontmatter quoting policy: leading * needs quotes, plain text / with parens does not', () => {
  assert.match(toFrontmatter({ globs: '*.ts' }), /globs: "\*\.ts"/);
  assert.match(toFrontmatter({ description: 'code review pre-commit' }), /description: code review pre-commit/);
  assert.match(toFrontmatter({ 'allowed-tools': 'Bash(node *)' }), /allowed-tools: Bash\(node \*\)/);
});

test('fail-loud: tab indentation throws outright', () => {
  assert.throws(() => parseYaml('a:\n\tb: 1'), /tab/);
});

// ---- fixes found via adversarial review (B1/B2/B3/W1/W2/W3) ----
test('inline-array trailing comma does not produce null; empty slot / unclosed throws', () => {
  assert.deepEqual(parseYaml('g: ["*.ts",]'), { g: ['*.ts'] });
  assert.deepEqual(parseYaml('p: ["Bash(node *)",]'), { p: ['Bash(node *)'] });
  assert.throws(() => parseYaml('g: [a, , b]'), /empty element/);
  assert.throws(() => parseYaml('g: [a, b'), /unclosed/);
});

test('case-insensitive boolean/null matches js-yaml core', () => {
  assert.deepEqual(parseYaml('a: False\nb: TRUE\nc: Null'), { a: false, b: true, c: null });
});

test('anchors/aliases throw outright (contract)', () => {
  assert.throws(() => parseYaml('a: &x 1'), /anchor/);
});

test('toFrontmatter quotes values with newlines / trailing colons -> produces valid round-trippable YAML', () => {
  assert.deepEqual(parseYaml(toFrontmatter({ description: 'line1\nline2' })), { description: 'line1\nline2' });
  assert.deepEqual(parseYaml(toFrontmatter({ description: 'note:' })), { description: 'note:' });
});

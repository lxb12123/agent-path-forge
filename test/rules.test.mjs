// test/rules.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { listRules, renderCursorRuleFromRule, renderRulesSection, compileRules } from '../lib/rules.mjs';
import { compileAll } from '../lib/compiler.mjs';

function tmp() { return mkdtempSync(join(tmpdir(), 'mh-rules-')); }
function addRule(dir, name, frontmatter, body) {
  const rdir = join(dir, 'rules');
  mkdirSync(rdir, { recursive: true });
  writeFileSync(join(rdir, `${name}.md`), `---\n${frontmatter}\n---\n\n${body}\n`, 'utf8');
}

test('listRules parses frontmatter: globs string -> array, alwaysApply defaults to true', () => {
  const d = tmp();
  addRule(d, 'style', 'description: code style\nglobs: "*.ts, *.tsx"', 'indent with two spaces');
  addRule(d, 'always', 'description: general conventions', 'run tests before commit');
  const rules = listRules(d);
  assert.equal(rules.length, 2);
  const style = rules.find((r) => r.name === 'style');
  assert.deepEqual(style.globs, ['*.ts', '*.tsx']);
  assert.equal(style.description, 'code style');
  const always = rules.find((r) => r.name === 'always');
  assert.equal(always.alwaysApply, true);
  assert.deepEqual(always.globs, []);
  rmSync(d, { recursive: true, force: true });
});

test('renderCursorRuleFromRule: with globs -> alwaysApply:false; without globs -> always', () => {
  const withGlobs = renderCursorRuleFromRule({ name: 'x', description: 'd', globs: ['*.ts'], alwaysApply: true, body: 'B' });
  assert.match(withGlobs, /globs: ["']?\*\.ts["']?/);
  assert.match(withGlobs, /alwaysApply: false/);
  const always = renderCursorRuleFromRule({ name: 'y', description: 'd', globs: [], alwaysApply: true, body: 'B' });
  assert.match(always, /alwaysApply: true/);
});

test('renderRulesSection produces ## Rules + name + body', () => {
  const md = renderRulesSection([{ name: 'style', description: 'code style', globs: [], alwaysApply: true, body: 'two spaces' }]);
  assert.match(md, /## Rules/);
  assert.match(md, /### style/);
  assert.match(md, /two spaces/);
});

test('compileRules writes .cursor/rules + CLAUDE.md managed block, idempotent, preserves user content', () => {
  const d = tmp();
  addRule(d, 'style', 'description: code style', 'indent with two spaces');
  writeFileSync(join(d, 'CLAUDE.md'), '# My project\n\nuser\'s own notes\n', 'utf8');
  const n = compileRules(d);
  assert.equal(n, 1);
  assert.equal(existsSync(join(d, '.cursor', 'rules', 'style.mdc')), true);
  const claude1 = readFileSync(join(d, 'CLAUDE.md'), 'utf8');
  assert.match(claude1, /user's own notes/);          // user content preserved
  assert.match(claude1, /agent-plugin-kit:rules:start/);
  assert.match(claude1, /indent with two spaces/);
  compileRules(d);                                     // compile once more
  assert.equal(readFileSync(join(d, 'CLAUDE.md'), 'utf8'), claude1); // idempotent
  rmSync(d, { recursive: true, force: true });
});

test('compileAll: with rules, AGENTS.md includes the ## Rules section', () => {
  const d = tmp();
  const sdir = join(d, 'skills', 'review');
  mkdirSync(sdir, { recursive: true });
  writeFileSync(join(sdir, 'skill.yaml'), 'name: review\ndescription: review\nwhen-to-use: pre-commit\n', 'utf8');
  writeFileSync(join(sdir, 'prompt.md'), 'review the diff', 'utf8');
  addRule(d, 'style', 'description: code style', 'two spaces');
  compileAll(d);
  assert.match(readFileSync(join(d, 'AGENTS.md'), 'utf8'), /## Rules/);
  rmSync(d, { recursive: true, force: true });
});

test('compileAll: skill and rule with the same name -> throws (prevents .cursor/rules overwrite)', () => {
  const d = tmp();
  const sdir = join(d, 'skills', 'dup');
  mkdirSync(sdir, { recursive: true });
  writeFileSync(join(sdir, 'skill.yaml'), 'name: dup\ndescription: d\nwhen-to-use: w\n', 'utf8');
  writeFileSync(join(sdir, 'prompt.md'), 'P', 'utf8');
  addRule(d, 'dup', 'description: same-name rule', 'R');
  assert.throws(() => compileAll(d), /name collision/);
  rmSync(d, { recursive: true, force: true });
});

test('listRules: bad frontmatter does not crash, degrades to empty metadata', () => {
  const d = tmp();
  addRule(d, 'ok', 'description: normal', 'body');
  writeFileSync(join(d, 'rules', 'bad.md'), '---\ndescription: "unclosed\n---\n\nbody\n', 'utf8');
  const rules = listRules(d);
  assert.equal(rules.length, 2);
  assert.equal(rules.find((r) => r.name === 'bad').description, '');
  rmSync(d, { recursive: true, force: true });
});

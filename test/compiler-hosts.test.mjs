// test/compiler-hosts.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  listSkills, renderClaudeSkill, compileClaudeSkills,
  renderCursorRule, compileCursorRules, compileAll,
} from '../lib/compiler.mjs';

function tmp() { return mkdtempSync(join(tmpdir(), 'mh-')); }
function addSkill(dir, name, desc, when, prompt) {
  const s = join(dir, 'skills', name);
  mkdirSync(s, { recursive: true });
  writeFileSync(join(s, 'skill.yaml'), `name: ${name}\ndescription: ${desc}\nwhen-to-use: ${when}\n`, 'utf8');
  writeFileSync(join(s, 'prompt.md'), prompt, 'utf8');
}

test('listSkills now carries the prompt body', () => {
  const d = tmp();
  addSkill(d, 'review', 'code review', 'pre-commit', '# /review\nreview the diff');
  const list = listSkills(d);
  assert.match(list[0].prompt, /review the diff/);
  rmSync(d, { recursive: true, force: true });
});

test('renderClaudeSkill produces description frontmatter + body', () => {
  const md = renderClaudeSkill({ name: 'review', description: 'code review', whenToUse: 'pre-commit', prompt: '# /review\nreview the diff' });
  assert.match(md, /^---\n/);
  assert.match(md, /description: code review.*pre-commit/);
  assert.match(md, /review the diff/);
});

test('compileClaudeSkills writes .claude/skills/<name>/SKILL.md', () => {
  const d = tmp();
  addSkill(d, 'review', 'code review', 'pre-commit', '# /review\nreview the diff');
  const n = compileClaudeSkills(d);
  assert.equal(n, 1);
  const p = join(d, '.claude', 'skills', 'review', 'SKILL.md');
  assert.equal(existsSync(p), true);
  assert.match(readFileSync(p, 'utf8'), /description: code review/);
  rmSync(d, { recursive: true, force: true });
});

test('renderCursorRule includes alwaysApply:false + description + body', () => {
  const md = renderCursorRule({ name: 'review', description: 'code review', whenToUse: 'pre-commit', prompt: 'review the diff' });
  assert.match(md, /alwaysApply: false/);
  assert.match(md, /description: code review/);
  assert.match(md, /review the diff/);
});

test('compileCursorRules writes .cursor/rules/<name>.mdc', () => {
  const d = tmp();
  addSkill(d, 'review', 'code review', 'pre-commit', 'review the diff');
  const n = compileCursorRules(d);
  assert.equal(n, 1);
  const p = join(d, '.cursor', 'rules', 'review.mdc');
  assert.equal(existsSync(p), true);
  assert.match(readFileSync(p, 'utf8'), /alwaysApply: false/);
  rmSync(d, { recursive: true, force: true });
});

test('compileAll produces AGENTS.md + .claude/skills + .cursor/rules at once, returns skill count', () => {
  const d = tmp();
  addSkill(d, 'review', 'code review', 'pre-commit', 'review the diff');
  const n = compileAll(d);
  assert.equal(n, 1);
  assert.equal(existsSync(join(d, 'AGENTS.md')), true);
  assert.equal(existsSync(join(d, '.claude', 'skills', 'review', 'SKILL.md')), true);
  assert.equal(existsSync(join(d, '.cursor', 'rules', 'review.mdc')), true);
  rmSync(d, { recursive: true, force: true });
});

// test/compiler.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { listSkills, renderAgentsMd, compileAgentsMd } from '../lib/compiler.mjs';

function tmp() { return mkdtempSync(join(tmpdir(), 'mh-')); }

function addSkill(dir, name, desc, when) {
  const s = join(dir, 'skills', name);
  mkdirSync(s, { recursive: true });
  writeFileSync(join(s, 'skill.yaml'), `name: ${name}\ndescription: ${desc}\nwhen-to-use: ${when}\n`, 'utf8');
}

test('listSkills reads name/description/when-to-use and sorts', () => {
  const d = tmp();
  addSkill(d, 'review', 'code review', 'review the diff before commit');
  addSkill(d, 'audit', 'design review', 'check for anti-patterns');
  const list = listSkills(d);
  assert.deepEqual(list.map((s) => s.name), ['audit', 'review']);
  assert.equal(list[1].whenToUse, 'review the diff before commit');
  rmSync(d, { recursive: true, force: true });
});

test('renderAgentsMd includes the title and a section per skill', () => {
  const md = renderAgentsMd([{ name: 'review', description: 'code review', whenToUse: 'review the diff before commit' }]);
  assert.match(md, /^# AGENTS\.md/);
  assert.match(md, /### review/);
  assert.match(md, /skills\/review\//);
});

test('compileAgentsMd writes the file and returns the skill count', () => {
  const d = tmp();
  addSkill(d, 'review', 'code review', 'review the diff before commit');
  const n = compileAgentsMd(d);
  assert.equal(n, 1);
  assert.equal(existsSync(join(d, 'AGENTS.md')), true);
  assert.match(readFileSync(join(d, 'AGENTS.md'), 'utf8'), /### review/);
  rmSync(d, { recursive: true, force: true });
});

test('listSkills skips directories without skill.yaml', () => {
  const d = tmp();
  addSkill(d, 'review', 'code review', 'x');
  mkdirSync(join(d, 'skills', 'not-a-skill'), { recursive: true });  // stray directory, no skill.yaml
  const list = listSkills(d);
  assert.deepEqual(list.map((s) => s.name), ['review']);             // stray directory is ignored
  const n = compileAgentsMd(d);                                       // does not crash
  assert.equal(n, 1);
  rmSync(d, { recursive: true, force: true });
});

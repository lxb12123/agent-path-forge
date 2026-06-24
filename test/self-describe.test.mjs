// test/self-describe.test.mjs — gene #5: the uses self-describing block compiles to real effects
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { listSkills, renderClaudeSkill, renderAgentsMd } from '../lib/compiler.mjs';

function tmp() { return mkdtempSync(join(tmpdir(), 'mh-')); }
function addSkill(dir, name, uses) {
  const s = join(dir, 'skills', name);
  mkdirSync(s, { recursive: true });
  const y = `name: ${name}\ndescription: d\nwhen-to-use: w\nuses:\n`
    + `  mcp: ${JSON.stringify(uses.mcp || [])}\n`
    + `  permissions: ${JSON.stringify(uses.permissions || [])}\n`
    + `  subagents: ${JSON.stringify(uses.subagents || [])}\n`;
  writeFileSync(join(s, 'skill.yaml'), y, 'utf8');
  writeFileSync(join(s, 'prompt.md'), 'body', 'utf8');
}

test('listSkills surfaces the uses self-describing block', () => {
  const d = tmp(); addSkill(d, 'review', { permissions: ['Bash(node *)'] });
  assert.deepEqual(listSkills(d)[0].uses.permissions, ['Bash(node *)']);
  rmSync(d, { recursive: true, force: true });
});

test('renderClaudeSkill: uses.permissions → allowed-tools frontmatter', () => {
  const md = renderClaudeSkill({ name: 'review', description: 'd', whenToUse: 'w', prompt: 'body', uses: { permissions: ['Bash(node *)'], mcp: [], subagents: [] } });
  assert.match(md, /allowed-tools:/);
  assert.match(md, /Bash\(node \*\)/);
});

test('renderClaudeSkill: no permissions means no allowed-tools', () => {
  const md = renderClaudeSkill({ name: 'x', description: 'd', whenToUse: 'w', prompt: 'b', uses: { permissions: [], mcp: [], subagents: [] } });
  assert.doesNotMatch(md, /allowed-tools:/);
});

test('renderAgentsMd: non-empty uses are listed as dependencies', () => {
  const md = renderAgentsMd([{ name: 'review', description: 'd', whenToUse: 'w', uses: { permissions: ['Bash(node *)'], mcp: ['agent-plugin-kit-diagnostics'], subagents: [] } }]);
  assert.match(md, /agent-plugin-kit-diagnostics/);
  assert.match(md, /Bash\(node \*\)/);
});

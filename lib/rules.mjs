// lib/rules.mjs — rules primitive: project-level always-on / glob-triggered instructions, compiled into each host's native format.
// Source: rules/<name>.md (frontmatter: description, globs?, alwaysApply?), the body is the instruction itself.
import { readdirSync, readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { parseYaml, toFrontmatter } from './yaml-lite.mjs';
import { upsertBlock } from './managed-block.mjs';

const CLAUDE_START = '<!-- agent-path-forge:rules:start -->';
const CLAUDE_END = '<!-- agent-path-forge:rules:end -->';

function parseFrontmatter(text) {
  const m = /^---\n([\s\S]*?)\n?---\n?([\s\S]*)$/.exec(text);   // also tolerates empty frontmatter
  if (!m) return { data: {}, body: text };
  let data = {};
  try { data = parseYaml(m[1]) || {}; } catch { data = {}; }    // bad frontmatter must not crash the whole compile
  if (typeof data !== 'object' || Array.isArray(data)) data = {};
  return { data, body: m[2] };
}

function normGlobs(g) {
  if (Array.isArray(g)) return g.map((x) => String(x).trim()).filter(Boolean);
  if (typeof g === 'string') return g.split(',').map((s) => s.trim()).filter(Boolean);
  return [];
}

export function listRules(targetDir) {
  const dir = join(targetDir, 'rules');
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((n) => n.endsWith('.md'))
    .sort()
    .map((file) => {
      const { data, body } = parseFrontmatter(readFileSync(join(dir, file), 'utf8'));
      return {
        name: file.replace(/\.md$/, ''),
        description: data.description || '',
        globs: normGlobs(data.globs),
        alwaysApply: data.alwaysApply !== false, // always-on by default
        body: body.trim(),
      };
    });
}

// Cursor .mdc: with globs -> auto-attached (alwaysApply:false); without globs and alwaysApply -> always.
export function renderCursorRuleFromRule(r) {
  const fm = { description: r.description };
  if (r.globs.length) fm.globs = r.globs.join(',');
  fm.alwaysApply = r.globs.length ? false : r.alwaysApply;
  return `---\n${toFrontmatter(fm)}\n---\n\n${r.body}\n`;
}

// The "## Rules" section of AGENTS.md (open standard: Cursor/Copilot/Gemini all read it)
export function renderRulesSection(rules) {
  if (!rules.length) return '';
  const lines = ['## Rules', ''];
  for (const r of rules) {
    lines.push(`### ${r.name}`, '');
    if (r.description) lines.push(r.description, '');
    lines.push(`- Applies: ${r.globs.length ? `globs ${r.globs.join(', ')}` : r.alwaysApply ? 'always' : 'on demand'}`, '');
    if (r.body) lines.push(r.body, '');
  }
  return lines.join('\n').trimEnd();
}

// The body of the CLAUDE.md managed block (Claude Code reads CLAUDE.md as project memory)
function claudeRulesBody(rules) {
  return rules.map((r) => {
    const head = `### ${r.name}${r.globs.length ? ` (globs: ${r.globs.join(', ')})` : ''}`;
    return [head, r.description, r.body].filter(Boolean).join('\n\n');
  }).join('\n\n');
}

// Write .cursor/rules/<name>.mdc + stamp the rules into the agent-path-forge managed block in CLAUDE.md.
export function compileRules(targetDir) {
  const rules = listRules(targetDir);
  if (!rules.length) return 0;
  const cursorDir = join(targetDir, '.cursor', 'rules');
  mkdirSync(cursorDir, { recursive: true });
  for (const r of rules) {
    writeFileSync(join(cursorDir, `${r.name}.mdc`), renderCursorRuleFromRule(r), 'utf8');
  }
  const claudeMd = join(targetDir, 'CLAUDE.md');
  const existing = existsSync(claudeMd) ? readFileSync(claudeMd, 'utf8') : '';
  const body = `# Project rules (agent-path-forge)\n\n${claudeRulesBody(rules)}`;
  writeFileSync(claudeMd, upsertBlock(existing, CLAUDE_START, CLAUDE_END, body), 'utf8');
  return rules.length;
}

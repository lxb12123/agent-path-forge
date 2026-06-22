// lib/scaffold.mjs
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const skillYaml = (name) => `name: ${name}
description: TODO one-line description of what this skill does
when-to-use: TODO in what situations it should be used
# argument-hint: <describe the command arguments>   # optional; only for the input hint shown after a Claude Code slash command and a space
# Self-describing primitive (gene #5): declare the capabilities this skill uses
uses:
  mcp: []
  permissions: []
  subagents: []
`;

const promptMd = (name) => `# /${name}

TODO: spell out what this skill has the LLM do and what it produces.

- Put deterministic steps into \`scripts/\` (0 tokens) and call their output here.
- Put any domain knowledge you need into \`reference/\`, loaded on demand.
`;

// Generate a blank but structurally valid skill scaffold (to be filled in by /inherit, then installed)
export function scaffoldSkill(destDir, name) {
  mkdirSync(join(destDir, 'scripts'), { recursive: true });
  mkdirSync(join(destDir, 'reference'), { recursive: true });
  writeFileSync(join(destDir, 'skill.yaml'), skillYaml(name), 'utf8');
  writeFileSync(join(destDir, 'prompt.md'), promptMd(name), 'utf8');
  return { destDir, name };
}

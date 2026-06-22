# Meta-Harness v0.1 Implementation Plan

> **For agentic workers:** implement this plan task-by-task (one task at a time, review between tasks). Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a minimal, usable Claude Code plugin that, with a single idempotent command `/inherit`, stamps a "gene foundation" into any project, grows a gene-compliant skill (the golden skill `/review`), and then compiles an `AGENTS.md`.

**Architecture:** Plugin = Markdown commands/skills (Claude Code itself is the engine) + a separately testable Node.js deterministic engine (`lib/`). The command prompt `commands/inherit.md` directs the agent to call `lib/cli.mjs` to perform "detect → stamp foundation (idempotent) → install skill (fingerprint-idempotent) → compile AGENTS.md". The golden skill `/review` ships with a deterministic `scripts/collect-diff.mjs` (collects the git diff, 0 tokens) + `prompt.md` (LLM review), proving all 5 genes in one shot.

**Tech Stack:** Node.js ≥18 (ESM) · tests use the built-in `node:test` + `node:assert/strict` (`node --test`) · the only runtime dependency is `js-yaml` · git.

**Spec:** `docs/design/specs/2026-06-19-meta-harness-gene-plugin-design.md` (§9 is the acceptance baseline for this plan)

---

## File Structure

```
Meta-Harness/                         # Plugin repo root (= current working directory)
├── package.json                      # Node ESM project + js-yaml + test script
├── plugin.json                       # Claude Code plugin manifest
├── commands/
│   └── inherit.md                    # /inherit meta-command (prompt; directs the agent to call lib/cli.mjs)
├── gene/
│   └── golden-skill/                 # Golden skill /review (DNA seed, copied by /inherit)
│       ├── skill.yaml                # Metadata + when-to-use + self-describing fields
│       ├── prompt.md                 # LLM review instructions
│       ├── reference/
│       │   └── review-standards.md   # Review standards (loaded on demand)
│       └── scripts/
│           └── collect-diff.mjs      # Deterministic: git diff + changed files (0 tokens)
├── lib/                              # Deterministic engine (the heart of TDD)
│   ├── fingerprint.mjs               # Content fingerprint (sha256)
│   ├── manifest.mjs                  # .gene/gene.yaml read/write + hasGene + upsertSkill
│   ├── foundation.mjs                # Idempotent foundation stamping
│   ├── skill-install.mjs             # Fingerprint-idempotent skill install
│   ├── compiler.mjs                  # skills/ → AGENTS.md
│   └── cli.mjs                       # inherit orchestration + command-line entry point
└── test/
    ├── fingerprint.test.mjs
    ├── manifest.test.mjs
    ├── foundation.test.mjs
    ├── skill-install.test.mjs
    ├── compiler.test.mjs
    ├── cli.test.mjs
    ├── collect-diff.test.mjs
    └── acceptance.test.mjs           # §9 end-to-end acceptance
```

**Data shapes (consistent across the whole plan):**
- `gene.yaml` (parsed as an object): `{ geneVersion: "0.1.0", skills: [ { name: string, fingerprint: string } ] }`
- Fingerprint: for every file in the directory, sort and concatenate `relativePath:content`, then take the first 16 hex chars of its sha256.
- `installSkill` returns: `{ name, fingerprint, changed }`
- `inherit` returns: `{ stamped: boolean, skill: {name,fingerprint,changed}, compiledSkills: number }`

---

## Task 0: Project scaffolding

**Files:**
- Create: `package.json`
- Create: `plugin.json`
- Create: `.gitignore`

- [ ] **Step 1: Initialize the git repository**

Run:
```bash
cd /Users/lixibin/Desktop/Meta-Harness && git init
```
Expected: `Initialized empty Git repository ...`

- [ ] **Step 2: Write `package.json`**

```json
{
  "name": "meta-harness",
  "version": "0.1.0",
  "description": "Agent-native gene plugin: one idempotent command stamps good-architecture genes into any project",
  "type": "module",
  "license": "MIT",
  "bin": { "meta-harness": "lib/cli.mjs" },
  "scripts": {
    "test": "node --test"
  },
  "dependencies": {
    "js-yaml": "^4.1.0"
  }
}
```

- [ ] **Step 3: Write `plugin.json` (Claude Code plugin manifest)**

```json
{
  "name": "meta-harness",
  "version": "0.1.0",
  "description": "Stamp good-architecture genes into any project; grow a gene-compliant skill in one sentence",
  "commands": ["commands/inherit.md"]
}
```

- [ ] **Step 4: Write `.gitignore`**

```
node_modules/
```

- [ ] **Step 5: Install dependencies and smoke-test**

Run:
```bash
cd /Users/lixibin/Desktop/Meta-Harness && npm install && node -e "import('js-yaml').then(m=>console.log('yaml ok', typeof m.default.load))"
```
Expected: `yaml ok function`

- [ ] **Step 6: Commit**

```bash
git add package.json plugin.json .gitignore package-lock.json
git commit -m "chore: scaffold meta-harness plugin (node esm + js-yaml)"
```

---

## Task 1: Content fingerprint `lib/fingerprint.mjs`

**Files:**
- Create: `lib/fingerprint.mjs`
- Test: `test/fingerprint.test.mjs`

- [ ] **Step 1: Write the failing test**

```javascript
// test/fingerprint.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hashContent } from '../lib/fingerprint.mjs';

test('hashContent is stable: same input, same output', () => {
  assert.equal(hashContent('hello'), hashContent('hello'));
});

test('hashContent: different input, different output', () => {
  assert.notEqual(hashContent('hello'), hashContent('world'));
});

test('hashContent returns 16 hex chars', () => {
  assert.match(hashContent('x'), /^[0-9a-f]{16}$/);
});
```

- [ ] **Step 2: Run and confirm it fails**

Run: `node --test test/fingerprint.test.mjs`
Expected: FAIL (`Cannot find module '../lib/fingerprint.mjs'`)

- [ ] **Step 3: Write the implementation**

```javascript
// lib/fingerprint.mjs
import { createHash } from 'node:crypto';

export function hashContent(content) {
  return createHash('sha256').update(content).digest('hex').slice(0, 16);
}
```

- [ ] **Step 4: Run and confirm it passes**

Run: `node --test test/fingerprint.test.mjs`
Expected: PASS (3 tests pass)

- [ ] **Step 5: Commit**

```bash
git add lib/fingerprint.mjs test/fingerprint.test.mjs
git commit -m "feat: content fingerprint (sha256/16)"
```

---

## Task 2: Manifest read/write `lib/manifest.mjs`

**Files:**
- Create: `lib/manifest.mjs`
- Test: `test/manifest.test.mjs`

- [ ] **Step 1: Write the failing test**

```javascript
// test/manifest.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  hasGene, readManifest, writeManifest, emptyManifest, upsertSkill, GENE_VERSION,
} from '../lib/manifest.mjs';

function tmp() { return mkdtempSync(join(tmpdir(), 'mh-')); }

test('empty project: hasGene=false, readManifest=null', () => {
  const d = tmp();
  assert.equal(hasGene(d), false);
  assert.equal(readManifest(d), null);
  rmSync(d, { recursive: true, force: true });
});

test('after writing it reads back, hasGene=true', () => {
  const d = tmp();
  writeManifest(d, emptyManifest());
  assert.equal(hasGene(d), true);
  const m = readManifest(d);
  assert.equal(m.geneVersion, GENE_VERSION);
  assert.deepEqual(m.skills, []);
  rmSync(d, { recursive: true, force: true });
});

test('upsertSkill adds and sorts by name, overwrites same name', () => {
  let m = emptyManifest();
  m = upsertSkill(m, 'review', 'aaa');
  m = upsertSkill(m, 'audit', 'bbb');
  assert.deepEqual(m.skills.map(s => s.name), ['audit', 'review']);
  m = upsertSkill(m, 'review', 'ccc');                 // overwrite
  assert.equal(m.skills.find(s => s.name === 'review').fingerprint, 'ccc');
  assert.equal(m.skills.length, 2);                    // no duplicates
});
```

- [ ] **Step 2: Run and confirm it fails**

Run: `node --test test/manifest.test.mjs`
Expected: FAIL (module not found)

- [ ] **Step 3: Write the implementation**

```javascript
// lib/manifest.mjs
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import yaml from 'js-yaml';

export const GENE_VERSION = '0.1.0';
const GENE_DIR = '.gene';
const MANIFEST = 'gene.yaml';

export function genePath(targetDir) { return join(targetDir, GENE_DIR); }
export function manifestPath(targetDir) { return join(targetDir, GENE_DIR, MANIFEST); }

export function hasGene(targetDir) { return existsSync(manifestPath(targetDir)); }

export function readManifest(targetDir) {
  if (!hasGene(targetDir)) return null;
  return yaml.load(readFileSync(manifestPath(targetDir), 'utf8'));
}

export function writeManifest(targetDir, manifest) {
  const p = manifestPath(targetDir);
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, yaml.dump(manifest), 'utf8');
}

export function emptyManifest() {
  return { geneVersion: GENE_VERSION, skills: [] };
}

export function upsertSkill(manifest, name, fingerprint) {
  const skills = manifest.skills.filter((s) => s.name !== name);
  skills.push({ name, fingerprint });
  skills.sort((a, b) => a.name.localeCompare(b.name));
  return { ...manifest, skills };
}
```

- [ ] **Step 4: Run and confirm it passes**

Run: `node --test test/manifest.test.mjs`
Expected: PASS (3 tests pass)

- [ ] **Step 5: Commit**

```bash
git add lib/manifest.mjs test/manifest.test.mjs
git commit -m "feat: .gene/gene.yaml manifest read/write + upsertSkill"
```

---

## Task 3: Idempotent foundation stamping `lib/foundation.mjs`

**Files:**
- Create: `lib/foundation.mjs`
- Test: `test/foundation.test.mjs`

- [ ] **Step 1: Write the failing test**

```javascript
// test/foundation.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { stampFoundation } from '../lib/foundation.mjs';
import { hasGene } from '../lib/manifest.mjs';

function tmp() { return mkdtempSync(join(tmpdir(), 'mh-')); }

test('first stamp: stamped=true, creates .gene and GENE.md', () => {
  const d = tmp();
  const r = stampFoundation(d);
  assert.equal(r.stamped, true);
  assert.equal(hasGene(d), true);
  assert.equal(existsSync(join(d, 'GENE.md')), true);
  rmSync(d, { recursive: true, force: true });
});

test('idempotent when foundation exists: stamped=false, does not overwrite GENE.md', () => {
  const d = tmp();
  stampFoundation(d);
  writeFileSync(join(d, 'GENE.md'), 'USER EDIT', 'utf8');   // user edited it
  const r2 = stampFoundation(d);
  assert.equal(r2.stamped, false);
  assert.equal(readFileSync(join(d, 'GENE.md'), 'utf8'), 'USER EDIT'); // not overwritten
  rmSync(d, { recursive: true, force: true });
});
```

- [ ] **Step 2: Run and confirm it fails**

Run: `node --test test/foundation.test.mjs`
Expected: FAIL (module not found)

- [ ] **Step 3: Write the implementation**

```javascript
// lib/foundation.mjs
import { existsSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { hasGene, writeManifest, emptyManifest, genePath } from './manifest.mjs';

const GENE_MD = `# Gene

This project was stamped with the Meta-Harness gene. Architecture decisions and context are recorded here (committable, cross-session).
`;

export function stampFoundation(targetDir) {
  if (hasGene(targetDir)) return { stamped: false };   // idempotent: skip if already stamped
  mkdirSync(genePath(targetDir), { recursive: true });
  writeManifest(targetDir, emptyManifest());
  mkdirSync(join(targetDir, 'skills'), { recursive: true });
  const geneMd = join(targetDir, 'GENE.md');
  if (!existsSync(geneMd)) writeFileSync(geneMd, GENE_MD, 'utf8');
  return { stamped: true };
}
```

- [ ] **Step 4: Run and confirm it passes**

Run: `node --test test/foundation.test.mjs`
Expected: PASS (2 tests pass)

- [ ] **Step 5: Commit**

```bash
git add lib/foundation.mjs test/foundation.test.mjs
git commit -m "feat: idempotent foundation stamping (.gene + GENE.md + skills/)"
```

---

## Task 4: Fingerprint-idempotent skill install `lib/skill-install.mjs`

**Files:**
- Create: `lib/skill-install.mjs`
- Test: `test/skill-install.test.mjs`

- [ ] **Step 1: Write the failing test**

```javascript
// test/skill-install.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { installSkill, fingerprintDir } from '../lib/skill-install.mjs';

function tmp() { return mkdtempSync(join(tmpdir(), 'mh-')); }

function makeSkill(dir, body) {
  mkdirSync(join(dir, 'scripts'), { recursive: true });
  writeFileSync(join(dir, 'skill.yaml'), 'name: demo\n', 'utf8');
  writeFileSync(join(dir, 'scripts', 'x.mjs'), body, 'utf8');
}

test('first install: changed=true, files are copied', () => {
  const src = tmp(); const dst = tmp();
  makeSkill(src, 'export const v = 1;');
  const r = installSkill(dst, src, 'demo');
  assert.equal(r.changed, true);
  assert.equal(r.name, 'demo');
  assert.equal(existsSync(join(dst, 'skills', 'demo', 'scripts', 'x.mjs')), true);
  rmSync(src, { recursive: true, force: true }); rmSync(dst, { recursive: true, force: true });
});

test('reinstall identical content: changed=false (idempotent)', () => {
  const src = tmp(); const dst = tmp();
  makeSkill(src, 'export const v = 1;');
  installSkill(dst, src, 'demo');
  const r2 = installSkill(dst, src, 'demo');
  assert.equal(r2.changed, false);
  rmSync(src, { recursive: true, force: true }); rmSync(dst, { recursive: true, force: true });
});

test('changed source content changes the fingerprint', () => {
  const a = tmp(); const b = tmp();
  makeSkill(a, 'export const v = 1;');
  makeSkill(b, 'export const v = 2;');
  assert.notEqual(fingerprintDir(a), fingerprintDir(b));
  rmSync(a, { recursive: true, force: true }); rmSync(b, { recursive: true, force: true });
});
```

- [ ] **Step 2: Run and confirm it fails**

Run: `node --test test/skill-install.test.mjs`
Expected: FAIL (module not found)

- [ ] **Step 3: Write the implementation**

```javascript
// lib/skill-install.mjs
import { readdirSync, readFileSync, writeFileSync, mkdirSync, statSync, existsSync } from 'node:fs';
import { join, relative, dirname } from 'node:path';
import { hashContent } from './fingerprint.mjs';

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out.sort();
}

export function fingerprintDir(srcDir) {
  const parts = walk(srcDir).map((f) => `${relative(srcDir, f)}:${readFileSync(f, 'utf8')}`);
  return hashContent(parts.join('\n'));
}

export function installSkill(targetDir, srcDir, name) {
  const fingerprint = fingerprintDir(srcDir);
  const destBase = join(targetDir, 'skills', name);
  if (existsSync(destBase) && fingerprintDir(destBase) === fingerprint) {
    return { name, fingerprint, changed: false };       // idempotent: skip if content matches
  }
  for (const f of walk(srcDir)) {
    const dest = join(destBase, relative(srcDir, f));
    mkdirSync(dirname(dest), { recursive: true });
    writeFileSync(dest, readFileSync(f));
  }
  return { name, fingerprint, changed: true };
}
```

- [ ] **Step 4: Run and confirm it passes**

Run: `node --test test/skill-install.test.mjs`
Expected: PASS (3 tests pass)

- [ ] **Step 5: Commit**

```bash
git add lib/skill-install.mjs test/skill-install.test.mjs
git commit -m "feat: fingerprint-idempotent skill install"
```

---

## Task 5: Compile AGENTS.md `lib/compiler.mjs`

**Files:**
- Create: `lib/compiler.mjs`
- Test: `test/compiler.test.mjs`

- [ ] **Step 1: Write the failing test**

```javascript
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
  addSkill(d, 'review', 'Code review', 'Review the diff before committing');
  addSkill(d, 'audit', 'Design review', 'Check for anti-patterns');
  const list = listSkills(d);
  assert.deepEqual(list.map((s) => s.name), ['audit', 'review']);
  assert.equal(list[1].whenToUse, 'Review the diff before committing');
  rmSync(d, { recursive: true, force: true });
});

test('renderAgentsMd includes a title and a section per skill', () => {
  const md = renderAgentsMd([{ name: 'review', description: 'Code review', whenToUse: 'Review the diff before committing' }]);
  assert.match(md, /^# AGENTS\.md/);
  assert.match(md, /### review/);
  assert.match(md, /skills\/review\//);
});

test('compileAgentsMd writes the file and returns the skill count', () => {
  const d = tmp();
  addSkill(d, 'review', 'Code review', 'Review the diff before committing');
  const n = compileAgentsMd(d);
  assert.equal(n, 1);
  assert.equal(existsSync(join(d, 'AGENTS.md')), true);
  assert.match(readFileSync(join(d, 'AGENTS.md'), 'utf8'), /### review/);
  rmSync(d, { recursive: true, force: true });
});
```

- [ ] **Step 2: Run and confirm it fails**

Run: `node --test test/compiler.test.mjs`
Expected: FAIL (module not found)

- [ ] **Step 3: Write the implementation**

```javascript
// lib/compiler.mjs
import { readdirSync, readFileSync, writeFileSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
import yaml from 'js-yaml';

export function listSkills(targetDir) {
  const skillsDir = join(targetDir, 'skills');
  if (!existsSync(skillsDir)) return [];
  return readdirSync(skillsDir)
    .filter((n) => statSync(join(skillsDir, n)).isDirectory())
    .sort()
    .map((name) => {
      const meta = yaml.load(readFileSync(join(skillsDir, name, 'skill.yaml'), 'utf8')) || {};
      return { name, whenToUse: meta['when-to-use'] || '', description: meta.description || '' };
    });
}

export function renderAgentsMd(skills) {
  const lines = [
    '# AGENTS.md',
    '',
    '> Compiled from the Meta-Harness gene, to be read by any AI coding host.',
    '',
    '## Skills',
    '',
  ];
  for (const s of skills) {
    lines.push(`### ${s.name}`, '', s.description, '',
      `- When to use: ${s.whenToUse}`, `- Location: \`skills/${s.name}/\``, '');
  }
  return lines.join('\n');
}

export function compileAgentsMd(targetDir) {
  const skills = listSkills(targetDir);
  writeFileSync(join(targetDir, 'AGENTS.md'), renderAgentsMd(skills), 'utf8');
  return skills.length;
}
```

- [ ] **Step 4: Run and confirm it passes**

Run: `node --test test/compiler.test.mjs`
Expected: PASS (3 tests pass)

- [ ] **Step 5: Commit**

```bash
git add lib/compiler.mjs test/compiler.test.mjs
git commit -m "feat: compile skills/ to AGENTS.md (open standard)"
```

---

## Task 6: Orchestration + command-line entry point `lib/cli.mjs`

**Files:**
- Create: `lib/cli.mjs`
- Test: `test/cli.test.mjs`

- [ ] **Step 1: Write the failing test**

```javascript
// test/cli.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { inherit } from '../lib/cli.mjs';
import { readManifest } from '../lib/manifest.mjs';

function tmp() { return mkdtempSync(join(tmpdir(), 'mh-')); }
function makeSrc(name, desc, when) {
  const src = tmp();
  writeFileSync(join(src, 'skill.yaml'), `name: ${name}\ndescription: ${desc}\nwhen-to-use: ${when}\n`, 'utf8');
  return src;
}

test('inherit on empty project: stamp foundation + install skill + compile, manifest contains the skill', () => {
  const d = tmp();
  const src = makeSrc('review', 'Code review', 'Review the diff before committing');
  const r = inherit(d, { name: 'review', from: src });
  assert.equal(r.stamped, true);
  assert.equal(r.skill.changed, true);
  assert.equal(r.compiledSkills, 1);
  assert.equal(readManifest(d).skills[0].name, 'review');
  assert.match(readFileSync(join(d, 'AGENTS.md'), 'utf8'), /### review/);
  rmSync(d, { recursive: true, force: true }); rmSync(src, { recursive: true, force: true });
});

test('second inherit adds a new skill: foundation not re-stamped (stamped=false), manifest has both skills', () => {
  const d = tmp();
  const src1 = makeSrc('review', 'Code review', 'x');
  const src2 = makeSrc('audit', 'Design review', 'y');
  inherit(d, { name: 'review', from: src1 });
  const r2 = inherit(d, { name: 'audit', from: src2 });
  assert.equal(r2.stamped, false);                       // foundation stamped only once
  assert.deepEqual(readManifest(d).skills.map((s) => s.name), ['audit', 'review']);
  rmSync(d, { recursive: true, force: true });
});

test('repeated inherit of the same skill: idempotent (skill.changed=false)', () => {
  const d = tmp();
  const src = makeSrc('review', 'Code review', 'x');
  inherit(d, { name: 'review', from: src });
  const r2 = inherit(d, { name: 'review', from: src });
  assert.equal(r2.skill.changed, false);
  assert.equal(readManifest(d).skills.length, 1);
  rmSync(d, { recursive: true, force: true });
});
```

- [ ] **Step 2: Run and confirm it fails**

Run: `node --test test/cli.test.mjs`
Expected: FAIL (module not found)

- [ ] **Step 3: Write the implementation**

```javascript
// lib/cli.mjs
import { stampFoundation } from './foundation.mjs';
import { installSkill } from './skill-install.mjs';
import { compileAgentsMd } from './compiler.mjs';
import { readManifest, writeManifest, upsertSkill } from './manifest.mjs';

export function inherit(targetDir, { name, from }) {
  const stamp = stampFoundation(targetDir);                       // idempotent
  const skill = installSkill(targetDir, from, name);              // idempotent
  const manifest = upsertSkill(readManifest(targetDir), name, skill.fingerprint);
  writeManifest(targetDir, manifest);
  const compiledSkills = compileAgentsMd(targetDir);
  return { stamped: stamp.stamped, skill, compiledSkills };
}

// CLI: node lib/cli.mjs inherit <targetDir> --name <name> --from <skillDir>
function parseArgs(argv) {
  const [cmd, targetDir, ...rest] = argv;
  const opts = {};
  for (let i = 0; i < rest.length; i += 2) opts[rest[i].replace(/^--/, '')] = rest[i + 1];
  return { cmd, targetDir, opts };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { cmd, targetDir, opts } = parseArgs(process.argv.slice(2));
  if (cmd !== 'inherit') {
    console.error('usage: meta-harness inherit <targetDir> --name <name> --from <skillDir>');
    process.exit(1);
  }
  const r = inherit(targetDir, { name: opts.name, from: opts.from });
  console.log(JSON.stringify(r));
}
```

- [ ] **Step 4: Run and confirm it passes**

Run: `node --test test/cli.test.mjs`
Expected: PASS (3 tests pass)

- [ ] **Step 5: Commit**

```bash
git add lib/cli.mjs test/cli.test.mjs
git commit -m "feat: idempotent inherit orchestration + CLI entry"
```

---

## Task 7: Golden skill `/review` (DNA seed)

**Files:**
- Create: `gene/golden-skill/scripts/collect-diff.mjs`
- Create: `gene/golden-skill/skill.yaml`
- Create: `gene/golden-skill/prompt.md`
- Create: `gene/golden-skill/reference/review-standards.md`
- Test: `test/collect-diff.test.mjs`

- [ ] **Step 1: Write the failing test (deterministic diff script)**

```javascript
// test/collect-diff.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { collectDiff } from '../gene/golden-skill/scripts/collect-diff.mjs';

function gitRepo() {
  const d = mkdtempSync(join(tmpdir(), 'mh-git-'));
  const run = (...a) => execFileSync('git', a, { cwd: d });
  run('init');
  run('config', 'user.email', 't@t.io');
  run('config', 'user.name', 't');
  writeFileSync(join(d, 'a.txt'), 'one\n');
  run('add', '.'); run('commit', '-m', 'init');
  return { d, run };
}

test('collectDiff lists changed files and diff text', () => {
  const { d } = gitRepo();
  writeFileSync(join(d, 'a.txt'), 'one\ntwo\n');           // change
  const r = collectDiff(d, 'HEAD');
  assert.deepEqual(r.files, ['a.txt']);
  assert.match(r.diff, /\+two/);
  rmSync(d, { recursive: true, force: true });
});

test('files is empty when there are no changes', () => {
  const { d } = gitRepo();
  const r = collectDiff(d, 'HEAD');
  assert.deepEqual(r.files, []);
  rmSync(d, { recursive: true, force: true });
});
```

- [ ] **Step 2: Run and confirm it fails**

Run: `node --test test/collect-diff.test.mjs`
Expected: FAIL (module not found)

- [ ] **Step 3: Write the deterministic diff script**

```javascript
// gene/golden-skill/scripts/collect-diff.mjs
import { execFileSync } from 'node:child_process';

export function collectDiff(cwd = process.cwd(), base = 'HEAD') {
  const files = execFileSync('git', ['diff', '--name-only', base], { cwd, encoding: 'utf8' })
    .split('\n').filter(Boolean);
  const diff = execFileSync('git', ['diff', base], { cwd, encoding: 'utf8' });
  return { files, diff };
}

// CLI: node collect-diff.mjs [base]  → prints JSON (for the agent to read, 0-token reasoning)
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log(JSON.stringify(collectDiff(process.cwd(), process.argv[2] || 'HEAD')));
}
```

- [ ] **Step 4: Run and confirm it passes**

Run: `node --test test/collect-diff.test.mjs`
Expected: PASS (2 tests pass)

- [ ] **Step 5: Write `skill.yaml` (metadata + self-describing fields)**

```yaml
# gene/golden-skill/skill.yaml
name: review
description: Code-review the current changes (deterministically collect the diff + LLM review)
when-to-use: Before committing or merging, when you need to review code changes for correctness and quality
# Self-describing primitives (gene ⑤; v0.1 only declares them, does not enforce)
uses:
  mcp: []
  permissions: []
  subagents: []
```

- [ ] **Step 6: Write `prompt.md` (LLM semantic layer)**

```markdown
<!-- gene/golden-skill/prompt.md -->
# /review — Code review

You are a strict but pragmatic code reviewer.

## Steps
1. Run the deterministic script to get the changes (0-token reasoning):
   `node skills/review/scripts/collect-diff.mjs HEAD`
   It outputs JSON: `{ files: string[], diff: string }`.
2. If `files` is empty, reply "No changes to review" and stop.
3. Only when needed, load `skills/review/reference/review-standards.md` as the review standard (gene ③: load on demand).
4. For the `diff`, give for each issue: location (file:line), severity (blocker/warning/nit), reason, and a fix suggestion.
5. End with a one-line overall verdict (mergeable / needs changes).

## Constraints
- Review only the changes within the diff; do not broadly rewrite entire files.
- For deterministic facts (which files changed), use the script's results; do not guess.
```

- [ ] **Step 7: Write `reference/review-standards.md` (on-demand knowledge)**

```markdown
<!-- gene/golden-skill/reference/review-standards.md -->
# Review standards (loaded on demand)

- **Correctness**: boundary conditions, null values, error handling, concurrency/races.
- **Security**: injection, privilege escalation, hardcoded secrets, untrusted input.
- **Readability**: naming, function length, duplication (DRY).
- **Tests**: do the changes have corresponding tests; are the assertions meaningful.
- **Severity**: blocker (must fix) / warning (should fix) / nit (optional).
```

- [ ] **Step 8: Commit**

```bash
git add gene/golden-skill test/collect-diff.test.mjs
git commit -m "feat: golden skill /review (deterministic diff + LLM review prompt)"
```

---

## Task 8: `/inherit` meta-command + plugin wiring

**Files:**
- Create: `commands/inherit.md`
- Modify: `plugin.json` (confirm it already includes `commands/inherit.md`; written in Task 0, no change needed; add it if missing)

> Note: this is a Markdown prompt, so there are no unit tests; see Step 2 / Step 3 for verification.

- [ ] **Step 1: Write `commands/inherit.md`**

````markdown
<!-- commands/inherit.md -->
---
name: inherit
description: Stamp the gene foundation into the current project and grow a gene-compliant skill (idempotent)
---

# /inherit — Grow a gene-compliant skill

Your task: in the **current project**, use the Meta-Harness deterministic engine to idempotently stamp the foundation and grow the skill the user wants. Do **not** manually create `.gene/` or edit `AGENTS.md` — the engine does these, guaranteeing idempotency.

## Flow

1. **Understand intent**: talk with the user to figure out what the skill should do. Clarify:
   - What does the skill solve? (one sentence)
   - The skill name (kebab-case, e.g. `review`, `changelog`)?
   - Does it need a deterministic script? Which reference knowledge does it need?
2. **Prepare the skill source directory**: in a temporary location `/$TMP/<name>/`, generate the golden-skill structure:
   - `skill.yaml` (with `name`/`description`/`when-to-use` and the `uses:` self-describing fields)
   - `prompt.md` (LLM semantic layer)
   - If needed: `scripts/*.mjs` (deterministic, 0 tokens), `reference/*.md` (on-demand knowledge)
   Refer to the seed structure: this plugin's `gene/golden-skill/`.
3. **Call the deterministic engine (it handles idempotency)**:
   ```bash
   node <plugin>/lib/cli.mjs inherit . --name <name> --from /$TMP/<name>
   ```
   The engine will: stamp the foundation if absent (`.gene/`, `GENE.md`, `skills/`) → install the skill fingerprint-idempotently → update `.gene/gene.yaml` → recompile `AGENTS.md`.
4. **Report the result**: relay the engine's JSON output (`stamped`/`skill.changed`/`compiledSkills`) to the user; if `skill.changed=false`, explain that the skill already exists and is unchanged (idempotent, not rewritten).

## Principles
- Strictly idempotent: safe to rerun, never breaks the user's existing files.
- Stamp and leave: do not leave a runtime dependency on this plugin in the project.
- The generated skill must carry the full genes: `scripts/` (deterministic) ⟂ `prompt.md` (semantic), plus `skill.yaml`'s when-to-use and self-describing fields.
````

- [ ] **Step 2: Verify the plugin.json reference is correct**

Run: `node -e "const p=require('./plugin.json'); if(!p.commands.includes('commands/inherit.md')) throw new Error('missing command'); console.log('plugin ok')"`
Expected: `plugin ok`

- [ ] **Step 3: Manual review checklist (record in the commit message)**

Confirm: `commands/inherit.md` has frontmatter (name/description); the `lib/cli.mjs` interface referenced in the flow matches Task 6 (`inherit . --name --from`); the referenced seed path `gene/golden-skill/` exists.

- [ ] **Step 4: Commit**

```bash
git add commands/inherit.md plugin.json
git commit -m "feat: /inherit meta-command prompt wired to deterministic engine"
```

---

## Task 9: End-to-end acceptance test (corresponds to spec §9)

**Files:**
- Test: `test/acceptance.test.mjs`

> Covers the automatable acceptance points in §9 (the remaining "recognized by another host" is a manual check; see Step 5).

- [ ] **Step 1: Write the acceptance test**

```javascript
// test/acceptance.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, existsSync, readFileSync, writeFileSync, cpSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { inherit } from '../lib/cli.mjs';
import { readManifest } from '../lib/manifest.mjs';
import { fingerprintDir } from '../lib/skill-install.mjs';

const GOLDEN = resolve('gene/golden-skill');
function tmp() { return mkdtempSync(join(tmpdir(), 'mh-acc-')); }

test('§9.1 inherit on empty dir → foundation + skill + AGENTS.md', () => {
  const d = tmp();
  const r = inherit(d, { name: 'review', from: GOLDEN });
  assert.equal(r.stamped, true);
  assert.equal(existsSync(join(d, '.gene', 'gene.yaml')), true);
  assert.equal(existsSync(join(d, 'skills', 'review', 'prompt.md')), true);
  assert.match(readFileSync(join(d, 'AGENTS.md'), 'utf8'), /### review/);
  rmSync(d, { recursive: true, force: true });
});

test('§9.2 inherit again to add a skill → foundation not re-stamped, existing files keep their fingerprint', () => {
  const d = tmp();
  inherit(d, { name: 'review', from: GOLDEN });
  const before = fingerprintDir(join(d, 'skills', 'review'));
  // Build a second skill source
  const src2 = tmp();
  cpSync(GOLDEN, src2, { recursive: true });
  writeFileSync(join(src2, 'skill.yaml'), 'name: audit\ndescription: Design review\nwhen-to-use: Check for anti-patterns\n', 'utf8');
  const r2 = inherit(d, { name: 'audit', from: src2 });
  assert.equal(r2.stamped, false);                                   // foundation stamped only once
  assert.deepEqual(readManifest(d).skills.map((s) => s.name), ['audit', 'review']);
  assert.equal(fingerprintDir(join(d, 'skills', 'review')), before); // existing skill is unchanged
  rmSync(d, { recursive: true, force: true }); rmSync(src2, { recursive: true, force: true });
});

test('§9.3 /review deterministic script extracts changes from a real diff', () => {
  const d = tmp();
  inherit(d, { name: 'review', from: GOLDEN });
  const run = (...a) => execFileSync('git', a, { cwd: d });
  run('init'); run('config', 'user.email', 't@t.io'); run('config', 'user.name', 't');
  writeFileSync(join(d, 'a.txt'), 'one\n'); run('add', '.'); run('commit', '-m', 'init');
  writeFileSync(join(d, 'a.txt'), 'one\ntwo\n');
  const out = execFileSync('node', [join(d, 'skills', 'review', 'scripts', 'collect-diff.mjs'), 'HEAD'],
    { cwd: d, encoding: 'utf8' });
  const parsed = JSON.parse(out);
  assert.deepEqual(parsed.files, ['a.txt']);
  assert.match(parsed.diff, /\+two/);
  rmSync(d, { recursive: true, force: true });
});
```

- [ ] **Step 2: Run and confirm it fails (if the engine has gaps) / passes**

Run: `node --test test/acceptance.test.mjs`
Expected: PASS (3 tests pass). If it fails, follow the error back to the corresponding Task and fix it.

- [ ] **Step 3: Run the full test suite**

Run: `node --test`
Expected: all PASS (fingerprint/manifest/foundation/skill-install/compiler/cli/collect-diff/acceptance).

- [ ] **Step 4: Commit**

```bash
git add test/acceptance.test.mjs
git commit -m "test: end-to-end acceptance for v0.1 (spec §9)"
```

- [ ] **Step 5: Manual acceptance (remaining §9 items)**

In a real repo, run `node lib/cli.mjs inherit . --name review --from gene/golden-skill`, then:
- Open that repo in Cursor and confirm it can read the generated `AGENTS.md` and invoke `review` accordingly (this is a manual/host-specific check; record the conclusion).
- Confirm that the whole thing "completes in one command, with no methodology/roles required".

---

## Self-Review (plan self-check results)

- **Spec coverage**: §9.1↔Task9.1 / §9.2 (idempotency)↔Task3/4/6/9.2 / §9.3 (/review works)↔Task7/9.3 / §9.4 (recognized by another host)↔Task9.Step5 (manual) / §9.5 (one command, no methodology)↔Task8+Task9.Step5. The 5 genes: ①Task7 (scripts⟂prompt) ②Task5 (AGENTS.md) ③Task7 (reference on demand) ④Task3 (GENE.md) ⑤Task7 (skill.yaml uses field).
- **Placeholders**: no TBD/TODO; every code step includes complete code and commands.
- **Type/signature consistency**: `inherit(targetDir,{name,from})`, `installSkill→{name,fingerprint,changed}`, `gene.yaml={geneVersion,skills:[{name,fingerprint}]}`, `collectDiff(cwd,base)→{files,diff}` are consistent across the whole plan.

# Geneprint

> **Make everything your AI coding agent builds inherit one proven architecture.**
> `gene` + `blueprint` — one source pattern; every piece your agent grows conforms to it.

Geneprint is a lightweight, agent-native plugin (Claude Code / Cursor / Copilot / Gemini …). You describe what you want; your AI agent builds it — and a single idempotent command **imprints a reusable "architecture gene" into the project so that whatever the agent grows is well-architected by birth**, then gets out of the way.

---

## Philosophy

Today's AI coding agents build fast but inconsistently — ad-hoc structure, throwaway prompts, no memory, locked to one IDE. The two common answers each have a cost:

- **Scaffolders** (`create-react-app`, cookiecutter) hand you a *dead* code directory. No governance, no inheritance.
- **Heavyweight methodologies** make you *adopt their whole process* — roles, phases, ceremony — and live inside it.

**Geneprint takes a third path: heredity, not methodology.**

- 🧬 **A gene, not a framework.** It imprints a small, opinionated *architecture gene* into your project. Whatever your agent grows afterward **inherits** that gene's traits — deterministic/LLM split, multi-host output, lazy loading, committable artifacts, self-describing primitives.
- 🪶 **Pure & light.** No persona cast, no multi-stage process, no learning curve. One command.
- ♻️ **Strictly idempotent.** Run it any number of times — same inputs, same result, never clobbers your files.
- 🚪 **Imprint-and-leave.** The gene becomes *the project's own*. Geneprint doesn't stay resident and doesn't make you depend on it.
- 🌐 **Stands on open standards.** Multi-host via the open `AGENTS.md` standard — not reinvented.

> The value isn't a list of features (others have those). It's the **purity, form, and idempotency**: a clean architectural inheritance any agent can grow on, that you own the moment it lands.

---

## How it works

### The one command: `/inherit` (idempotent, self-bootstrapping)

```
/inherit  + an idea
   │
   ├─ Is the gene foundation present in this project?
   │     ├─ no  → stamp it (.gene/, GENE.md, skills/, AGENTS.md)
   │     └─ yes → skip — never re-stamp
   │
   ├─ grow a gene-conforming product (fingerprint-idempotent)
   ├─ update the manifest (.gene/gene.yaml)
   └─ recompile AGENTS.md
```

Same inputs → identical tree. Re-runs never mutate existing files (guaranteed by a content-fingerprint + manifest check).

### Execution chain

```
user goal
  │
  ▼  explicit entry (a command) — or implicit (a skill's when-to-use, auto-fired by the agent)
skill (capability atom)
  ├─ scripts    deterministic layer (0 tokens, same in → same out)
  ├─ mcp        tools / probes (logs, screenshots, AST …)
  ├─ subagents  delegate work
  └─ hooks      deterministic lifecycle control
  │
  ▼
goal met + gene-compliant the whole way = a good product
```

### The 5 genes (every product is born with these)

| # | Gene | Lands as |
|---|------|----------|
| ① | Deterministic + semantic split | `scripts/` (deterministic) ⟂ `prompt.md` (LLM) |
| ② | Multi-host compile + open standard | one source → `AGENTS.md` (+ host-specific later) |
| ③ | Three-tier lazy loading | metadata → body → `reference/` on demand |
| ④ | Committable artifacts | config `GENE.md` ⟂ memory `MEMORY.md` |
| ⑤ | Self-describing primitives | `skill.yaml` declares the `mcp` / permissions / subagents it uses |

### The 8 primitives an agent can grow

`skills` · `commands` · `mcp` · `hooks` · `subagents` · `permissions` · `rules` · `ignore`
(aligned with the field's real taxonomy; deterministic probes, hooks, permissions and sub-agents are all first-class.)

---

## Architecture

**What gets stamped into your project** (the inherited foundation):

```
<your-project>/
├── .gene/
│   └── gene.yaml        # gene version + product manifest (idempotency detector)
├── skills/<name>/       # gene-conforming products (the atoms)
│   ├── skill.yaml       #   metadata + when-to-use + self-describe (uses:)
│   ├── prompt.md        #   LLM semantic layer
│   ├── scripts/         #   deterministic layer (0 tokens)
│   └── reference/       #   load-on-demand knowledge
├── AGENTS.md            # compiled output: open cross-host standard
└── GENE.md              # committable config / architecture decisions
```

**The Geneprint plugin itself** (this repo):

```
geneprint/
├── commands/
│   └── inherit.md                # the /inherit meta-command (prompt)
├── gene/
│   └── golden-skill/             # the golden /review skill — the DNA seed /inherit replicates
│       ├── skill.yaml            #   metadata + when-to-use + self-describe (uses:)
│       ├── prompt.md             #   LLM review prompt
│       ├── scripts/
│       │   └── collect-diff.mjs  #   deterministic git diff (0 tokens)
│       └── reference/
│           └── review-standards.md   # load-on-demand knowledge
├── lib/                          # deterministic Node.js engine
│   ├── fingerprint.mjs           #   content fingerprint (idempotency)
│   ├── manifest.mjs              #   .gene/gene.yaml read/write
│   ├── foundation.mjs            #   idempotent foundation stamping
│   ├── skill-install.mjs         #   fingerprint-idempotent install
│   ├── compiler.mjs              #   skills/ → AGENTS.md
│   └── cli.mjs                   #   inherit orchestration + CLI
├── test/                         # 27 tests (node:test)
│   ├── fingerprint.test.mjs
│   ├── manifest.test.mjs
│   ├── foundation.test.mjs
│   ├── skill-install.test.mjs
│   ├── compiler.test.mjs
│   ├── cli.test.mjs
│   ├── collect-diff.test.mjs
│   └── acceptance.test.mjs       #   end-to-end (spec §9)
├── docs/superpowers/
│   ├── specs/                    # design spec
│   └── plans/                    # implementation plan
├── plugin.json                   # Claude Code plugin manifest
├── package.json                  # Node ESM project (dep: js-yaml)
├── package-lock.json
├── README.md
├── LICENSE                       # MIT
└── .gitignore
```

---

## Quick start (v0.1)

Requirements: **Node ≥ 18** and **git**. Only runtime dependency: `js-yaml`.

```bash
git clone <this-repo> geneprint && cd geneprint
npm install
npm test          # 27/27 should pass

# Imprint the gene into any project and grow a skill from the golden seed:
node lib/cli.mjs inherit /path/to/your/project --name review --from gene/golden-skill
```

That stamps `.gene/`, installs a gene-conforming `skills/review/`, and compiles `AGENTS.md`. Re-run it — nothing breaks. Inside Claude Code, the `/inherit` command drives the same engine conversationally (describe an idea → it grows a conforming skill).

The bundled golden skill **`/review`** demonstrates all five genes: a deterministic `collect-diff.mjs` (0-token `git diff`) feeds an LLM review `prompt.md`, with standards loaded on demand.

---

## Status & roadmap

**v0.1 — done & tested.** Idempotent `/inherit` engine, the golden `/review` skill, `AGENTS.md` compilation, 27 passing tests.

| Phase | Adds |
|-------|------|
| **A** ✅ | golden skill + foundation + idempotency core (v0.1) |
| **B** | full `/inherit` conversation (interview → name → place → compile) |
| **C** | packaged installable plugin + host-specific compilation |
| **D** | the other primitives (mcp probes, subagents, hooks, permissions) + engineering layer (eval, observability, versioning, registry) |

Design docs live in [`docs/superpowers/specs/`](docs/superpowers/specs/) and [`docs/superpowers/plans/`](docs/superpowers/plans/).

---

## License

[MIT](LICENSE)

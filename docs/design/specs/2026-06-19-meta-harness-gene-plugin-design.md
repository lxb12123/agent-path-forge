# Agent Plugin Kit · Gene Plugin Design Spec

> Status: Draft v1 · Date: 2026-06-19 · Pending user review
> Marker convention: 🟢 = v0.1 first (core) · 🔵 = full vision (already in the architecture, delivered in phases)

---

## 0. One-line positioning

> **An agent-native, lightweight plugin: it doesn't teach you how to develop; it just stamps a set of "good-architecture genes" into any project, letting the agent grow gene-inheriting artifacts (skill/command/tool…) in one sentence — pure, light, stamp-and-leave, rerunnable.**

## 1. Product Goal

User states a need → an agent with this plugin installed takes over → the agent can use any combination of the **8 primitive classes** (skill / command / mcp / hooks / subagents / permissions / rules / ignore) → **as long as it both achieves the user's goal and executes "perfect genes" throughout**, the result is a good product.

> **This project = the gene layer that makes the agent produce "gene-compliant, up-to-standard, excellent products".**

## 2. Relationship to BMAD-METHOD (differentiated positioning)

After deep investigation (see Appendix A), BMAD-METHOD (~49k★) and its `bmb` meta-module already implement what we originally envisioned as "5 genes + a mother that grows skills", and ship a skill-evaluation harness of their own. Therefore:

- ❗ **The differentiation is not in "the content of the 5 genes"** (BMAD has the gene content too), but in **purity / form / mechanism**:
  - 🎯 **Strict idempotency**: BMAD's installer is just a "non-destructive update", and major-version upgrades are even semi-destructive. We aim for **constructive-level idempotency**.
  - 🎯 **Stamp-and-leave / host-first**: BMAD is "a heavyweight methodology you go adopt (a cast of roles + a multi-stage process)"; we are a light foundation that is "stamped into the host project, owned by the project, not bound to the mother". The subject is reversed.
  - 🎯 **Low ceremony**: one idempotent command vs BMAD's widely-criticized steep learning curve.
  - 🔵 **Runtime observability**: missing in BMAD (requires an external Langfuse), a potential ace in reserve.
- ✅ **Don't reinvent multi-host**: align directly with open standards (`AGENTS.md` / agentskills.io), don't invent our own.
- ✅ **Opportunity signal**: BMAD's existence proves there's a market for "genes"; and its meta-module `bmb` is itself very young (~167★), so the "pure gene" angle has not yet been nailed down.

## 3. Core concepts and the execution chain

| Concept | Definition |
|---|---|
| **Gene** | A set of architectural traits stamped into the project so that every artifact within carries them automatically (see §4) |
| **Artifact / atom** | The smallest gene-compliant unit, primarily a **skill**, but can also be a command/subagent/hook/mcp |
| **Meta-command** | A command used to "grow/manage genes and artifacts", such as `/inherit` (owned by the mother plugin) |
| **Domain command** | A command grown into the user's project, used to run domain skills to achieve goals (owned by the user's project) |

**Execution chain:**
```
User goal
  │
  ▼  Explicit entry (command) or implicit entry (a skill's when-to-use, auto-triggered by the agent)
skill (capability atom)
  ├─ scripts    Deterministic layer (0 tokens, same in → same out)
  ├─ mcp        Tools/probes (logs, screenshots, AST…)
  ├─ subagents  Delegate work to subagents
  └─ hooks      Lifecycle checkpoints (deterministic control)
  │
  ▼
Goal achieved + genes honored throughout = good product
```
> Note: a command is an **explicit, predictable** entry point, but not the only way to run a skill; a skill can also be implicitly triggered by the agent based on its `when-to-use`.

## 4. The five genes (traits every artifact must carry)

| # | Gene | Meaning | Where it lands | Marker |
|---|---|---|---|---|
| ① | Two-layer structure | Deterministic + semantic separation | Each artifact = `scripts/` (deterministic) + `prompt.md` (LLM) | 🟢 |
| ② | Multi-host compilation + open standard | One source → many hosts | Compile to `AGENTS.md` (aligned with agentskills.io) + per-host specializations | 🟢 `AGENTS.md` / 🔵 specialization |
| ③ | Three-tier on-demand loading | Progressive disclosure saves tokens | Metadata → body → resources | 🟢 |
| ④ | Committable artifacts | Cross-session/team | Config `GENE.md` ⟂ memory `MEMORY.md` (clearly distinguished) | 🟢 config / 🔵 memory |
| ⑤ | Self-describing primitives | Composable, auditable, secure | Artifacts declare the mcp/permissions/subagents they use in `skill.yaml` | 🟢 leave the fields / 🔵 enforce |

> Deprecated: the original "dual-mode / layered-context" gene (the investigation judged it overfitted, with no independent evidence) is demoted to an optional strategy under the `rules` primitive.

## 5. The eight primitive classes (the building blocks an agent can use to achieve goals)

> This taxonomy comes from a real industry standard (the rulesync eight-class matrix). It absorbs the previously "deferred" probes/hooks/permissions/subagents all into first-class primitives.

| Primitive | What it is in this project | Marker |
|---|---|---|
| **skills** | The core atom, the skills that get grown | 🟢 |
| **commands** | Slash commands (meta-commands + domain commands) | 🟢 |
| **mcp** | Tool integration — log/screenshot/AST probes are MCP | 🔵 |
| **hooks** | Lifecycle hooks = where gene ①'s deterministic control layer lands | 🔵 |
| **subagents** | Subagent / multi-agent orchestration | 🔵 |
| **permissions** | Permissions = where the security/trust gate lands | 🔵 |
| **rules** | Standards/constraints (context layering lives here) | 🔵 |
| **ignore** | Which files the agent should not touch | 🔵 |

## 6. Engineering / lifecycle layer

| Vessel | Purpose | Marker |
|---|---|---|
| Eval harness | Whether an artifact runs and meets the bar | 🔵 |
| Observability / tracing | Runtime telemetry (missing in BMAD, a potential ace) | 🔵 |
| Versioning + dependencies | semver + dependency resolution between artifacts | 🔵 |
| Distribution / registry + compliance checks | Genes can be shared and validated for compliance | 🔵 |
| Non-interactive installer | Install into a project in one shot, idempotently | 🟢 idempotency core / 🔵 full |

## 7. Physical structure

### 7.1 A "gene-compliant artifact" (the atom that gets copied)
```
<skill>/
├── skill.yaml     🟢 Metadata + when-to-use + self-description (declares mcp/permissions/subagents)
├── prompt.md      🟢 LLM semantic layer
├── scripts/       🟢 Deterministic layer (0 tokens)
├── reference/     🟢 On-demand knowledge (the third tier of three-tier loading)
├── hooks/         🔵 Lifecycle hooks attached to this artifact
└── evals/         🔵 Eval cases for this artifact
```

### 7.2 The "foundation" stamped into the host project
```
<user project>/
├── .gene/
│   ├── gene.yaml        🟢 Gene version + artifact manifest (idempotency detection relies on it)
│   ├── compile.*        🟢 Multi-host compiler
│   ├── registry.yaml    🔵 Local registry + versions/dependencies
│   └── permissions.yaml 🔵 Permission/trust policy
├── skills/<...>/        🟢 Skills (atoms)
├── commands/<...>/      🟢 Domain commands
├── subagents/<...>/     🔵 Subagents
├── hooks/<...>/         🔵 Hooks (deterministic control layer)
├── mcp/                 🔵 MCP tools (incl. log/screenshot/AST probes)
├── .geneignore          🔵 Ignore rules
├── AGENTS.md            🟢 Compiled output: open standard (one file for all)
├── .claude/ .cursor/…   🔵 Compiled output: per-host specializations
├── GENE.md              🟢 Config / architecture decisions (committable)
└── MEMORY.md            🔵 Learned memory (committable)
```

### 7.3 The mother plugin itself (what we ship)
```
agent-plugin-kit/                 # Plugin root directory
├── commands/
│   ├── inherit.md       🟢 /inherit: idempotent self-bootstrap meta-command
│   └── (other commands)  🔵
├── gene/
│   ├── golden-skill/    🟢 Golden reference skill (DNA seed; v0.1 hand-written = /review)
│   └── templates/       🔵 Templates for each primitive (command/subagent/hook/mcp…)
├── compilers/           🟢 → AGENTS.md / 🔵 → .claude/.cursor…
├── eval-runner/         🔵 Eval harness
├── observability/       🔵 Runtime tracing/telemetry
├── installer/           🟢 Idempotency engine / 🔵 full installer
├── registry/            🔵 Distribution/registry + compliance checks
└── plugin.json          🟢 Plugin manifest (semver + 🔵 dependencies)
```

## 8. Two mechanism aces

- 🎯 **Strict idempotency**: `/inherit` first checks `.gene/gene.yaml`.
  - Absent → stamp the foundation (write the `.gene/`, `compile.*`, `GENE.md`, `AGENTS.md` skeleton) + grow the requested artifact.
  - Present → skip the foundation, just add the new artifact to `skills/` + update the `gene.yaml` manifest.
  - **Same input → same result**; rerunning any number of times never breaks existing content (guaranteed by manifest comparison + content fingerprints).
- 🎯 **Stamp-and-leave**: the foundation is owned by the project; it does not depend on a resident mother, nor require the user to live inside some process.

## 9. v0.1 scope and acceptance (Definition of Done)

**What we do (🟢):**
1. Mother-plugin skeleton: `/inherit` meta-command + `golden-skill` (= `/review`) + `compilers` (produce only `AGENTS.md`) + `installer` idempotency core + `plugin.json`.
2. Golden skill `/review`: hand-written, perfect, carrying all 5 🟢 genes.
   - `scripts/`: deterministically collect `git diff` + list changed files (0 tokens).
   - `prompt.md`: LLM code-reviews the diff.
   - `reference/`: review standards, loaded on demand.
   - `skill.yaml`: includes when-to-use + self-describing fields (v0.1 only leaves the fields).
3. Idempotent `/inherit`: in an empty/existing project, can detect → stamp the foundation (if needed) → grow a new gene-compliant skill → update the manifest.

**Acceptance criteria (what counts as v0.1 success):**
- [ ] Run `/inherit` in a brand-new empty directory + describe a skill idea → generate the `.gene/` foundation + one compliant `skills/<name>/` skill + `AGENTS.md`.
- [ ] Run `/inherit` again to add a second skill → **the foundation is not re-stamped**, only the new skill is added and `gene.yaml` is updated; existing files are unchanged (fingerprints match).
- [ ] The hand-written `/review` skill actually runs: for a diff containing a bug, the deterministic script extracts the diff and the LLM gives a review verdict.
- [ ] The generated skill in `AGENTS.md` can be recognized and used by another host (at least Cursor).
- [ ] The whole process needs no "methodology/roles" and completes in one command.

**What we don't do (excluded this round, see 🔵):** MCP probes, subagents, hooks, permissions, ignore, eval harness, observability, version dependencies, registry, per-host specialized compilation.

## 10. Decisions and assumptions (⚠️ please confirm during review)

1. **Meta-command name** = `/inherit` (alternative `/skill`).
2. **v0.1 golden skill** = `/review` (code review; rationale: it naturally uses both a deterministic script + LLM semantics, proving all 5 genes in one shot).
3. **Official product/plugin name** = `Agent Plugin Kit` (gene + blueprint, already named).
4. **Gene ④**: v0.1 only does the config `GENE.md`; memory `MEMORY.md` is deferred.
5. **Multi-host**: v0.1 produces only a single `AGENTS.md`; per-host specialization is deferred.
6. **Golden skill and tech stack**: genes are tech-stack-independent; `/review` operates on any git repo, not bound to React/Vite (the original React/Vite anchor is withdrawn).
7. **Runtime**: the body of commands/skills is Markdown prompts (Claude Code itself is the engine; we don't build a heavyweight engine of our own); the deterministic scripts and the compiler/installer default to **Node.js** (consistent with the Claude plugin ecosystem and ruler/rulesync), with no extra language dependency.

## 11. Risks and open questions (from the investigation)

- **AGENTS.md effectiveness is questionable**: academic research shows these instruction files are often unhelpful or even harmful (-3% success rate / +20% cost); and Claude Code does not natively read `AGENTS.md`. → v0.1 must measure the effect for real, and switch to host-specialization-first if necessary.
- **Idempotency is a genuine innovation**: there is no off-the-shelf implementation to copy; it must be designed from first principles + self-tested (fingerprints/manifest).
- **Eval / observability is no-man's-land**: as a 🔵 differentiation reserve, it may be the later headline feature.
- **Competition**: BMAD is large; we must always hold the "pure/light/idempotent" positioning and not slide into a methodology.

## 12. Development roadmap

| Phase | Content |
|---|---|
| **A** 🟢 | Golden skill `/review` + foundation + idempotency core (v0.1) |
| **B** | `/inherit` full conversational flow (interview → name → place → compile) |
| **C** | Package as an installable mother plugin + AGENTS.md/per-host specialized compilation |
| **D** | Complete the eight primitives + the engineering layer (eval/observability/versioning/registry/installer) |

---

## Appendix A · Investigation summary (2026-06-19, 109 agents / 26 sources / 25 adversarial verifications)

- **The domain is real and large**: spec-kit (~111k★, 30+ host compilations), bmad-method (~49k★), awesome-cursorrules (~40k★), the AGENTS.md standard (120k+ files, hosted by the Linux Foundation), config-compiler (ruler/rulesync), the Claude plugin marketplace.
- **Per-gene verdict**: ② multi-host = strongest (corroborated by 5 projects, we had scoped it too small); ③ on-demand loading = strong; ① deterministic/LLM = correct but should be framed as a "control layer"; ④ committable = correct but must distinguish config/memory; ⑤ dual-mode = **overfitted, cut**.
- **First-class primitives we missed**: mcp, permissions, hooks, subagents, versioning/dependencies, security/sandbox, distribution/registry+compliance, installer (now added in this spec's §5/§6).
- **Vacuum areas (opportunities)**: strict idempotency, skill evaluation, runtime observability — none of the three is done well in the domain.
- **Sources**: github/spec-kit, bmad-code-org/bmad-method, intellectronica/ruler, dyoshikawa/rulesync, jeremylongshore/claude-code-plugins-plus-skills, agents.md, code.claude.com/docs.

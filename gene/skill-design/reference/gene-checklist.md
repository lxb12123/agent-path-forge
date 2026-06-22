# Gene-compliance cheat sheet (load on demand)

When designing a skill, check it against these five genes — each one should point to a concrete location in the skill.

| # | Gene | Where it lives | Self-check question |
|---|------|--------|----------|
| ① | deterministic ⟂ semantic | `scripts/` (deterministic) ⟂ `prompt.md` (judgment) | Is the LLM doing work that a script should do? |
| ② | cross-host + open standards | one source → `AGENTS.md` + Claude `SKILL.md` + Cursor `.mdc` | Is anything hardcoded to a single IDE? |
| ③ | three-tier lazy loading | metadata → `prompt.md` → `reference/` | Is large knowledge stuffed into the body? |
| ④ | committable artifacts | `GENE.md` (config) ⟂ `MEMORY.md` (memory) | Do config/memory live in the repo and stay committable? |
| ⑤ | self-describing primitives | `skill.yaml`'s `uses:` → real permissions | Are all the capabilities used declared? |

## Skill types

- **Deterministic-fetch + LLM type**: has `scripts/` (get a diff, read state, run a command) + `prompt.md` (judging/writing). E.g. review, commit, pr-description.
- **Process / methodology type**: no `scripts/`; the value is in the checklist + flow + red flags. E.g. this skill-design.

Both types are compliant; the key is ① — keep "what can be made deterministic" and "what requires judgment" clearly separated, not mixed.

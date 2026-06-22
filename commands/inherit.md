---
name: inherit
description: Imprint the gene foundation into this project and grow a gene-compliant skill (idempotent)
argument-hint: <describe the skill you want>
allowed-tools: Bash(node *)
---

# /inherit — Grow a gene-compliant skill

Your task: inside the **current project**, use Agent Path Forge's deterministic engine to idempotently imprint the foundation and grow the skill the user wants. The engine lives at `${CLAUDE_PLUGIN_ROOT}/lib/cli.mjs`. **Do not** manually create `.gene/` or edit `AGENTS.md` — the engine handles these, guaranteeing idempotency.

## Flow

1. **Understand the intent**: talk with the user to figure out what this skill should do. Clarify:
   - What problem does the skill solve? (one sentence)
   - The skill name (kebab-case, e.g. `review`, `changelog`)?
   - Does it need deterministic scripts? What reference knowledge does it need?

2. **Generate a compliant skeleton** (build it with the engine so the structure is always compliant):
   ```bash
   TMP=$(mktemp -d)
   node "${CLAUDE_PLUGIN_ROOT}/lib/cli.mjs" scaffold "$TMP" --name <name>
   ```
   Generates `skill.yaml` (with when-to-use + the `uses:` self-description block), `prompt.md`, `scripts/`, and `reference/`.

3. **Fill in the content**: edit the files under `$TMP`:
   - `skill.yaml`: fill in `description` and `when-to-use`; if it uses mcp/permissions/subagents, declare them under `uses:`.
   - `prompt.md`: spell out what the LLM should do and produce.
   - Put deterministic steps in `scripts/*.mjs` (0 token), and on-demand knowledge in `reference/*.md`.

4. **Imprint into the project (the engine handles idempotency)**:
   ```bash
   node "${CLAUDE_PLUGIN_ROOT}/lib/cli.mjs" inherit . --name <name> --from "$TMP"
   ```
   The engine: imprints the foundation if absent (`.gene/`, `GENE.md`, `skills/`) → installs the skill idempotently by fingerprint → updates `.gene/gene.json` → recompiles `AGENTS.md`.

5. **Report the result**: relay the JSON the engine outputs (`stamped` / `skill.changed` / `compiledSkills`); `skill.changed=false` means the skill already exists and is unchanged (idempotent, no rewrite).

6. **Point to the next step**: `inherit` only grows the skill into the project — it does NOT package an installable plugin. Tell the user: if they want to ship this as an installable, multi-host plugin (with `.claude-plugin/` manifest, plugin-root `SKILL.md`, `commands/`, and a generated `README.md`), run `pack`:
   ```bash
   node "${CLAUDE_PLUGIN_ROOT}/lib/cli.mjs" pack .
   ```
   Or do both in one step by re-running with `--target plugin`. Skip this if they only want to use the skill locally.

## Principles
- Strictly idempotent: safe to re-run, never breaks the user's existing files.
- Imprint and leave: do not leave any runtime dependency on this plugin in the project.
- The generated skill must carry the full gene: `scripts/` (deterministic) ⟂ `prompt.md` (semantic), plus `skill.yaml`'s when-to-use and self-description fields.

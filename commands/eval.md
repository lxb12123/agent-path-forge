---
name: eval
description: Grade a gene skill against its own evals/ cases
argument-hint: skills/<name>
allowed-tools: Bash(node *)
---

# /eval — Evaluate a skill

Run a skill's bundled `evals/` cases (e.g. for `skills/review`) to see whether it meets the bar.

## Flow
1. Determine the skill directory to evaluate, `skills/<name>` (ask the user, or take one already present in the current project).
2. List the cases:
   ```bash
   node "${CLAUDE_PLUGIN_ROOT}/lib/cli.mjs" eval skills/<name>
   ```
   Outputs `[{name, input, expect}, ...]`.
3. **For each case**: set up the scenario as described by `input` (create a temporary fixture / git repo if needed), run the skill, and capture its output text.
4. Collect all outputs into a single JSON `{ "<caseName>": "<output>" }` and write it to a temp file, e.g. `runs.json`.
   - For cases with `expect.rubric`: you (as the LLM judge) decide whether the output satisfies the rubric description, written as an object `{ "<caseName>": { "output": "...", "rubric": true/false } }`. The engine counts the deterministic assertions together with your rubric verdict toward pass/fail.
5. Score:
   ```bash
   node "${CLAUDE_PLUGIN_ROOT}/lib/cli.mjs" eval skills/<name> --runs runs.json
   ```
   Outputs `{total, passed, failed, cases:[{name, pass, failures}]}`.
6. Relay the report to the user; for each case with a non-empty `failures`, point out which expectation (contains / notContains / matches) was not met.

## Notes
- The deterministic assertions in `expect` (contains / notContains / matches regex) are scored by the engine, and pass/fail is decided by it.
- When subjective quality (rubric) judgment is needed, you may add commentary, but it does not change the deterministic conclusion.
- Evaluation is **read-only** on the user's project; it does not write.

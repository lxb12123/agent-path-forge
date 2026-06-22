# /skill-design

Design a vague idea into a **gene-compliant** skill — think through the boundaries before writing any code.
This is a **process-type** skill: no deterministic scripts; the output is an actionable design handed to `/inherit` to grow.

Announce: "I'm using the skill-design process to design this skill."

## Checklist (do each item, don't skip)

1. **One-sentence purpose** — what does this skill let the agent accomplish? If you can't state it, ask first; don't start.
2. **Draw the line: deterministic ⟂ semantic** (gene ①)
   - Anything **repeatable and assertable** (get a diff, read config, run a command, parse output) → goes in `scripts/`, 0 token.
   - Anything needing **judgment, trade-offs, writing** → goes in `prompt.md`.
   - If the whole thing has no deterministic part at all (pure methodology), then it's a **process-type skill** (like this one), and having no `scripts/` is fine.
3. **Declare the capabilities used** (gene ⑤) — list `permissions`/`mcp`/`subagents` under `uses` in `skill.yaml`; they get compiled into the real host config. To run scripts, declare `permissions: ["Bash(node *)"]`.
4. **Three-tier lazy loading** (gene ③) — keep the metadata (when-to-use) short; put the body in `prompt.md`; put large domain knowledge in `reference/`, loaded on demand, not stuffed into the body.
5. **Write the acceptance first** (evals) — at least one happy-path case with a `rubric`. Ask first: "what does a correct output look like?" If you can't answer, you haven't designed it clearly yet.
6. **Red-flag self-check** (see below).
7. **Hand off to `/inherit`** — pass the design off to grow into a skill; it's idempotent and won't overwrite your files.

## Flow

```
idea
 │
 ├─ Can the one-sentence purpose be stated?   no → clarify first, don't start
 ├─ Carve out the deterministic part → scripts/   (repeatable/assertable work, 0 token)
 ├─ Leave the judgment part         → prompt.md   (LLM semantic layer)
 ├─ Declare uses{permissions,mcp,subagents}
 ├─ Write evals (at least 1 happy-path with a rubric)
 └─ /inherit grows it → cross-host compilation
```

## Red flags (stop and rethink when they appear)

| Signal | Problem | How to fix |
|---|---|---|
| the prompt tells the LLM to "count/parse/run" something | deterministic work mixed into the semantic layer | move it into `scripts/`; the prompt only reads its output |
| one skill tries to do three unrelated things | the boundary is blurred | split into multiple skills |
| can't state "what a correct output looks like" | no acceptance criteria | write the eval before designing |
| when-to-use written as a paragraph | metadata too heavy, violates lazy loading | compress it to a one-line trigger condition |
| all domain knowledge stuffed into the prompt | bloated body, fully loaded every time | move it to `reference/`, reference on demand |
| uses Bash/MCP but doesn't declare it in `uses` | self-description missing, can't compile real permissions | add `uses` in `skill.yaml` |

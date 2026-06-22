<!-- gene/pr-description/prompt.md -->
# /pr-description — Generate a PR description

You write a clear Pull Request description based on the commits of "this branch relative to the baseline".

## Steps
1. Run the deterministic script to get the commits and change size (0-token reasoning); the baseline defaults to `main`:
   `node skills/pr-description/scripts/collect-commits.mjs main`
   It outputs JSON: `{ base, commits: string[], diffstat: string }`.
2. If `commits` is empty, say "no new commits relative to <base>" and stop (or let the user switch the baseline).
3. Only when you need the template structure, load `skills/pr-description/reference/pr-template.md` (gene ③: load on demand).
4. Based on the commits and diffstat, output:
   - Title: a one-sentence summary of this PR;
   - `## Summary`: 2-4 bullet points making clear what changed and why;
   - `## Test Plan`: checkable verification steps.
5. Put the whole description in a code block so it can be pasted straight into the PR.

## Constraints
- Summarize only the commits/changes the script provides; do not invent changes that did not happen.
- The summary covers motivation and impact; do not restate every commit one by one.

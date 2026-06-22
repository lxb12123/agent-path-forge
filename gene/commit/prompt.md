<!-- gene/commit/prompt.md -->
# /commit — Generate a commit message

You help the user turn the "staged" changes into a well-formed Conventional Commits message.

## Steps
1. Run the deterministic script to get the staging area (0-token reasoning):
   `node skills/commit/scripts/collect-staged.mjs`
   It outputs JSON: `{ files: string[], diff: string, status: string }`.
2. If `files` is empty, say "the staging area is empty; please git add the changes you want to commit first" and stop.
3. Only when you need to pin down type/scope, load `skills/commit/reference/commit-convention.md` (gene ③: load on demand).
4. Based on the `diff`, write one commit message:
   - Subject: `<type>(<scope>): <short imperative>`, ≤ 72 characters;
   - If needed, leave a blank line then write the body, explaining "why" rather than restating the diff line by line;
   - Look only at `--cached`; do not put unstaged changes into the message.
5. Output the final commit message (in a code block), plus a one-line, directly runnable `git commit -m ...`.

## Constraints
- Base it only on the staged diff; for which files changed, use the script results — do not guess.
- Describe only one logical change at a time; if the diff mixes several unrelated changes, advise the user to commit them separately.

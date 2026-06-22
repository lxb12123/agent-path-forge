# Conventional Commits cheat sheet

Format: `<type>(<scope>): <description>`

Common types:
- `feat` new feature
- `fix` bug fix
- `docs` docs only
- `refactor` refactor with no external behavior change
- `test` tests only
- `chore` build / tooling / misc
- `perf` performance
- `style` formatting only (no semantic change)

Conventions:
- Use the imperative, present tense for the subject: "add" not "added".
- Subject ≤ 72 characters, no trailing period.
- Breaking changes: add `BREAKING CHANGE: ...` to the body, or a `!` after the type.
- The body explains motivation and context (why), not a line-by-line restatement of the diff.

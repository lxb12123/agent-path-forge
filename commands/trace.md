---
name: trace
description: Runtime observability summary for this project (gene skills & tool calls)
allowed-tools: Bash(node *)
---

# /trace — Runtime observability summary

Once gene is installed in this project, the `PostToolUse` hook passively records every tool call to `.gene/trace.jsonl` (runtime data, ignored by `.gene/.gitignore` and not committed).

Run:
```bash
node "${CLAUDE_PLUGIN_ROOT}/lib/cli.mjs" trace .
```
Outputs `{total, byTool, bySkill, failures}`.

Tell the user the summary: total call count, distribution by tool (byTool), distribution by gene skill (bySkill), and failure count (failures). When failures are high, suggest looking at the specific `ok:false` entries in `.gene/trace.jsonl`.

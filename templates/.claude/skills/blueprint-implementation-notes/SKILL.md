---
name: blueprint-implementation-notes
description: Create or update a story implementation-notes.md file. Use after implementation to summarize files changed, tests run, validation results, issues, follow-ups, and remaining risks.
---

# Blueprint Implementation Notes

## Overview

Create or update `implementation-notes.md` after execution.

This file is the handoff from Codex back to Claude, validators, or future work. It should say what actually happened, not what was planned.

Do not move implementation logs into `docs/project-context.md`; only summarize durable project-state changes there when needed.

## Conventions

- `{project-root}` means the current repository root.
- Update after implementation, validation, or review fixes.
- Include failed or skipped commands.
- Keep notes factual and concise.

## Update Workflow

1. Summarize implemented behavior.
2. List changed files.
3. Record validation commands and results.
4. Record validator outcomes.
5. Document issues encountered.
6. Capture follow-ups and remaining risks.

## Template

```md
# Implementation Notes - Story NN.NN

## Summary

[What was implemented.]

## Files Changed

- `path/to/file`

## Tests Run

- [ ] Command:
  - Result:

## Validation Results

### Architecture

Pass/fail:
Notes:

### Tests

Pass/fail:
Notes:

### Security

Pass/fail:
Notes:

## Issues Encountered

- Issue:

## Follow-ups

- [ ]

## Remaining Risks

- Risk:
```

## Rules

- Update after implementation, not before.
- Include failed or skipped validation honestly.
- Keep notes concise and useful for future agents.
- Do not hide unrelated failures.
- Do not mark validation pass unless the command actually passed.
- Include enough file detail for a reviewer to navigate quickly.

---
name: implement-slice
description: Implement one vertical story end-to-end with code, targeted tests, validation, and implementation notes. Use when Codex is asked to execute a prepared story folder or deliver a scoped product slice without unrelated changes.
---

# Implement Slice

## Overview

You are the Codex execution mode for one story. You read the story, implement it, validate it, and leave notes for the next agent.

The success condition is not "code changed"; it is "acceptance criteria are satisfied with validation evidence."

## Conventions

- `{project-root}` means the current repository root.
- Implement from the active story folder.
- Keep changes scoped and reversible.
- Prefer existing code style and architecture.
- Use `decisions.md` for meaningful tradeoffs.

## Before Coding

1. Read `PROJECT_RULES.md`.
2. Read `AGENT_RULES.md`.
3. Read `docs/project-context.md`, `docs/architecture.md`, and `docs/conventions.md`.
4. Read the epic `index.md`.
5. Read all files in the active story folder.
6. Confirm the story has an Execution Packet, Validation Gates, Stop Conditions, and Rollback Notes.

## Implementation Strategy

1. Map acceptance criteria to code areas.
2. Inspect current patterns before editing.
3. If business logic is involved, consider `$tdd`.
4. If UI is involved, preserve existing interaction and visual conventions.
5. If auth, admin, permissions, external input, or persistence is involved, plan `$security-check`.
6. Make the smallest coherent change.
7. Validate and repair.

## Execution Rules

- Implement only the story scope.
- Preserve existing architecture unless the story explicitly changes it.
- Prefer existing patterns and helper APIs.
- Add or update tests according to `tests.md`.
- Record meaningful architecture choices in `decisions.md`.
- Update `implementation-notes.md` after execution.

## Validation

- Run typecheck, lint, tests, and E2E where available and relevant.
- If a command cannot run, document why.
- Fix root causes rather than weakening tests.
- If validation reveals ambiguous requirements, stop and ask one targeted question.
- If unrelated failures exist, separate them from story failures.
- If a defined stop condition is triggered, stop and report instead of continuing.

## Final Output

```md
# Slice Implementation Result

## Summary

- 

## Acceptance Criteria Status

- [ ] 

## Files Changed

- 

## Tests And Validation

- Command:
  - Result:

## Notes Updated

- `implementation-notes.md`: yes/no
- `decisions.md`: yes/no

## Remaining Risks

- 

## Stop Conditions Triggered

- 
```

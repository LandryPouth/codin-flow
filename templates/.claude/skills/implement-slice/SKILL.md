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

Read based on intensity mode. If mode is not specified, use STANDARD.

**FAST**: story folder files only (story.md and Context Scope at minimum).

**STANDARD**: the orchestrator has already read all docs and produced a Context Map — start from the Context Map and read only the targeted files it lists. Read epic `index.md` + story folder files if no Context Map is present.

**STRICT**: `PROJECT_RULES.md`, `AGENT_RULES.md`, `docs/project-context.md`, `docs/architecture.md`, `docs/conventions.md`, epic `index.md`, all story folder files.

Then confirm:
- **FAST**: story has a Context Scope or clear known edit points.
- **STANDARD/STRICT**: story has Context Scope or Context Map, Execution Packet, Validation Gates, Stop Conditions, and Rollback Notes.

## Implementation Strategy

1. Map acceptance criteria to code areas using `Context Scope` or `Context Map`.
2. Run the listed search anchors before opening broad directories.
3. Read known relevant files first and stop when the edit point is clear.
4. Inspect current patterns before editing.
5. If business logic is involved, consider `$tdd`.
6. If UI is involved, preserve existing interaction and visual conventions.
7. If auth, admin, permissions, external input, or persistence is involved, plan `$security-check`.
8. Make the smallest coherent change.
9. Validate and repair.

## Execution Rules

- Implement only the story scope.
- Preserve existing architecture unless the story explicitly changes it.
- Prefer existing patterns and helper APIs.
- Do not broadly scan the repository when targeted search anchors or known relevant files are available.
- If the initial context budget is exceeded before the edit point is clear, stop, summarize findings, and justify any extra files to inspect.
- Use `$agent-context-scout` for broad, ambiguous, cross-module, or high-risk stories instead of loading large amounts of code into context.
- Add or update tests according to `tests.md`.
- **FAST**: update `implementation-notes.md` only for non-trivial changes; skip `decisions.md` unless a real tradeoff occurred.
- **STANDARD/STRICT**: update `implementation-notes.md` always; update `decisions.md` for any meaningful architecture choice.

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

## Context Used

- Context Scope/Map followed: yes/no
- Extra files inspected beyond budget:
- Reason:

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

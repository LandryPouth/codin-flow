---
name: run-story
description: Composite workflow to execute one story end-to-end with an intensity mode. Use FAST for small UI/copy/simple bugs, STANDARD for normal CRUD/features/integration, and STRICT for risky work requiring deeper checks. For known security-sensitive work, use run-story-secure or STRICT mode.
---

# Run Story

## Overview

Run one prepared story through the appropriate execution pipeline.

This is the daily-driver workflow. It prevents manual chaining of the atomic skills while preserving their roles and avoiding unnecessary process for small work.

Use `run-story-secure` instead when the story touches auth, permissions, admin surfaces, user input, persistence, external integrations, secrets, payments, uploads, or sensitive data.

## Conventions

- `{project-root}` means the current repository root.
- The active story should live under `epics/epic-NN-name/story-NN-NN-name/`.
- Atomic skills remain authoritative for their own phase.
- If a phase finds blocking issues, fix them before continuing.

## Choose Intensity

If the user provides a mode, use it. Otherwise infer the lightest safe mode.

### FAST

Use for:

- small UI changes
- text/copy updates
- simple bugs
- isolated components
- low-risk local changes

Pipeline:

1. Use `$implement-slice`.
2. Use lightweight `$tests-check`.
3. Use `$blueprint-implementation-notes`.

FAST mode may use a lightweight inline Execution Packet, but it still needs explicit Stop Conditions and Rollback Notes before editing.

### STANDARD

Use for:

- CRUD
- normal product features
- frontend/backend integration
- ordinary vertical stories

Pipeline:

1. Use `$agent-orchestrator` to create the Execution Packet, Validation Gates, Stop Conditions, and Rollback Notes.
2. Use `$implement-slice` to implement the story end-to-end.
3. Use `$tests-check` to validate test adequacy.
4. Use `$architecture-check` to validate architecture quickly.
5. Use `$review-codebase` for the final pre-merge review.
6. If blocking issues exist, use `$implement-slice` to fix them and repeat the failed checks.
7. Use `$blueprint-implementation-notes` to update `implementation-notes.md`.

### STRICT

Use for:

- auth
- admin
- permissions
- payments
- database migrations
- risky refactors
- security-sensitive work
- enterprise workflows
- high-regression-risk changes

Pipeline:

1. Use `$agent-planner` or `$grill-me` if requirements are unclear.
2. Use `$agent-orchestrator` to create the Execution Packet, Validation Gates, Stop Conditions, and Rollback Notes.
3. Use `$tdd` for critical logic.
4. Use `$implement-slice`.
5. Use `$tests-check`.
6. Use `$e2e-check`.
7. Use `$architecture-check`.
8. Use `$security-check`.
9. Use `$review-codebase`.
10. If blocking issues exist, use `$implement-slice` to fix them and repeat failed checks.
11. Use `$blueprint-implementation-notes`.

## Escalation Rules

- Escalate from `$architecture-check` to `$agent-validator-architecture` when the story introduces new patterns, crosses modules, or includes a refactor.
- Escalate from `$tests-check` to `$agent-validator-tests` when tests are complex, flaky, missing for risky logic, or release-sensitive.
- Switch to `$run-story-secure` when security-sensitive behavior appears during implementation.

## Stop Conditions

- The story scope is ambiguous enough to cause rework.
- Required project commands cannot be identified.
- Validation fails and the root cause is outside story scope.
- Security-sensitive behavior is discovered and needs the secure pipeline.
- Database schema requires breaking changes.
- Auth, role, or permission model is unclear.
- Existing architecture conflicts with the requested implementation.
- Story acceptance criteria are incomplete or not testable.

## Rollback Notes

Before implementation, capture:

- Files or areas likely to change.
- Any migration/data rollback concerns.
- Any config or feature-flag rollback path.
- Manual cleanup steps if validation fails.

## Output

```md
# Run Story Result

## Story

- 

## Intensity

FAST / STANDARD / STRICT

## Pipeline Status

- Orchestration:
- Implementation:
- Tests check:
- Architecture check:
- Review:
- Notes:

## Files Changed

- 

## Validation

- 

## Fixes Applied

- 

## Rollback Notes

- 

## Remaining Risks

- 
```

---
name: agent-orchestrator
description: Activate the orchestrator agent for one vertical story. Use when work needs sequencing, context loading, worker selection, validation routing, or final aggregation before Codex execution.
---

# Agent Orchestrator

## On Activation

1. Identify the active epic and story from the user request or current context.
2. Load the required inputs below.
3. Summarize the story in one paragraph.
4. Extract or create a compact Context Map from the story `Context Scope`.
5. Classify risk: `low`, `medium`, or `high`.
6. Select worker and validators.
7. Produce the Execution Packet, Context Map, Validation Gates, Stop Conditions, and Rollback Notes.
8. Stop and wait unless the user explicitly asked you to proceed with implementation.

## Required Inputs

- `PROJECT_RULES.md`
- `AGENT_RULES.md`
- `docs/project-context.md`
- `docs/architecture.md`
- `docs/conventions.md`
- Active epic `index.md`
- Active story folder

## Context Map Rules

Build the Context Map from the story `Context Scope`. If absent, derive a minimal one from story, tasks, tests, and epic index.

Use `$agent-context-scout` only when the story marks `Scout needed: yes` or implementation would otherwise require broad exploration. The scout must not modify files.

Keep the Context Map short: relevant files and why they matter, search anchors, likely edit points, risks, areas to avoid, initial context budget.

If the edit point is still unclear after the budgeted discovery, stop and report before reading more.

## Risk Routing

- Always route through `agent-validator-architecture` and `agent-validator-tests`.
- Add `agent-validator-security` when the story touches auth, admin, permissions, user input, secrets, uploads, payments, external APIs, data visibility, or persistence.
- Use `agent-worker-tests` separately when tests are missing, brittle, or strategically important.
- Use `grill-me` before planning when requirements are ambiguous enough to cause rework.

## Mandatory Stop Conditions

Include story-specific stop conditions in every Execution Packet.

At minimum, stop if:

- Database schema requires breaking changes.
- Auth, role, or permission model is unclear.
- Tests or required validation commands cannot run.
- Existing architecture conflicts with the requested implementation.
- Story acceptance criteria are incomplete or not testable.
- External API behavior, credentials, or contracts are required but unknown.
- Implementation would require unrelated refactors.
- Security-sensitive behavior lacks server-side enforcement rules.

If a stop condition is triggered, do not proceed with implementation. Report the blocker, why continuing is risky, and what input or artifact is needed.

## Rollback Notes

Describe how to revert or contain the change if validation fails: files likely to change, data/schema rollback if relevant, config/feature-flag rollback if relevant, manual cleanup steps.

## Rules

- Do not implement large code changes directly unless necessary.
- Do not split into micro-tasks unless required for clarity.
- Stop planning once the story is implementation-ready.
- Do not allow implementation to begin with vague acceptance criteria.
- Do not expand scope to adjacent features.

## Output

```md
# Execution Packet

## Story

- Epic:
- Story:
- Goal:
- Risk:

## Scope

Included:
- 

Excluded:
- 

## Worker

- Primary:
- Supporting:

## Execution Sequence

1. 
2. 
3. 

## Context Map

Relevant files:
- 

Search anchors:
-

Likely edit points:
-

Risks:
-

Avoid unless needed:
-

Initial context budget:
- Max files before edit plan:
- Stop after:

## Validation Gates

- Architecture:
- Tests:
- Security:

## Stop Conditions

- 

## Rollback Notes

- Files/areas to revert:
- Data/schema rollback:
- Config/feature flag rollback:
- Manual cleanup:

## Final Summary Requirements

- Files changed
- Tests run
- Validation result
- Decisions recorded
- Risks/follow-ups
```

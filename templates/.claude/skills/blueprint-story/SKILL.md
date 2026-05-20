---
name: blueprint-story
description: Create or update a vertical story.md file. Use when generating epics/<epic>/story-NN-NN-name/story.md with goal, value, context, requirements, acceptance criteria, edge cases, UX notes, technical notes, dependencies, and out of scope.
---

# Blueprint Story

## Overview

Create a `story.md` that lets Codex implement a complete vertical slice with minimal ambiguity.

The story should describe product behavior, not an internal engineering checklist.

## Conventions

- `{project-root}` means the current repository root.
- Story title format: `Story NN.NN - Name`.
- Use Given/When/Then acceptance criteria where possible.
- Include assumptions when requirements are inferred.

## Generation Workflow

1. Read the parent epic index and project context.
2. State the story goal in one sentence.
3. Identify who benefits and how.
4. Convert requirements into observable behavior.
5. Add edge cases that affect correctness, security, UX, or data.
6. Add technical notes that guide architecture without overdesigning.
7. Add a context-efficient `Context Scope` that targets discovery before implementation.
8. Mark out-of-scope boundaries explicitly.

## Template

```md
# Story NN.NN - Name

## Goal

[What this story delivers.]

## User Value

[Who benefits and how.]

## Context

[Relevant context from project-context, epic, existing code.]

## Context Scope

Known relevant files or directories:
- `[path]` - [why this is likely relevant]

Search first:
- `[symbol|string/route/command]` - [why this should find the edit point]

Avoid unless needed:
- `[path/glob]` - [why this is probably outside the story]

Scout needed:
- `yes/no` - [yes only for broad, ambiguous, cross-module, or high-risk stories]

Initial context budget:
- Max files to read before planning edits: [number]
- Stop and summarize if the likely edit point is still unclear after: [number] searches or file reads

## Requirements

- [ ] Requirement 1
- [ ] Requirement 2

## Acceptance Criteria

- [ ] Given..., when..., then...
- [ ] Given..., when..., then...

## Edge Cases

- [ ] Edge case 1
- [ ] Edge case 2

## UX Notes

[UI and interaction notes.]

## Technical Notes

[Architecture, data flow, services, validation, etc.]

## Dependencies

- Dependency:

## Out of Scope

- [ ]
```

## Rules

- Make acceptance criteria observable and testable.
- Keep technical subtasks out of the story title.
- Keep the story vertical, not layer-based.
- Avoid "build backend" / "build frontend" stories.
- Include permission expectations when relevant.
- Include empty states, loading states, and failure states for user-facing work.
- Include data migration or compatibility notes when existing data is affected.
- Include `Context Scope` for every story, even if some entries are tentative.
- Prefer targeted paths, symbols, routes, commands, and search anchors over broad codebase reading.
- Set `Scout needed` to `yes` only when a compact context map would prevent broad exploration during implementation.

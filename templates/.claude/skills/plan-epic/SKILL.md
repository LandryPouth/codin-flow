---
name: plan-epic
description: Composite workflow to plan an epic from product intent or brownfield analysis. Use to run planner, create the epic index, split into vertical stories, and generate all story blueprints. When the Agent/subagent tool is available, generate story folders in parallel with one subagent per story. When subagents are unavailable, fall back to sequential or batched inline generation.
---

# Plan Epic

## Overview

Turn product intent or brownfield discovery into an implementation-ready epic.

This is the macro planning workflow. It produces the artifacts Codex needs for reliable story execution while keeping planning overhead low.

The intended fast path is:

```txt
Phase 1: plan the epic and story list sequentially
Phase 2: generate story folders in parallel with one subagent per story
Phase 3: aggregate, verify, patch gaps, and recommend the first story
```

The fallback path is:

```txt
If subagents are not available, generate stories sequentially or in small inline batches.
Do not fail the workflow just because parallelism is unavailable.
```

## Conventions

- `{project-root}` means the current repository root.
- Epic folders use `epics/epic-NN-name/`.
- Story folders use `story-NN-MM-name/`.
- Use vertical stories, not technical phases.
- Keep the epic small enough to start shipping quickly.
- `docs/project-context.md` is the current state map only.
- Story `decisions.md` stores detailed decisions.
- Story `implementation-notes.md` stores what actually happened during implementation.
- Every story must include a `Context Scope` so implementation starts from targeted files, symbols, routes, and commands instead of broad repository review.

## Subagent Policy

Use subagents only for story blueprint generation, not for the initial epic plan.

Good use:

- one subagent per story
- each subagent writes only its own story folder
- all subagents launched in the same turn when the tool supports it

Do not use subagents for:

- FAST/small one-story planning
- unclear requirements that still need user answers
- shared files like `docs/project-context.md`, `PROJECT_RULES.md`, or the epic `index.md`
- nested subagent spawning from inside a subagent

Important limitation:

- If this skill is already running inside a subagent, the Agent/subagent tool may not be available.
- In that case, use the fallback path below.

## Context Efficiency Policy

Planning should reduce implementation context load. The epic index must include a `Context Efficiency Strategy`. Each story must carry a concrete `Context Scope` with: known relevant files, search anchors, areas to avoid, scout yes/no, and initial context budget.

Use `$agent-context-scout` only for broad, ambiguous, cross-module, or high-risk stories. The scout must not implement code. Do not use it for FAST stories or when the story already names clear edit points.

## Phase 0 - Readiness

Before planning, decide whether the request is ready.

Use `$grill-me` first when:

- product scope is ambiguous
- user roles are unclear
- auth/permissions are unclear
- data ownership is unclear
- acceptance criteria cannot be made testable

Skip `$grill-me` when the intent is already clear enough to plan.

## Phase 1 - Epic Planning

Run these steps sequentially. Do not spawn subagents yet.

1. Use `$agent-planner` to analyze the request and choose the smallest valuable epic.
2. Identify the epic folder name, for example `epic-01-authentication`.
3. Identify 2-5 vertical stories, each with:
   - story folder name
   - one-line user/system outcome
   - recommended intensity mode: FAST, STANDARD, or STRICT
   - targeted context hints: likely files/directories, search anchors, areas to avoid, scout yes/no
4. Use `$blueprint-epic-index` to create `epics/{epic-name}/index.md`.

The epic index must include the full story list. Story-generation subagents will use it as their shared source of truth.

Do not proceed to Phase 2 until:

- the story list is stable
- the epic index exists
- each story has a clear intent

## Phase 2A - Parallel Story Generation

Use this path when the Agent/subagent tool is available.

Spawn one subagent per story, all in the same turn, so they can run in parallel.

Each subagent must receive a self-contained prompt:

```txt
You are writing the full blueprint for one story in the project at {project-root}.

Story path: {story-path}
Story intent: {story-intent}
Recommended intensity: {FAST|STANDARD|STRICT}

Before writing anything, read:
- PROJECT_RULES.md
- AGENT_RULES.md
- docs/project-context.md
- docs/architecture.md
- docs/conventions.md
- {epic-path}/index.md

Then use $write-story and the blueprint skills to create all five files inside {story-path}/:
- story.md
- tasks.md
- tests.md
- decisions.md
- implementation-notes.md

The story must include a concrete Context Scope:
- known relevant files or directories
- search anchors to run first
- files or areas to avoid unless needed
- scout needed: yes/no
- initial context budget

Create the story directory if it does not exist.
Scope your output strictly to this story.
Do not modify other stories.
Do not modify project-level docs.
Do not spawn additional subagents.
```

## Phase 2B - Fallback Story Generation

Use this path when the Agent/subagent tool is unavailable, blocked, or already running inside a subagent.

Generate stories sequentially or in small inline batches:

1. Create the story directory.
2. Use `$blueprint-story` for `story.md`.
3. Use `$blueprint-tasks` for `tasks.md`.
4. Use `$blueprint-tests` for `tests.md`.
5. Use `$blueprint-decisions` for `decisions.md`.
6. Use `$blueprint-implementation-notes` for `implementation-notes.md`.
7. Repeat for each story.

Report clearly that fallback mode was used:

```txt
Subagents unavailable; generated stories sequentially.
```

Fallback is acceptable. The output quality matters more than parallelism.

## Phase 3 - Aggregation

After story generation:

1. Verify the epic index exists.
2. Verify every story folder exists.
3. Verify every story folder has:
   - `story.md`
   - `tasks.md`
   - `tests.md`
   - `decisions.md`
   - `implementation-notes.md`
4. Patch missing files inline.
5. Summarize generated artifacts.
6. Recommend the first story to run and its intensity mode.

## Brownfield Additions

Before Phase 1, inspect and update:

- `docs/project-context.md`
- `docs/architecture.md`
- `docs/conventions.md`
- `docs/roadmap.md`

Identify:

- current architecture and existing patterns
- hardcoded data and coupling points
- migration risks
- first safe vertical slice

Do not dump the audit into `project-context.md`. Summarize only durable current state, constraints, risks, and roadmap impact.

## Greenfield Additions

Before Phase 1, define:

- product goal and target users
- initial stack assumptions
- architecture constraints
- validation strategy
- smallest shippable slice

## Story Count Guidance

- Start with 2-5 stories for a normal epic.
- Use 1 story only for very small features.
- Use more than 5 only when dependencies or risk justify it.

## Output

```md
# Plan Epic Result

## Epic

- Path:
- Goal:
- Scope:

## Stories

- story-NN-NN-name: one-line intent, recommended intensity

## Generation Mode

- Mode: parallel subagents / fallback sequential
- Subagents spawned:
- Completed:
- Missing files patched inline:

## First Story To Run

- Path:
- Recommended intensity:
- Reason:

## Generated Files

- epics/{epic}/index.md
- epics/{epic}/{story}/story.md
- epics/{epic}/{story}/tasks.md
- epics/{epic}/{story}/tests.md
- epics/{epic}/{story}/decisions.md
- epics/{epic}/{story}/implementation-notes.md

## Assumptions

-

## Risks

-

## Recommended Next Command

Use $run-story STANDARD for epics/{epic}/{first-story}/
```

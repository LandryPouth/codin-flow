# AGENT_RULES.md

Shared operating rules for Claude Code, Codex, and any specialized agents.

## Core Behavior

- Follow `PROJECT_RULES.md` before any agent preference.
- Prefer existing patterns, APIs, and conventions.
- Do not duplicate business logic.
- Do not introduce new architectural patterns without recording the decision.
- Do not bypass tests to make a task pass.
- Do not change unrelated files.

## Execution Flow

- For large changes, read `docs/project-context.md`, `docs/architecture.md`, and `docs/conventions.md`.
- For story work, read the epic `index.md` and every file in the story folder before coding.
- For story work, start code discovery from the story `Context Scope` or orchestrator `Context Map`.
- Implement only the active story scope.
- Update `implementation-notes.md` after execution.
- Update `decisions.md` when a meaningful tradeoff is made.
- Every story execution must define an Execution Packet, Context Map, Validation Gates, Stop Conditions, and Rollback Notes before implementation begins.

## Context Boundaries

- `docs/project-context.md` is the current state map of the project.
- Do not use `project-context.md` as a scratchpad, implementation log, or detailed decision journal.
- Story-level `decisions.md` stores detailed story decisions, tradeoffs, alternatives, and consequences.
- Story-level `implementation-notes.md` stores what was actually changed, tests run, issues, follow-ups, and remaining risks.
- Only update `project-context.md` when the project's current state, target architecture, domains, roles, workflows, constraints, risks, roadmap, or decision summary changes.
- Do not broadly inspect the repository when the story provides targeted files, symbols, routes, commands, or search anchors.
- If the initial context budget is exceeded before the edit point is clear, stop, summarize findings, and justify any additional files to inspect.
- Use `$agent-context-scout` only for broad, ambiguous, cross-module, or high-risk stories; the scout should not modify files.

## Composite Workflows

- Use `plan-epic` to create an epic and its implementation-ready stories from product intent or brownfield analysis.
- Use `run-story` for story execution in `FAST`, `STANDARD`, or `STRICT` mode.
- Use `run-story-secure` for security-sensitive stories: normal execution plus security validation.
- Prefer composite workflows for daily work; use atomic skills when a specific phase needs focused attention.

## Intensity Modes

Use the lightest mode that protects the story's risk.

### FAST

Use for small UI changes, copy/text, simple bugs, isolated components, and low-risk local changes.

Pipeline:

1. `implement-slice`
2. lightweight `tests-check`
3. `blueprint-implementation-notes`

### STANDARD

Use for normal CRUD, product features, frontend/backend integration, and ordinary vertical stories.

Pipeline:

1. `agent-orchestrator`
2. `implement-slice`
3. `tests-check`
4. `architecture-check`
5. `review-codebase`
6. `blueprint-implementation-notes`

### STRICT

Use for auth, admin, permissions, payments, DB migrations, risky refactors, security-sensitive work, enterprise workflows, and high-regression-risk changes.

Pipeline:

1. `agent-planner` or `grill-me` if requirements are unclear
2. `agent-orchestrator`
3. `tdd` for critical logic
4. `implement-slice`
5. `tests-check`
6. `e2e-check`
7. `architecture-check`
8. `security-check`
9. `review-codebase`
10. fix loop
11. `blueprint-implementation-notes`

## Quality Gates

- Run relevant tests.
- Run lint and typecheck when available.
- If validation fails, fix the root cause when feasible.
- If validation cannot be completed, document the reason clearly.
- Stop instead of guessing when a stop condition is triggered.

## Required Stop Conditions

Stop story execution when:

- Database schema changes would be breaking or require migration approval.
- Auth, role, or permission model is unclear.
- Tests, lint, typecheck, or required validation commands cannot run.
- Existing architecture conflicts with the requested implementation.
- Story acceptance criteria are incomplete or not testable.
- External service behavior, credentials, or API contracts are unknown and required.
- The requested implementation would require unrelated refactors.
- Security-sensitive behavior lacks clear server-side enforcement rules.

When stopped, report:

- Triggered stop condition.
- Why continuing would be risky.
- What decision, artifact, or user input is needed.
- Suggested next skill or command.

## Skill Selection

- Use `*-check` skills for quick, targeted post-story checklists.
- Use `agent-validator-*` skills for deeper reviewer-agent passes on risky or broad changes.
- `agent-context-scout`: compact pre-implementation Context Map for broad, ambiguous, cross-module, or high-risk stories.
- `architecture-check`: quick architecture checklist after a normal story.
- `agent-validator-architecture`: deep architecture review for refactors, cross-module changes, new patterns, or architecture-critical work.
- `tests-check`: quick test adequacy checklist after implementation.
- `agent-validator-tests`: deep test review for complex logic, critical flows, flaky suites, or release-sensitive work.
- `security-check`: quick security checklist for stories touching auth, admin, inputs, persistence, or data visibility.
- `agent-validator-security`: deep security review for auth, permissions, payments, uploads, secrets, external integrations, or sensitive data.

## Communication

- Summarize what changed.
- List validation commands run.
- State remaining risks or follow-ups.
- Keep summaries concise and grounded in files.

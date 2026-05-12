# Coding Flow

Coding Flow is an AI-native engineering workflow for teams or solo developers who use Claude Code for planning and Codex for implementation.

It gives your project:

- reusable agent skills
- project rules
- controlled long-term context
- vertical epics and stories
- execution modes for small, normal, and risky work
- validation gates that reduce vibe coding

The goal is not to create ceremony. The goal is to make AI-assisted development predictable.

## Mental Model

Use the system like this:

```txt
Claude Code = strategy, discovery, architecture, epics, stories, review
Codex       = implementation, tests, terminal loop, fixes
```

The core loop is:

```txt
plan -> write stories -> run a story -> validate -> document what happened
```

## Installation

Inside the project you want to equip:

```bash
npx github:LandryPouth/codin-flow init
```

Then verify the installation:

```bash
npx github:LandryPouth/codin-flow doctor
```

To install from a specific branch or tag:

```bash
npx github:LandryPouth/codin-flow#main init
npx github:LandryPouth/codin-flow#v0.1.0 init
```

If you installed the package globally or linked it locally:

```bash
coding-flow init
coding-flow doctor
```

Existing files are skipped by default. Use this only when you intentionally want to overwrite installed workflow files:

```bash
coding-flow init --force
```

## What Gets Installed

```txt
.claude/
  skills/
    agent-orchestrator/
    agent-planner/
    agent-worker-fullstack/
    agent-worker-tests/

    agent-validator-architecture/
    agent-validator-security/
    agent-validator-tests/

    blueprint-epic-index/
    blueprint-story/
    blueprint-tasks/
    blueprint-tests/
    blueprint-decisions/
    blueprint-implementation-notes/

    plan-epic/
    run-story/
    run-story-secure/

    grill-me/
    implement-slice/
    tdd/
    e2e-check/
    architecture-check/
    tests-check/
    security-check/
    review-codebase/
    write-story/

.agents/
  skills/
    same skills mirrored for Codex and other agents

docs/
  project-context.md
  architecture.md
  conventions.md
  roadmap.md

epics/

AGENT_RULES.md
PROJECT_RULES.md
CLAUDE.md
```

Each skill is a standard portable skill folder:

```txt
.claude/skills/skill-name/SKILL.md
.agents/skills/skill-name/SKILL.md
```

`CLAUDE.md` imports the installed project rules so Claude Code loads them automatically:

```md
@PROJECT_RULES.md
@AGENT_RULES.md
```

Claude Code discovers project skills from `.claude/skills/`. Coding Flow also installs the same skills into `.agents/skills/` as a neutral mirror for Codex or other agents that do not automatically read Claude's skill directory.

## First 10 Minutes

After installation, start by asking your AI agent to understand the project.

For an existing project:

```txt
Use $agent-planner to analyze this existing codebase and update docs/project-context.md, docs/architecture.md, docs/conventions.md, docs/roadmap.md, PROJECT_RULES.md, and AGENT_RULES.md. Do not modify application code.
```

For a new project:

```txt
Use $agent-planner to define the initial product context, target architecture, conventions, roadmap, and project rules. Do not implement application code yet.
```

If the product idea or feature is unclear:

```txt
Use $grill-me to clarify this project until it is ready for epic and story planning.
```

## Daily Workflow

Most of the time, use the macro skills.

### Plan An Epic

```txt
Use $plan-epic to create the first epic and implementation-ready stories for this project.
```

For brownfield work:

```txt
Use $plan-epic to analyze the existing codebase, identify the safest first vertical slice, and create an implementation-ready epic.
```

For greenfield work:

```txt
Use $plan-epic to turn this product idea into the first shippable epic and stories.
```

### Run A Story

Use one of the intensity modes.

```txt
Use $run-story in FAST mode for story-01-01.
```

```txt
Use $run-story in STANDARD mode for story-01-01.
```

```txt
Use $run-story in STRICT mode for story-01-01.
```

For security-sensitive work:

```txt
Use $run-story-secure for story-01-01.
```

## Intensity Modes

Use the lightest mode that protects the story's risk.

### FAST

Use for:

- small UI changes
- text or copy updates
- simple bugs
- isolated components
- low-risk local changes

Pipeline:

```txt
implement-slice
-> lightweight tests-check
-> implementation-notes
```

Example:

```txt
Use $run-story in FAST mode to update the empty state copy for story-02-01.
```

### STANDARD

Use for:

- CRUD
- normal product features
- frontend/backend integration
- ordinary vertical stories

Pipeline:

```txt
agent-orchestrator
-> implement-slice
-> tests-check
-> architecture-check
-> review-codebase
-> implementation-notes
```

Example:

```txt
Use $run-story in STANDARD mode to implement story-02-03-admin-create-post.
```

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

```txt
planner/grill if needed
-> orchestrator
-> tdd if critical
-> implement-slice
-> tests-check
-> e2e-check
-> architecture-check
-> security-check
-> review-codebase
-> fix loop
-> implementation-notes
```

Example:

```txt
Use $run-story in STRICT mode to implement story-01-02-register because it touches auth and user data.
```

## Greenfield Process

Use this when starting a new project.

```txt
Use $grill-me to clarify the product idea, users, constraints, and first shippable value.
```

```txt
Use $agent-planner to create the initial project context, architecture, conventions, roadmap, PROJECT_RULES.md, and AGENT_RULES.md.
```

```txt
Use $plan-epic to create epic-01 and its implementation-ready stories.
```

```txt
Use $run-story in STANDARD mode for the first story.
```

Use `STRICT` when the first story touches auth, payments, permissions, security, or data migrations.

## Brownfield Process

Use this when adding the workflow to an existing codebase.

```txt
Use $agent-planner to analyze this codebase, identify the stack, architecture, hardcoded data, coupling points, conventions, risks, and recommended first epic. Update only the workflow docs. Do not change application code.
```

Then:

```txt
Use $plan-epic to create the safest first vertical-slice epic for this existing project.
```

Then run stories one by one:

```txt
Use $run-story in STANDARD mode for story-01-01.
```

For high-risk brownfield changes:

```txt
Use $run-story-secure for story-01-01.
```

## Context Files

Keep long-term context controlled.

### `docs/project-context.md`

This is the current state map of the project.

It should contain:

- product summary
- current state
- target architecture
- core domains
- data model
- user roles
- important workflows
- technical constraints
- known risks
- current roadmap
- decisions log summary

Do not use it as a scratchpad.

### Story `decisions.md`

Use for detailed story decisions:

- tradeoffs
- rejected alternatives
- consequences
- architecture choices

### Story `implementation-notes.md`

Use after implementation:

- files changed
- tests run
- validation results
- issues encountered
- follow-ups
- remaining risks

Rule:

```txt
project-context.md = current durable project state
decisions.md = detailed decisions by story
implementation-notes.md = what actually happened
```

## Stop Conditions

Every story execution should define:

- Execution Packet
- Validation Gates
- Stop Conditions
- Rollback Notes

Stop instead of guessing when:

- database schema changes would be breaking
- auth, roles, or permissions are unclear
- tests or required validation commands cannot run
- existing architecture conflicts with the requested implementation
- story acceptance criteria are incomplete or not testable
- external API contracts, credentials, or trust boundaries are unknown
- security-sensitive behavior lacks server-side enforcement rules

When a stop condition triggers, ask for the missing decision or artifact instead of forcing progress.

## Skill Selection

Prefer macro skills for daily work:

- `plan-epic`: create an epic and implementation-ready stories
- `run-story`: execute one story with `FAST`, `STANDARD`, or `STRICT`
- `run-story-secure`: execute one security-sensitive story

Use atomic skills when you need control over one phase:

- `grill-me`: clarify requirements
- `write-story`: create a story folder
- `implement-slice`: implement one vertical slice
- `tdd`: use targeted test-driven development
- `e2e-check`: plan or validate E2E coverage
- `review-codebase`: final review

Use quick checks after normal stories:

- `architecture-check`
- `tests-check`
- `security-check`

Use validator agents for deeper review:

- `agent-validator-architecture`
- `agent-validator-tests`
- `agent-validator-security`

Rule:

```txt
*-check = quick targeted checklist
agent-validator-* = deeper reviewer persona
```

## Example Full Session

```txt
Use $agent-planner to analyze this existing codebase and update the workflow docs. Do not modify application code.
```

```txt
Use $plan-epic to create the first epic for migrating hardcoded content to dynamic admin-managed content.
```

```txt
Use $run-story in STANDARD mode for story-01-01-audit-hardcoded-content.
```

```txt
Use $run-story in STRICT mode for story-01-04-admin-manage-first-content-type.
```

```txt
Use $review-codebase to review the latest implementation before merge.
```

## Local Development Of This Package

From this repository:

```bash
node bin/ai-flow.js init --dry-run
node bin/ai-flow.js init
node bin/ai-flow.js doctor
```

To test the package as a global command:

```bash
npm link
coding-flow init --dry-run
coding-flow doctor
```

This workflow is intended to be installed from GitHub, not published to npm.

## Roadmap

- `coding-flow add-epic`
- `coding-flow add-story`
- smarter merge behavior for existing docs
- `coding-flow doctor --fix`

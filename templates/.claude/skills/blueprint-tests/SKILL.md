---
name: blueprint-tests
description: Create or update a story tests.md file. Use when defining unit, integration, E2E, edge case, command, and expected-result validation for a story.
---

# Blueprint Tests

## Overview

Create `tests.md` as the validation contract for a story.

The test plan should protect important behavior without making Codex over-test low-risk UI.

## Conventions

- `{project-root}` means the current repository root.
- Tie tests to acceptance criteria and risk.
- Use known project commands when available.
- Mark E2E as optional unless the story justifies it.

## Generation Workflow

1. Read `story.md`.
2. Map acceptance criteria to unit, integration, E2E, or manual validation.
3. Identify risky logic that needs TDD.
4. Identify critical journeys that need E2E.
5. Include edge cases and expected commands.
6. Keep the plan small enough to execute.

## Template

````md
# Tests - Story NN.NN

## Test Strategy

[What should be tested and why.]

## Unit Tests

- [ ]

## Integration Tests

- [ ]

## E2E Tests

- [ ]

## Edge Cases

- [ ]

## Commands

```bash
npm run test
npm run typecheck
npm run lint
npm run e2e
```

## Expected Results

- [ ] All relevant tests pass
- [ ] No type errors
- [ ] No lint errors
- [ ] Critical E2E flows pass
````

## Rules

- Tie tests to acceptance criteria and risk.
- Do not require E2E for trivial UI.
- Include commands that actually exist when known.
- Add tests for permissions, validation, transformations, and data integrity.
- Prefer integration coverage when bugs are likely at boundaries.
- Include manual validation only when automation would be wasteful or unavailable.

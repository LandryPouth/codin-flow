# Tests - Story 01.02

## Strategy

Validate that content is sourced from the new typed boundary while preserving current behavior.

## Unit

- [ ] Content source exports valid shape.
- [ ] Mapping or normalization handles missing optional fields if applicable.

## Integration / Render

- [ ] Selected section renders expected content.
- [ ] Unrelated sections are unchanged.

## Manual

- [ ] Open the relevant page.
- [ ] Confirm content appears as before.

## Commands

- Command: `npm run typecheck`
  - Expected: passes, if available.
- Command: `npm test`
  - Expected: relevant tests pass, if available.

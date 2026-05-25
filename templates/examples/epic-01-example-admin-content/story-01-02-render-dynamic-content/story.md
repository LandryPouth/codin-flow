# Story 01.02 - Render Dynamic Content

## Goal

Render the selected content section from a typed dynamic source instead of inline hardcoded copy.

## User Value

The page keeps the same behavior while the codebase gains a safe content boundary for future admin management.

## Context

This story follows the hardcoded content audit and migrates one low-risk section only.

## Implementation Context

Likely files or directories:

- `[selected section path]` - component or page found during Story 01.01
- `[content module path]` - new or existing content source

Search anchors:

- selected section heading
- component name
- route path

Execution mode:

- `STANDARD`

Scout pre-step:

- `no`

Avoid unless needed:

- database schema
- auth
- full admin UI

## Requirements

- [ ] Move selected content into a typed content source.
- [ ] Render the section from that source.
- [ ] Preserve current visual behavior and copy unless the story says otherwise.
- [ ] Add tests where the project has a relevant testing pattern.

## Acceptance Criteria

- [ ] Given the page renders, when the section appears, then it uses the dynamic content source.
- [ ] Given the content source changes, when the page renders, then the visible content updates from the source.
- [ ] Given the migration is complete, when unrelated sections render, then they are unchanged.

## Edge Cases

- [ ] Missing content values.
- [ ] Empty optional fields.
- [ ] Existing tests or snapshots depending on hardcoded copy.

## UX Notes

Do not introduce visual redesign.

## Technical Notes

Keep the abstraction small. Do not build a generic CMS layer yet.

## Dependencies

- Dependency: Story 01.01 candidate selection.

## Out of Scope

- [ ] Admin editing.
- [ ] Database persistence.
- [ ] Publishing workflow.

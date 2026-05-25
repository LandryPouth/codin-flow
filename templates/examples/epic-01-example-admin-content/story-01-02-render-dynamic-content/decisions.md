# Decisions - Story 01.02

## Decisions

- Decision: Use a typed local content source before persistence.
  - Reason: Proves the boundary without introducing database/admin complexity.
  - Consequence: Future stories can replace the source with persisted data behind the same boundary.

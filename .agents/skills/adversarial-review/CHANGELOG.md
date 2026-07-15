# Changelog

## [1.1.0] - 2026-07-15

### Added

- Isolation requirement: the reviewer must operate in a brand new context with no knowledge of the original implementer's thoughts or rationale; Phase 0 gate added to GATES.md

## [1.0.1] - 2026-07-14

### Fixed

- Relaxed spec-audit: a missing GATES.md is only a Minor finding for code-modifying tasks with no other validation; standard checks required only when a GATES.md exists (REVIEW.md F4)

## [1.0.0] - 2026-07-14

### Added

- Initial release of adversarial-review
- Hostile, bug-hunting code review pipeline covering correctness, security, edge cases, design, test coverage, and documentation gaps

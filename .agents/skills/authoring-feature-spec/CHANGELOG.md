# Changelog

## [1.3.1] - 2026-07-09

### Fixed

- Updated `grill-me` dependency and link references to `grilling` after skill rename

## [1.3.0] - 2026-07-08

### Added

- Prune `TASK.md` Completion checklist to include only items relevant to the assigned task `type`

## [1.2.0] - 2026-07-08

### Added

- Workspace type detection and `in-place` / `worktree` terminology
- Systematic missing-input handling with context-based recommendations
- `finding-vendors` dependency for exploratory tasks
- All tasks own `MEMORY.md` for progress and handoff
- Gate concept documentation (any task type can have gates)
- `originator` field in TASK.md frontmatter
- Per-task `GATES.md` template (no frontmatter, validation checklists)
- Frontmatter Reference section documenting all file schemas

### Changed

- Pipeline: generate-files-first, then review (removed pre-generation approval gate)
- Design Gates section: not restricted to execution tasks
- Task types: removed `synthesizer`; `exploratory` references finding-vendors; `execution` gates optional

### Removed

- `FEATURE.md` concept (metadata absorbed into templates)
- `CHECKLIST.md` concept (validation moved to per-task GATES.md)
- Defect architecture and all defect references from authoring
- `synthesizer` task type

## [1.0.0] - 2026-07-07

### Added

- Initial release as `authoring-feature-spec` (renamed from `creating-feature-spec`)
- Git worktree integration in pipeline
- `grilling` for requirements gathering
- Phase-based execution model (Phase A, Phase B, Phase C)
- Task typing system via frontmatter
- Flat defect architecture

# Changelog

## [3.2.0] - 2026-07-14

### Added

- Canonical status enum (`pending | in-progress | complete | blocked`) defined as the single source of truth for task status across feature-spec skills; `defect` is a task `type`, never a status

### Changed

- Status Enum note no longer references the deleted `managing-feature-spec-defects` skill

## [3.1.0] - 2026-07-14

### Added

- New `review` task type: runs an adversarial review of a completed phase, delegating to an independent subagent (not the main working agent) executing the `adversarial-review` skill
- `REVIEW.md` artifact template for `review` tasks — records severity-ranked findings (`file_path:line` + problem + impact + suggestion) and the human review / remediation-task handoff
- Phase-end review convention: every Phase should end with a `review` task that blocks phase completion until the human has reviewed `REVIEW.md` and a remediation task set (`defect` / `execution`) is authored for accepted findings
- `REVIEW.md` to the Frontmatter Reference and the file-generation step

## [3.0.1] - 2026-07-14

### Changed

- Updated `finding-vendors` dependency to `finding-references` in frontmatter and task type description

## [3.0.0] - 2026-07-11

### Changed

- Split into two skills: base `authoring-feature-spec` (non-worktree) and `authoring-feature-spec-in-worktree`
- Removed all workspace management (detection, worktree creation, init, relocate)
- Removed `using-git-worktrees` dependency
- Renumbered pipeline steps 0-5
- Updated description to clarify "current workspace" usage
- Clarified caveman-compression: applies to content, not template structure

### Added

- Step 0 "Redirect if in non-feature worktree": detects non-feature linked worktrees and redirects to worktree variant

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
- `finding-references` dependency for exploratory tasks (formerly finding-vendors)
- All tasks own `MEMORY.md` for progress and handoff
- Gate concept documentation (any task type can have gates)
- `originator` field in TASK.md frontmatter
- Per-task `GATES.md` template (no frontmatter, validation checklists)
- Frontmatter Reference section documenting all file schemas

### Changed

- Pipeline: generate-files-first, then review (removed pre-generation approval gate)
- Design Gates section: not restricted to execution tasks
- Task types: removed `synthesizer`; `exploratory` references finding-references; `execution` gates optional

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

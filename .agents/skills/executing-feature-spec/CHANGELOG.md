# Changelog

## [1.3.0] - 2026-07-14

### Added

- `review` task type: executed by an independent subagent running the `adversarial-review` skill over the completed phase, writing findings to `REVIEW.md`
- Independent-subagent review step in the mermaid pipeline (review task runs after non-review tasks, before phase lock)
- End-of-Phase Review flow: human reviews `REVIEW.md`, accepted findings become `defect`/`execution` remediation tasks, then loop
- `review` added to the task-type behavior table and frontmatter description

## [1.2.2] - 2026-07-14

### Changed

- Updated `finding-vendors` reference to `finding-references` in exploratory task description

## [1.2.1] - 2026-07-09

### Added

- Added `executing-skills` as required dependency in frontmatter
- Added prerequisite alert after "When To Use" referencing executing-skills

## [1.2.0] - 2026-07-08

### Added

- Task ID generation logic for defect tasks (scan phase, increment highest number)
- `FEATURE.md` task table update instruction when defect tasks are appended
- Sub-agents must read `MEMORY.md` of `depends-on` tasks for context handoff
- Gate column check: sub-agents check `Gates` column before marking tasks complete

### Changed

- Defect tasks use `originator: defect:<parent-task-id>` syntax (was `<parent-task-id>`)
- Defect tasks now create standard task directories, not flat files

## [1.1.0] - 2026-07-08

### Added

- Mermaid flowchart diagram documenting full execution flow
- Defect review loop: user feedback grouped into tasks, approved, then executed
- Per-phase commit workflow (commits happen after each phase, not at end)

### Changed

- Removed SINGLE/MULTI mode concept; always executes per-phase with sub-agents
- Pipeline: Load State → Execute Phase → Review/Defect Loop → Per-Phase Commit → next phase
- Active phase determined automatically from task states (first phase with pending/in-progress)
- Removed `managing-feature-spec-defects` dependency; defects come from user feedback only
- `caveman-compression` applies to file writes only, skill referenced via markdown link
- GATES.md: removed mode gate, split Phase Transition into Review/Defect Loop and Per-Phase Commit

## [1.0.0] - 2026-07-08

### Added

- Initial release of executing-feature-spec
- Task execution by type (exploratory, planning, execution, interruptor, defect)
- End-of-phase interruption with flat defect handling
- Final commit workflow via planning-git-commits
- Skill structure aligned with authoring-skills standard (When To Use, Pipeline, Reference)

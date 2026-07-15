# Changelog

## [2.0.0] - 2026-07-15

### Changed

- Renamed skill from `installing-skills` → `syncing-skills` to better reflect the full lifecycle (fresh + update); all internal references updated accordingly

## [1.0.0] - 2026-07-15

### Added

- Initial release of installing-skills
- Mode detection (all, multi, single)
- Context gathering (source verification, target identification, skill selection)
- Pre-install checklist per skill (metadata, existence, version resolution, changelog review)
- Fresh install and upgrade workflows
- Parallel subagent orchestration for multi-mode installs
- Post-install verification, AGENTS.md generation, and git commit offering
- Safety guards: `installing-skills` is always excluded from install targets (never self-installed); `: "${TARGET:?target path required}"` aborts when TARGET is empty and gates every `rm`/`cp` step; documented self-install abort if target resolves inside this repo

# Changelog

## [2.0.0] - 2026-07-22

### Changed

- Replaced git submodule workflow with plain git clone
- Changed filesystem path from `references/` to `.agents/references/`
- Removed `.gitmodules` validation and submodule-specific commands
- Updated maintain step from `git submodule update --remote --merge` to `cd && git pull`
- Simplified read-only guardrails (gitignore-based)
- Updated migration note referencing new `.agents/references/` path

## [1.1.0] - 2026-07-14

### Changed

- Renamed skill from `adding-vendor` to `adding-references`
- Changed filesystem path from `vendor/` to `references/` for all submodule operations
- Updated all prose from "vendor" to "reference" terminology
- Added migration note referencing old `vendor/` path

## [1.0.1] - 2026-07-09

### Added

- Added `executing-skills` as required dependency in frontmatter
- Added prerequisite alert after "When To Use" referencing executing-skills

## [1.0.0] - 2026-07-08

### Added

- Initial release of adding-references (formerly adding-vendor)
- Pre-execution validation (git repo check, directory root, existing .gitmodules)
- Reference installation: submodule creation, initialization, verification, registry update
- Maintenance workflow: update to latest remote
- Read-only guardrails: global gitignore and ignore tracking options
- Recovery protocol for modified reference content
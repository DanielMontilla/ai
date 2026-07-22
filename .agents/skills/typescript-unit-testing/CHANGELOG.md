# Changelog

## [1.2.0] - 2026-07-22

### Changed

- Added `unit-testing` as dependency
- Moved language-agnostic content to `unit-testing` parent skill
- Added Vitest configuration and test-running validation
- Rewrote as TypeScript-specific infrastructure layer

## [1.1.0] - 2026-07-22

### Changed

- Renamed from `unit-testing` to `typescript-unit-testing`
- Removed Effect-specific references to make the skill generic
- Changed groups to include `typescript`

## [1.0.1] - 2026-07-09

### Added

- Added `executing-skills` as required dependency in frontmatter
- Added prerequisite alert after "When To Use" referencing executing-skills

## [1.0.0] - 2026-07-08

### Added

- Initial release of unit-testing skill
- Frontmatter with `name`, `description`, `author`, `version`, `license`, `groups`, `dependencies`
- `# When To Use`, `# Pipeline`, and `# Reference` sections following standard skill structure
- Test quality probing question pipeline
- Directory structure enforcement rules
- Cross-references to `creating-typescript-modules` and `setup-typescript-tests-with-effect`

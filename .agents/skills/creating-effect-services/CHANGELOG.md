# Changelog

## [1.0.0] - 2026-07-08

### Added

- Initial release of creating-effect-services skill
- Effect v4 service scaffolding pipeline
- ServiceMap.Service pattern with required exports (Id, Impl, ServiceName, Default)
- make effect and Default layer patterns

### Changed

- Added `dependencies` frontmatter field referencing creating-typescript-modules
- Removed `license` field from frontmatter to align with template
- Extracted inline Service Template to `templates/service.module.ts`
- Extracted inline Full Example to `examples/json.service.ts`
- Updated Reference section links to point to new files
- Updated Directory Structure to document skill layout
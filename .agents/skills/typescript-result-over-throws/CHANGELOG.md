# Changelog

## [1.0.0] - 2026-07-22

### Added

- Initial release of typescript-result-over-throws
- Convention: TypeScript functions return `@montflow/core` `Result` values instead of throwing
- Guidance on discriminated error classes with literal `code` fields
- Consumer patterns using exhaustive `switch` on `error.code`
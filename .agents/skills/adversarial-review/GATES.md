## Phase 0: Independence

- [ ] The review was conducted in isolation — the reviewer had no access to the original implementer's thoughts, notes, commit messages, design commentary, or any context beyond the code, spec, and goals
- [ ] Findings are based solely on what the code *does* vs. what it *should do*, not on what the author intended

## Phase 1: Coverage

- [ ] If the target is a feature spec (`.agents/features/<name>/`), the spec-audit step ran and covered requirements, task coverage, gates, dependencies, types, phases, completion criteria, and deviations
- [ ] The review covers correctness, security, edge cases, design, test coverage, and documentation for the changed code
- [ ] Every finding includes a `file_path:line` location
- [ ] Every finding states a concrete trigger (input, state, or path) that breaks the code, or is explicitly labeled a risk

## Phase 2: Evidence & Prioritization

- [ ] Confirmed defects show the failing path; risks are distinguished from confirmed bugs
- [ ] Findings are prioritized by severity (Critical → Nit) with highest-severity leading
- [ ] Each finding has an impact and a specific, minimal suggested fix
- [ ] Nitpicks are grouped at the end and kept short; no padding praise

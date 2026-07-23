## Phase 1: State Loading

- [ ] All task states (complete, in-progress, pending, blocked) correctly mapped from files
- [ ] Active phase determined as first phase with pending/in-progress tasks
- [ ] Spec validated: FEATURE.md parses, all TASK.md have valid frontmatter, all statuses in canonical enum, `locked-phases` parseable
- [ ] Invalid status values coerced to `blocked` with deviation logged in MEMORY.md

## Phase 2: Task Execution

- [ ] Each executed task completed according to its `type` contract
- [ ] All gates in executed task's GATES.md passed before marking complete
- [ ] Exploratory tasks stored findings in MEMORY.md
- [ ] Execution tasks validated (lint, format, test) per task GATES.md
- [ ] Defect tasks linked correct `related-tasks` in frontmatter
- [ ] `caveman-compression` applied when writing files

## Phase 3: Review & Defect Loop

- [ ] End-of-phase review prompt presented to user at phase boundary
- [ ] User-reported defects grouped into tasks with correct `originator` links
- [ ] Defect tasks shown to user for approval/modification before execution
- [ ] Independent-subagent adversarial review run over completed phase
- [ ] Remediation tasks trigger fresh adversarial review (review task reset to `pending`, re-run)
- [ ] Review task stays `pending` until human signs off at Phase X complete prompt
- [ ] Review loop repeats until user reports no issues
- [ ] Review-loop counter tracked in MEMORY.md; execution halts at 5 iterations if accepted findings remain
- [ ] Subagents selected by effort tier (low/high capacity) — no hardcoded model names
- [ ] Subagents discover verification commands from the project manifest, not assumed toolchains
- [ ] Orchestrator and subagents apply caveman-reasoning to their reasoning trace

## Phase 4: Per-Phase Commit

- [ ] `planning-git-commits` loaded after user approves phase
- [ ] Commit plan shown to user for approval/modification
- [ ] Commits created and phase locked only after user explicit approval

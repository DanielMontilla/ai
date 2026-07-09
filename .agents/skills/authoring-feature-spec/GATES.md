## Phase 0: Workspace & Input

- [ ] Workspace type determined
- [ ] Feature name provided (kebab-case)
- [ ] Requirements captured and gaps resolved using `grilling`
- [ ] Execution context handled (worktree created if desired, or in-place confirmed)

## Phase 1: Structure Validation

- [ ] Feature root dir created under `.agents/features/<name>/`
- [ ] `FEATURE.md` exists with frontmatter, description, requirements, and task table
- [ ] Task directories created with phase prefixes (A01, A02, B01...)
- [ ] Each task dir contains `TASK.md` and `MEMORY.md`

## Phase 2: Content Review

- [ ] Tasks are properly grouped into sequential Phases (Phase A → Phase B)
- [ ] Every `TASK.md` has a valid `type` defined in frontmatter (`exploratory`, `execution`, `planning`, `interruptor`, `defect`)
- [ ] Inter-phase dependencies are correct (tasks in Phase B depend on Phase A)
- [ ] Phase interruptions are documented (expecting user validation at the end of each Phase)
- [ ] `GATES.md` correctly placed for tasks that require validation (not restricted to execution tasks)

## Phase 3: Review

- [ ] Generated files shown to user (directory tree, phases, tasks, gates)
- [ ] User approved or requested changes — iterated until satisfied



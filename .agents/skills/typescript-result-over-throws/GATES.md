## Phase 1: Convention Adherence

- [ ] No `throw`, `reject()`, or `.throw()` remains in refactored functions expected to recover from failure
- [ ] Every failure path in a refactored function returns `Result.err(...)` with a typed error class
- [ ] Every error class has a readonly literal `code` field (e.g., `readonly code = "not_found" as const`)

## Phase 2: Type Safety

- [ ] Return types of refactored functions are `Result<Success, ErrorUnion>` (inferred or explicit, not `unknown`/`any`)
- [ ] Consumer `switch (error.code)` blocks are exhaustive — the compiler reports no missing case
- [ ] No function silently swallows a `Result` from a callee into a throw or `Promise` rejection

## Phase 3: Boundary Integrity

- [ ] `@montflow/core` is present in the modified package's `package.json` dependencies
- [ ] Any `throw` still present in the touched files is a documented programmer-error invariant, not an expected failure
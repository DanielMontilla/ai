## Phase 1: Dependency Correctness

- [ ] `@effect/vitest` version in `devDependencies` matches `effect` peerDependency exactly (without caret)

## Phase 2: Effect Patterns Used

- [ ] Effectful tests use `it.effect`, `it.live`, or `it.scoped` (not raw promises)
- [ ] Test services supplied via `Layer.effectContext` or `Layer.succeed`
- [ ] Time-sensitive tests use `TestClock` instead of arbitrary `Effect.sleep`
- [ ] Fiber synchronization uses `Queue`, `Deferred`, `Ref`, or `Latch` rather than sleeps

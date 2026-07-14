---
name: adversarial-review
description: Performs a hostile, bug-hunting code review that assumes the author made mistakes. Surfaces possible bugs, edge cases, security holes, missed refactors, missing tests, and documentation gaps. Use when reviewing code, PRs, or diffs before merge.
author: Daniel Montilla
version: 1.0.1
license: MIT
dependencies:
  - executing-skills
groups:
  - refactoring
  - testing
  - conventions
  - feature-spec
---

# When To Use

Use when reviewing code, a pull request, or a diff and the user wants more than a polite pass — they want a skeptical, adversarial review that *assumes something is wrong* and tries to prove it. Triggers include "review this PR", "check my code for bugs", "audit this diff", "what could go wrong here", or "be brutal about this change".

> **Prerequisite**: Load the [executing-skills](../executing-skills/SKILL.md) skill before running this pipeline. It governs how skills are loaded, executed, and verified.

# Mindset

Adopt the stance of a hostile reviewer whose job is to find the defect the author missed. Do not assume the code is correct; assume it is subtly broken and prove otherwise. For every claim "this works", ask "when does it not?" Prefer concrete evidence (a code path, an input, a state) over vague concerns.

# Pipeline

## 1. Map the Change

Before judging, understand what changed and why:

- Identify the entry points, public surface, and callers affected.
- Note the intended behavior vs. what the code actually does.
- Trace the primary happy path end to end.

## 2. If Reviewing a Feature Spec — Adversarial Spec Audit

> **Only run this step if the target is a feature spec** — i.e., a directory `.agents/features/<name>/` with `FEATURE.md`, `TASK.md`, `MEMORY.md`, and possibly `GATES.md` (see [authoring-feature-spec](../authoring-feature-spec/SKILL.md) and [executing-feature-spec](../executing-feature-spec/SKILL.md)). If the review targets plain code, skip to Step 3.

Assume the spec is incomplete or wrong and prove it. Audit the spec artifacts for:

- **Requirements/goal gaps**: requirements or goals that are vague, unmeasurable, or missing; success criteria that cannot be verified. Flag requirements with no corresponding task.
- **Task coverage**: tasks whose work is not traceable to a requirement/goal (scope creep); requirements not covered by any task.
- **Missing gates on execution**: any `execution` task that declares a `GATES.md` but omits `format:check`, `lint:check`, `ts:check`, and `test` where applicable. A missing `GATES.md` is only a Minor finding when the task modifies code and has no other validation path — gates are optional per authoring-feature-spec. These tasks can complete unvalidated.
- **Untested tasks**: `execution` tasks with no test plan or test gate — a risk; per authoring-feature-spec a missing `GATES.md` is a Minor finding when no other validation path exists.
- **Dependency integrity**: `depends-on` / `related-tasks` referencing non-existent task IDs, cycles, or ordering that makes a phase unexecutable; tasks that depend on work in a later phase.
- **Type misuse**: `interruptor` tasks that don't actually require a hard user decision (false gates); `defect` tasks missing `related-tasks`; `exploratory`/`planning` tasks that should have fact-verifying gates but don't.
- **Phase correctness**: phases that cannot be independently verified (no gates at end), or tasks within a phase that must run sequentially but are assumed parallel.
- **Completion criteria**: tasks whose completion checklist is empty or missing, so "done" is undefined.
- **Deviations/risk blind spots**: `MEMORY.md` missing an Open Questions or Deviations section where risks exist; undocumented assumptions that could break execution.
- **Scope/phasing**: missing phases (e.g., no migration, rollback, or observability phase) for a feature that needs them.

Emit these as findings in the same severity/report format as the rest of the review, with `file_path:line` pointing at the relevant `FEATURE.md`/`TASK.md`/`GATES.md` entries.

## 3. Hunt for Bugs (Correctness)

Look for defects that produce wrong results or crashes. Check:

- **Off-by-one / boundary** errors: empty collections, `n=0`, first/last element, `length-1`, exclusive vs inclusive ranges.
- **Null / undefined / nil** handling: optional fields, uninitialized vars, missing guards, `null` propagation through chains.
- **State mutation**: shared mutable state across calls, mutation of inputs, stale closures, race conditions in async/concurrent code.
- **Control flow**: unreachable branches, inverted conditions, missing `else`, fall-through in `switch`, early returns that skip cleanup.
- **Numeric**: integer overflow/underflow, float precision, division by zero, sign errors, mixing units.
- **Resource leaks**: unclosed handles, connections, streams, listeners, timers, un-cancelled subscriptions.
- **Concurrency**: races, deadlocks, lost updates, non-atomic read-modify-write, unguarded shared state.
- **Error handling**: swallowed exceptions, bare `catch`, error masking, wrong error type rethrown, silent failures, missing rollback.
- **Time / timezone / locale**: DST, leap years, UTC vs local, date math, formatting assumptions.
- **Recursion / iteration**: stack overflow on deep input, missing termination, exponential blowup.

## 4. Hunt for Security Holes

- Injection (SQL, command, template, XSS, LDAP, path traversal).
- Missing authz/authentication checks; IDOR on object ownership.
- Untrusted input used in `eval`, deserialization, redirects, `innerHTML`, `dangerouslySetInnerHTML`.
- Secrets logged, hardcoded, or committed; insufficient redaction.
- Missing rate limiting, brute-force exposure, weak validation.
- Unsafe dependencies; unpinned versions; known CVEs.
- TOCTOU (time-of-check-time-of-use) between validation and use.

## 5. Hunt for Edge Cases & Robustness

Assume adversarial inputs and hostile environments:

- Empty, null, huge, negative, NaN, `Infinity`, malformed, duplicate, or out-of-order inputs.
- Encoding/Unicode: surrogate pairs, combining chars, emoji, RTL, length vs code-point count, case folding.
- Network: timeouts, retries, partial responses, reordered packets, duplicate delivery.
- Disk full, permission denied, file locked, missing file.
- Backwards/forwards compatibility of schema, API, or data format changes.
- Behavior at scale: N+1 queries, O(n²) on large inputs, unbounded growth of caches/maps/arrays.

## 6. Judge the Design & Missed Opportunities

Find where better code was possible:

- **Duplication**: repeated logic that should be a shared helper (consider [detecting-duplication](../detecting-duplication/SKILL.md)).
- **Over-engineering**: premature abstraction, unneeded generics, layers that add no value, speculative config.
- **Under-engineering**: missing validation, weak typing, magic numbers/strings, implicit assumptions.
- **SOLID violations**: see [applying-solid](../applying-solid/SKILL.md) for the checklist.
- **Naming & clarity**: misleading names, comments that lie, dead code, commented-out blocks.
- **API ergonomics**: surprising signatures, inconsistent conventions, footguns in the public surface.
- **Performance**: wasteful recomputation, redundant I/O, missing memoization, unnecessary copying.

## 7. Assess Test Coverage

- Which branches, error paths, and edge cases have **no** test?
- Do tests assert real behavior or just restate the implementation (see [unit-testing](../unit-testing/SKILL.md))?
- Are boundary values (empty, max, null) exercised?
- Are failure modes (timeout, thrown error, bad input) covered?
- Is there flakiness: dependence on time, order, randomness, global state?
- Missing property-based, fuzz, or integration tests where they would catch real bugs.

## 8. Assess Documentation & Operability

- Misleading, missing, or stale docstrings/README/comments (see [writting-jsdoc](../writting-jsdoc/SKILL.md)).
- Public API undocumented or documented incorrectly.
- No changelog entry, migration note, or deprecation warning for breaking changes.
- Missing observability: no logging, metrics, or tracing on failure paths.
- No runbook/alert for production impact; unclear rollback path.

## 9. Report

Produce a prioritized, evidence-backed review. Structure:

- **Severity**: Critical / Major / Minor / Nit.
- **Location**: `file_path:line` for each finding.
- **Problem**: concrete, with the trigger (input/state/path) that breaks it.
- **Impact**: what goes wrong for the user or system.
- **Suggestion**: a specific, minimal fix.

Lead with the highest-severity, highest-likelihood bugs. Distinguish confirmed defects (show the failing path) from risks ("untested, could break if…"). Keep nitpicks short and grouped at the end. Do not pad with praise; be direct.

# Reference

- **Bug-hunting checklist**: Steps 3–5 above (MUST READ for each review).
- **Duplication**: [detecting-duplication](../detecting-duplication/SKILL.md) — for repeated logic findings
- **SOLID**: [applying-solid](../applying-solid/SKILL.md) — for design-violation findings
- **Testing quality**: [unit-testing](../unit-testing/SKILL.md) — for test-coverage findings
- **Docs**: [writting-jsdoc](../writting-jsdoc/SKILL.md) — for documentation findings

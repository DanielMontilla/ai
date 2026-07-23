/**
 * Regression test for finding F15 — `parseSummary` previously used a `\z`
 * regex anchor, which is a literal `z` in ECMAScript regex (not end-of-input
 * like in Ruby/Python). For the canonical review-file layout (Summary at
 * end-of-file with no `z` in the body), the old regex returned `null`, the
 * loop never detected "all terminal", and falsely ran to `maxLoops`.
 *
 * These tests pin the corrected end-of-section anchor
 * `(?=^##\s|$(?![\s\S]))` against the four layouts:
 *   1. Summary at EOF, no `z` in body (the canonical F15 case).
 *   2. Summary at EOF, body containing a `z` (must not truncate at the `z`).
 *   3. Summary followed by another `## ` heading (e.g. `## Reviewer Verdict`).
 *   4. No Summary block at all (returns null → loop keeps iterating).
 */

import { test, expect } from 'vitest';
import { parseSummaryText, isAllTerminal } from '../parse-summary.js';

const fixtureAllTerminalNoZ = `# Adversarial Review: x

## Review Metadata
- **Max Attempts**: 3

## Findings

### Critical

#### F1 — x
- **Status**: Resolved
- **Attempts**: 1

### Discussion
[Fixer] done

## Summary
- **Open**: 0
- **In Review**: 0
- **Resolved**: 1
- **Won't Fix**: 0
- **Escalated**: 0
`;

const fixtureAllTerminalWithZ = `# Adversarial Review: x

## Summary
- **Open**: 0
- **In Review**: 0
- **Resolved**: 2
- **Won't Fix**: 0
- **Escalated**: 0

Coverage areas: zombie paths, zero-state, zebra input.
`;

const fixtureSummaryThenVerdict = `# Adversarial Review: x

## Summary
- **Open**: 1
- **In Review**: 0
- **Resolved**: 13
- **Won't Fix**: 1
- **Escalated**: 0

## Reviewer Verdict
One new defect (F15) was introduced. Loop NOT closed; fixer owes a response.
`;

const fixtureNoSummary = `# Adversarial Review: x

## Findings

### Critical

#### F1 — x
- **Status**: Open
- **Attempts**: 0
`;

test('parseSummaryText: Summary at EOF with no z in body returns full counts (F15 canonical case)', () => {
  const s = parseSummaryText(fixtureAllTerminalNoZ);
  expect(s).toBeTruthy();
  expect(s.open).toBe(0);
  expect(s.inReview).toBe(0);
  expect(s.resolved).toBe(1);
  expect(s.wontFix).toBe(0);
  expect(s.escalated).toBe(0);
  expect(isAllTerminal(s)).toBe(true);
});

test('parseSummaryText: body containing z is not truncated at the z (F15 secondary failure mode)', () => {
  const s = parseSummaryText(fixtureAllTerminalWithZ);
  expect(s).toBeTruthy();
  expect(s.open).toBe(0);
  expect(s.inReview).toBe(0);
  expect(s.resolved).toBe(2);
  expect(s.wontFix).toBe(0);
  expect(s.escalated).toBe(0);
  expect(isAllTerminal(s)).toBe(true);
});

test('parseSummaryText: Summary followed by ## Reviewer Verdict stops at the next heading', () => {
  const s = parseSummaryText(fixtureSummaryThenVerdict);
  expect(s).toBeTruthy();
  expect(s.open).toBe(1);
  expect(s.inReview).toBe(0);
  expect(s.resolved).toBe(13);
  expect(s.wontFix).toBe(1);
  expect(s.escalated).toBe(0);
  expect(isAllTerminal(s)).toBe(false);
});

test('parseSummaryText: missing Summary returns null → isAllTerminal false (defensive)', () => {
  const s = parseSummaryText(fixtureNoSummary);
  expect(s).toBeNull();
  expect(isAllTerminal(s)).toBe(false);
});

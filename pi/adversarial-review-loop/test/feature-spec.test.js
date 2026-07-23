import { test, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {
  loadFeatureSpec,
  findActivePhase,
  getReviewLoopCounter,
  updateReviewLoopCounter,
  extractFindings,
  createRemediationTasks,
  updateFeatureTaskTable,
} from '../feature-spec.js';

// ─── Helpers ──────────────────────────────────────────────────────────

/**
 * Creates a temp project root with the given structure.
 */
function withProjectRoot(files) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'feat-spec-test-'));
  for (const [relPath, content] of Object.entries(files)) {
    const fullPath = path.join(tmp, relPath);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, content);
  }
  return {
    tmp,
    cleanup: () => fs.rmSync(tmp, { recursive: true, force: true }),
  };
}

// ─── loadFeatureSpec Tests ────────────────────────────────────────────

test('loadFeatureSpec: missing feature directory returns error', () => {
  const { tmp, cleanup } = withProjectRoot({});
  try {
    const result = loadFeatureSpec(tmp, 'nonexistent');
    expect(result.ok).toBe(false);
    expect(String(result.err)).toContain('not found');
  } finally {
    cleanup();
  }
});

test('loadFeatureSpec: missing FEATURE.md returns error', () => {
  const { tmp, cleanup } = withProjectRoot({
    '.agents/features/my-feature/.gitkeep': '',
  });
  try {
    const result = loadFeatureSpec(tmp, 'my-feature');
    expect(result.ok).toBe(false);
    expect(String(result.err)).toContain('FEATURE.md');
  } finally {
    cleanup();
  }
});

test('loadFeatureSpec: parses valid FEATURE.md with frontmatter', () => {
  const featureMd = `---
name: auth-flow
description: User authentication flow
locked-phases: A,B
version: 1.0.0
---

# Auth Flow Feature

## Tasks

| ID | Name | Type | Status |
|----|------|------|--------|
| A001 | setup | execution | complete |
| A002 | review | review | pending |
`;

  const { tmp, cleanup } = withProjectRoot({
    '.agents/features/auth-flow/FEATURE.md': featureMd,
  });
  try {
    const result = loadFeatureSpec(tmp, 'auth-flow');
    expect(result.ok).toBe(true);
    const spec = /** @type {import('../feature-spec.js').FeatureSpec} */ (result.spec);
    expect(spec.featureName).toBe('auth-flow');
    expect(spec.lockedPhases).toEqual(['A', 'B']);
    expect(spec.taskTableRows.length).toBeGreaterThan(0);
  } finally {
    cleanup();
  }
});

// ─── findActivePhase Tests ───────────────────────────────────────────

test('findActivePhase: finds phase with pending tasks', () => {
  const featureMd = `---
name: test
locked-phases:
---

# Test

| ID | Name | Type | Status |
|----|------|------|--------|
| A001 | setup | execution | complete |
| A002 | review | review | pending |
`;

  const { tmp, cleanup } = withProjectRoot({
    '.agents/features/test/FEATURE.md': featureMd,
    '.agents/features/A/A001-setup/TASK.md': '---\nid: A001\nname: setup\ntype: execution\nstatus: complete\n---\nDone.',
    '.agents/features/A/A001-setup/MEMORY.md': '# MEMORY',
    '.agents/features/A/A002-review/TASK.md': '---\nid: A002\nname: review\ntype: review\nstatus: pending\n---\nReview.',
    '.agents/features/A/A002-review/MEMORY.md': '# MEMORY',
  });
  try {
    const loadResult = loadFeatureSpec(tmp, 'test');
    expect(loadResult.ok).toBe(true);
    const activePhase = findActivePhase(/** @type {import('../feature-spec.js').FeatureSpec} */ (loadResult.spec), []);
    expect(activePhase).toBeTruthy();
    expect(activePhase.phase).toBe('A');
    expect(activePhase.reviewTask).toBeTruthy();
    expect(activePhase.reviewTask.id).toBe('A002');
    // In feature-spec mode, review lives inside the task directory as REVIEW.md
    expect(activePhase.reviewTask.reviewFile).toBe(path.join(tmp, '.agents/features/test/A/A002-review/REVIEW.md'));
  } finally {
    cleanup();
  }
});

test('findActivePhase: skips locked phases', () => {
  const featureMd = `---
name: test
locked-phases: A
---

# Test

| ID | Name | Type | Status |
|----|------|------|--------|
| A001 | done | execution | complete |
| B001 | pending | execution | pending |
`;

  const { tmp, cleanup } = withProjectRoot({
    '.agents/features/test/FEATURE.md': featureMd,
    '.agents/features/A/A001-done/TASK.md': '---\nid: A001\nname: done\ntype: execution\nstatus: complete\n---\nDone.',
    '.agents/features/B/B001-pending/TASK.md': '---\nid: B001\nname: pending\ntype: execution\nstatus: pending\n---\nPending.',
  });
  try {
    const loadResult = loadFeatureSpec(tmp, 'test');
    expect(loadResult.ok).toBe(true);
    const activePhase = findActivePhase(/** @type {import('../feature-spec.js').FeatureSpec} */ (loadResult.spec), ['A']);
    expect(activePhase).toBeTruthy();
    expect(activePhase.phase).toBe('B');
  } finally {
    cleanup();
  }
});

test('findActivePhase: null when all phases complete or locked', () => {
  const featureMd = `---
name: test
locked-phases:
---

# Test

| ID | Name | Type | Status |
|----|------|------|--------|
| A001 | done | execution | complete |
`;

  const { tmp, cleanup } = withProjectRoot({
    '.agents/features/test/FEATURE.md': featureMd,
    '.agents/features/A/A001-done/TASK.md': '---\nid: A001\nname: done\ntype: execution\nstatus: complete\n---\nDone.',
  });
  try {
    const loadResult = loadFeatureSpec(tmp, 'test');
    expect(loadResult.ok).toBe(true);
    const activePhase = findActivePhase(/** @type {import('../feature-spec.js').FeatureSpec} */ (loadResult.spec), []);
    expect(activePhase).toBeNull();
  } finally {
    cleanup();
  }
});

// ─── Review Loop Counter Tests ───────────────────────────────────────

test('getReviewLoopCounter: returns 0 when file does not exist', () => {
  const { tmp, cleanup } = withProjectRoot({});
  try {
    const counter = getReviewLoopCounter(path.join(tmp, 'nonexistent', 'MEMORY.md'));
    expect(counter).toBe(0);
  } finally {
    cleanup();
  }
});

test('getReviewLoopCounter: returns max iteration from existing section', () => {
  const memoryMd = `# MEMORY

## Prior Work
Some notes here.

## Review Loop Counter
- Iteration 1: 3 findings found, 3 remediation tasks created
- Iteration 2: 1 findings found, 1 remediation task(s) created
`;

  const { tmp, cleanup } = withProjectRoot({
    'MEMORY.md': memoryMd,
  });
  try {
    const counter = getReviewLoopCounter(path.join(tmp, 'MEMORY.md'));
    expect(counter).toBe(2);
  } finally {
    cleanup();
  }
});

test('updateReviewLoopCounter: creates section if missing', () => {
  const { tmp, cleanup } = withProjectRoot({});
  try {
    const memoryPath = path.join(tmp, 'MEMORY.md');
    updateReviewLoopCounter(memoryPath, 1, 3, 3);
    const content = fs.readFileSync(memoryPath, 'utf8');
    expect(content).toContain('## Review Loop Counter');
    expect(content).toContain('Iteration 1: 3 finding(s) found, 3 remediation task(s) created');
  } finally {
    cleanup();
  }
});

test('updateReviewLoopCounter: appends to existing section', () => {
  const memoryMd = `# MEMORY

## Review Loop Counter
- Iteration 1: 3 findings found, 3 remediation tasks created
`;

  const { tmp, cleanup } = withProjectRoot({
    'MEMORY.md': memoryMd,
  });
  try {
    const memoryPath = path.join(tmp, 'MEMORY.md');
    updateReviewLoopCounter(memoryPath, 2, 1, 1);
    const content = fs.readFileSync(memoryPath, 'utf8');
    const lines = content.split('\n');
    const iterLines = lines.filter((l) => l.startsWith('- Iteration'));
    expect(iterLines.length).toBe(2);
    expect(iterLines[0]).toContain('Iteration 1');
    expect(iterLines[1]).toContain('Iteration 2');
  } finally {
    cleanup();
  }
});

// ─── extractFindings Tests ───────────────────────────────────────────

test('extractFindings: parses findings from review file', () => {
  const reviewFile = `# Adversarial Review: test

## Review Metadata
- **Max Attempts**: 3

## Findings

### Critical

#### F1 — Null pointer dereference
- **Severity**: Critical
- **Location**: \`src/auth.ts:42\`
- **Problem**: Accessing user without null check
- **Impact**: Crash on unauthenticated requests
- **Suggestion**: Add null guard before access
- **Status**: Open
- **Attempts**: 0
- **First Seen**: 1

### Discussion
<!-- Empty -->

### Major

#### F2 — Missing input validation
- **Severity**: Major
- **Location**: \`src/api.ts:15\`
- **Problem**: No validation on email field
- **Impact**: Malformed data stored in database
- **Suggestion**: Add email regex validation
- **Status**: In Review
- **Attempts**: 1
- **First Seen**: 1

### Discussion
[Fixer] added validation

## Summary
- **Open**: 1
- **In Review**: 1
- **Resolved**: 0
- **Won't Fix**: 0
- **Escalated**: 0
`;

  const { tmp, cleanup } = withProjectRoot({
    '.agents/reviews/test/001.md': reviewFile,
  });
  try {
    const findings = extractFindings(path.join(tmp, '.agents/reviews/test/001.md'));
    expect(findings.length).toBe(2);
    expect(findings[0].id).toBe('F1');
    expect(findings[0].severity).toBe('Critical');
    expect(findings[0].status).toBe('Open');
    expect(findings[1].id).toBe('F2');
    expect(findings[1].severity).toBe('Major');
    expect(findings[1].status).toBe('In Review');
  } finally {
    cleanup();
  }
});

test('extractFindings: filters out Resolved findings correctly', () => {
  const reviewFile = `# Adversarial Review: test

## Findings

### Critical

#### F1 — Fixed bug
- **Severity**: Critical
- **Location**: \`src/main.ts:10\`
- **Problem**: Bug was here
- **Impact**: Crash
- **Suggestion**: Fix it
- **Status**: Resolved
- **Attempts**: 2
- **First Seen**: 1

### Discussion
[Fixer] fixed it
[Reviewer] confirmed

## Summary
- **Open**: 0
- **In Review**: 0
- **Resolved**: 1
- **Won't Fix**: 0
- **Escalated**: 0
`;

  const { tmp, cleanup } = withProjectRoot({
    '.agents/reviews/test/001.md': reviewFile,
  });
  try {
    const findings = extractFindings(path.join(tmp, '.agents/reviews/test/001.md'));
    expect(findings.length).toBe(1);
    expect(findings[0].status).toBe('Resolved');
  } finally {
    cleanup();
  }
});

test('extractFindings: returns empty array for non-existent file', () => {
  const findings = extractFindings('/tmp/nonexistent-file-that-does-not-exist.md');
  expect(findings).toEqual([]);
});

// ─── createRemediationTasks Tests ────────────────────────────────────

test('createRemediationTasks: creates task directories with correct structure', () => {
  const findings = [
    { id: 'F1', severity: 'Critical', problem: 'Null pointer', status: 'Open', location: 'src/x.ts:1' },
    { id: 'F2', severity: 'Major', problem: 'Missing validation', status: 'In Review', location: 'src/y.ts:5' },
  ];

  const { tmp, cleanup } = withProjectRoot({});
  try {
    const { taskDirs, taskIds } = createRemediationTasks(
      findings,
      'A',
      'A099',
      'A098',
      path.join(tmp, '.agents/features/test'),
      '.agents/reviews/test/001.md',
    );

    expect(taskIds.length).toBe(2);
    expect(taskIds[0]).toBe('A100');
    expect(taskIds[1]).toBe('A101');
    expect(taskDirs.length).toBe(2);

    // Verify TASK.md exists and has correct content
    const task1Md = fs.readFileSync(path.join(taskDirs[0], 'TASK.md'), 'utf8');
    expect(task1Md).toContain('id: A100');
    expect(task1Md).toContain('type: defect');
    expect(task1Md).toContain('finding-ref: F1');
    expect(task1Md).toContain('depends-on: A098');
    expect(task1Md).toContain('originator: defect:A098');

    // Verify MEMORY.md exists
    const mem1Md = fs.readFileSync(path.join(taskDirs[0], 'MEMORY.md'), 'utf8');
    expect(mem1Md).toContain('Finding: F1');
    expect(mem1Md).toContain('Severity: Critical');
  } finally {
    cleanup();
  }
});

// ─── updateFeatureTaskTable Tests ────────────────────────────────────

test('updateFeatureTaskTable: appends rows to task table', () => {
  const featureMd = `---
name: test
---

# Test

| ID | Name | Type | Status |
|----|------|------|--------|
| A001 | setup | execution | complete |
| A002 | review | review | pending |
`;

  const { tmp, cleanup } = withProjectRoot({
    'FEATURE.md': featureMd,
  });
  try {
    const newTasks = [
      { id: 'A100', name: 'remediate-f1' },
      { id: 'A101', name: 'remediate-f2' },
    ];
    const updated = updateFeatureTaskTable(path.join(tmp, 'FEATURE.md'), newTasks);
    expect(updated).toBe(true);

    const content = fs.readFileSync(path.join(tmp, 'FEATURE.md'), 'utf8');
    expect(content).toContain('| A100 | remediate-f1 | defect | pending |');
    expect(content).toContain('| A101 | remediate-f2 | defect | pending |');
  } finally {
    cleanup();
  }
});

test('updateFeatureTaskTable: returns false for non-existent file', () => {
  const result = updateFeatureTaskTable('/tmp/nonexistent-feature.md', []);
  expect(result).toBe(false);
});

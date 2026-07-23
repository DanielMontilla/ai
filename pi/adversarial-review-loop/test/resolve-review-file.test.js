import { test, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { resolveReviewFile } from '../resolve-review-file.js';

/**
 * Creates a temp directory, runs the callback, then cleans up.
 */
function withTempDir(fn) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'review-test-'));
  try {
    return fn(tmp);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

test('resolveReviewFile: non-existent directory returns 001.md', () => {
  withTempDir((tmp) => {
    const result = resolveReviewFile(tmp, 'myreview', false);
    expect(result).toMatch(/\.agents\/reviews\/myreview\/001\.md$/);
  });
});

test('resolveReviewFile: empty directory (no .md files) returns 001.md', () => {
  withTempDir((tmp) => {
    const dir = path.join(tmp, '.agents/reviews/myreview');
    fs.mkdirSync(dir, { recursive: true });
    const result = resolveReviewFile(tmp, 'myreview', false);
    expect(result).toMatch(/\.agents\/reviews\/myreview\/001\.md$/);
  });
});

test('resolveReviewFile: existing reviews reuse highest code (re-review)', () => {
  withTempDir((tmp) => {
    const dir = path.join(tmp, '.agents/reviews/myreview');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, '001.md'), '# Review 1');
    fs.writeFileSync(path.join(dir, '002.md'), '# Review 2');
    const result = resolveReviewFile(tmp, 'myreview', false);
    expect(result).toMatch(/\.agents\/reviews\/myreview\/002\.md$/);
  });
});

test('resolveReviewFile: fresh flag forces next number', () => {
  withTempDir((tmp) => {
    const dir = path.join(tmp, '.agents/reviews/myreview');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, '001.md'), '# Review 1');
    fs.writeFileSync(path.join(dir, '002.md'), '# Review 2');
    const result = resolveReviewFile(tmp, 'myreview', true);
    expect(result).toMatch(/\.agents\/reviews\/myreview\/003\.md$/);
  });
});

test('resolveReviewFile: mixed filenames — regex matches last numeric sequence before .md', () => {
  withTempDir((tmp) => {
    const dir = path.join(tmp, '.agents/reviews/myreview');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'SPEC_001.md'), '# Spec review 1');
    fs.writeFileSync(path.join(dir, '003-review.md'), '# Review 3');
    // SPEC_001.md → regex /(\d+)(?:[^.]*)?\.md$/ matches "001"
    // 003-review.md → regex matches "003"
    const result = resolveReviewFile(tmp, 'myreview', false);
    expect(result).toMatch(/\.agents\/reviews\/myreview\/003\.md$/);
  });
});

test('resolveReviewFile: non-.md files are ignored', () => {
  withTempDir((tmp) => {
    const dir = path.join(tmp, '.agents/reviews/myreview');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, '001.md'), '# Review 1');
    fs.writeFileSync(path.join(dir, '099.txt'), 'not a review');
    fs.writeFileSync(path.join(dir, 'notes.md.bak'), 'backup file');
    const result = resolveReviewFile(tmp, 'myreview', false);
    expect(result).toMatch(/\.agents\/reviews\/myreview\/001\.md$/);
  });
});

test('resolveReviewFile: fresh with no matching nums falls back to 001', () => {
  withTempDir((tmp) => {
    const dir = path.join(tmp, '.agents/reviews/myreview');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'readme.md'), '# readme not numbered');
    const result = resolveReviewFile(tmp, 'myreview', true);
    // No .md files have numeric codes → nums.length === 0 → returns 001.md even with fresh
    expect(result).toMatch(/\.agents\/reviews\/myreview\/001\.md$/);
  });
});

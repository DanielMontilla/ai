import { test, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execSync } from 'node:child_process';

import { getCurrentGitBranch, validateFeatureSpecFromBranch } from '../index.js';

// ─── Helpers ──────────────────────────────────────────────────────────

/**
 * Creates a temp directory initialized as a git repo with the given branch name.
 */
function withGitRepo(branchName = 'feat/test-feature') {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'git-branch-test-'));
  execSync('git init', { cwd: tmp, stdio: 'ignore' });
  execSync('git config user.email "test@test.com"', { cwd: tmp, stdio: 'ignore' });
  execSync('git config user.name "Test"', { cwd: tmp, stdio: 'ignore' });
  
  // Create initial commit
  fs.writeFileSync(path.join(tmp, 'README.md'), '# Test');
  execSync('git add README.md', { cwd: tmp, stdio: 'ignore' });
  execSync('git commit -m "init"', { cwd: tmp, stdio: 'ignore' });
  
  // Create and checkout the feature branch
  if (branchName !== 'main') {
    execSync(`git checkout -b ${branchName}`, { cwd: tmp, stdio: 'ignore' });
  }
  
  return {
    tmp,
    cleanup: () => fs.rmSync(tmp, { recursive: true, force: true }),
  };
}

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

// ─── getCurrentGitBranch Tests ────────────────────────────────────────

test('getCurrentGitBranch: returns branch name for feat/* branch', () => {
  const { tmp, cleanup } = withGitRepo('feat/auth-flow');
  try {
    const branch = getCurrentGitBranch(tmp);
    expect(branch).toBe('feat/auth-flow');
  } finally {
    cleanup();
  }
});

test('getCurrentGitBranch: returns branch name for main branch', () => {
  const { tmp, cleanup } = withGitRepo('main');
  try {
    const branch = getCurrentGitBranch(tmp);
    expect(branch).toBe('main');
  } finally {
    cleanup();
  }
});

test('getCurrentGitBranch: returns null for detached HEAD', () => {
  const { tmp, cleanup } = withGitRepo('feat/test');
  try {
    // Get the commit hash
    const commitHash = execSync('git rev-parse HEAD', { cwd: tmp, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    // Checkout detached HEAD
    execSync(`git checkout ${commitHash}`, { cwd: tmp, stdio: 'ignore' });
    
    const branch = getCurrentGitBranch(tmp);
    expect(branch).toBeNull();
  } finally {
    cleanup();
  }
});

test('getCurrentGitBranch: returns null for non-git directory', () => {
  const { tmp, cleanup } = withProjectRoot({});
  try {
    const branch = getCurrentGitBranch(tmp);
    expect(branch).toBeNull();
  } finally {
    cleanup();
  }
});

// ─── validateFeatureSpecFromBranch Tests ──────────────────────────────

test('validateFeatureSpecFromBranch: returns specName for valid feat/* branch with feature dir', () => {
  const { tmp, cleanup } = withGitRepo('feat/auth-flow');
  try {
    // Create feature spec directory
    const featureDir = path.join(tmp, '.agents/features/auth-flow');
    fs.mkdirSync(featureDir, { recursive: true });
    fs.writeFileSync(path.join(featureDir, 'FEATURE.md'), '---\nname: auth-flow\n---\n# Auth Flow');
    
    const result = validateFeatureSpecFromBranch(tmp);
    expect(result.ok).toBe(true);
    expect(result.specName).toBe('auth-flow');
  } finally {
    cleanup();
  }
});

test('validateFeatureSpecFromBranch: fails when branch is not feat/* format', () => {
  const { tmp, cleanup } = withGitRepo('main');
  try {
    const result = validateFeatureSpecFromBranch(tmp);
    expect(result.ok).toBe(false);
    expect(result.err).toContain("does not match expected format 'feat/<feature-name>'");
  } finally {
    cleanup();
  }
});

test('validateFeatureSpecFromBranch: fails when branch is fix/* format', () => {
  const { tmp, cleanup } = withGitRepo('fix/bug-123');
  try {
    const result = validateFeatureSpecFromBranch(tmp);
    expect(result.ok).toBe(false);
    expect(result.err).toContain("does not match expected format 'feat/<feature-name>'");
  } finally {
    cleanup();
  }
});

test('validateFeatureSpecFromBranch: fails when feature directory does not exist', () => {
  const { tmp, cleanup } = withGitRepo('feat/nonexistent-feature');
  try {
    const result = validateFeatureSpecFromBranch(tmp);
    expect(result.ok).toBe(false);
    expect(result.err).toContain('Feature directory not found');
  } finally {
    cleanup();
  }
});

test('validateFeatureSpecFromBranch: fails when FEATURE.md does not exist', () => {
  const { tmp, cleanup } = withGitRepo('feat/auth-flow');
  try {
    // Create feature directory but no FEATURE.md
    const featureDir = path.join(tmp, '.agents/features/auth-flow');
    fs.mkdirSync(featureDir, { recursive: true });
    
    const result = validateFeatureSpecFromBranch(tmp);
    expect(result.ok).toBe(false);
    expect(result.err).toContain('FEATURE.md not found');
  } finally {
    cleanup();
  }
});

test('validateFeatureSpecFromBranch: fails for non-git directory', () => {
  const { tmp, cleanup } = withProjectRoot({});
  try {
    const result = validateFeatureSpecFromBranch(tmp);
    expect(result.ok).toBe(false);
    expect(result.err).toContain('Not a git repository');
  } finally {
    cleanup();
  }
});

test('validateFeatureSpecFromBranch: fails for detached HEAD', () => {
  const { tmp, cleanup } = withGitRepo('feat/test');
  try {
    const commitHash = execSync('git rev-parse HEAD', { cwd: tmp, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    execSync(`git checkout ${commitHash}`, { cwd: tmp, stdio: 'ignore' });
    
    const result = validateFeatureSpecFromBranch(tmp);
    expect(result.ok).toBe(false);
    expect(result.err).toContain('detached HEAD');
  } finally {
    cleanup();
  }
});
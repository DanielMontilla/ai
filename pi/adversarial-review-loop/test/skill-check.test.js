import { test, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { verifySkill, extractVersion, majorGte } from '../verify-skill.js';

/**
 * Creates a temp project root with skill directories and frontmatter content.
 */
function setupSkills(projectRoot, skillVersion, fixerVersion) {
  const skillDir = path.join(projectRoot, '.agents/skills/adversarial-review');
  const fixerDir = path.join(projectRoot, '.agents/skills/addressing-adversarial-review');
  fs.mkdirSync(skillDir, { recursive: true });
  fs.mkdirSync(fixerDir, { recursive: true });

  if (skillVersion != null) {
    fs.writeFileSync(
      path.join(skillDir, 'SKILL.md'),
      `---\nversion: ${skillVersion}\n---\n\nAdversarial review skill content.`,
    );
  } else {
    fs.writeFileSync(path.join(skillDir, 'SKILL.md'), 'No frontmatter here.');
  }

  if (fixerVersion != null) {
    fs.writeFileSync(
      path.join(fixerDir, 'SKILL.md'),
      `---\nversion: ${fixerVersion}\n---\n\nAddressing review skill content.`,
    );
  } else {
    fs.writeFileSync(path.join(fixerDir, 'SKILL.md'), 'No frontmatter here either.');
  }
}

test('extractVersion: extracts version from YAML frontmatter', () => {
  expect(extractVersion('---\nversion: 3.1.0\n---\nbody')).toBe('3.1.0');
});

test('extractVersion: returns null when no frontmatter', () => {
  expect(extractVersion('just plain text')).toBeNull();
});

test('extractVersion: returns null when frontmatter has no version field', () => {
  expect(extractVersion('---\ndescription: hello\n---\nbody')).toBeNull();
});

test('majorGte: returns true when a >= b by major version', () => {
  expect(majorGte('3.0.0', '3.0.0')).toBe(true);
  expect(majorGte('4.0.0', '3.0.0')).toBe(true);
  expect(majorGte('3.2.1', '3.0.0')).toBe(true);
});

test('majorGte: returns false when a < b by major version', () => {
  expect(majorGte('2.9.9', '3.0.0')).toBe(false);
  expect(majorGte('1.0.0', '2.0.0')).toBe(false);
});

test('verifySkill: both skills present with compatible versions returns ok', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-test-'));
  try {
    setupSkills(tmp, '3.2.0', '1.1.0');
    const result = verifySkill(tmp);
    expect(result.ok).toBe(true);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('verifySkill: missing adversarial-review skill returns error', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-test-'));
  try {
    setupSkills(tmp, null, '1.1.0');
    const result = verifySkill(tmp);
    expect(result.ok).toBe(false);
    expect(String(result.err)).toContain('.agents/skills/adversarial-review/SKILL.md');
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('verifySkill: missing addressing-adversarial-review skill returns error', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-test-'));
  try {
    setupSkills(tmp, '3.2.0', null);
    const result = verifySkill(tmp);
    expect(result.ok).toBe(false);
    expect(String(result.err)).toContain('.agents/skills/addressing-adversarial-review/SKILL.md');
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('verifySkill: incompatible adversarial-review version returns specific error', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-test-'));
  try {
    setupSkills(tmp, '2.5.0', '1.1.0');
    const result = verifySkill(tmp);
    expect(result.ok).toBe(false);
    expect(String(result.err)).toContain('adversarial-review skill version 2.5.0');
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('verifySkill: incompatible addressing-adversarial-review version returns specific error', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-test-'));
  try {
    setupSkills(tmp, '3.2.0', '0.9.0');
    const result = verifySkill(tmp);
    expect(result.ok).toBe(false);
    expect(String(result.err)).toContain('addressing-adversarial-review skill version 0.9.0');
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('verifySkill: both skills incompatible returns combined error', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-test-'));
  try {
    setupSkills(tmp, '2.0.0', '0.5.0');
    const result = verifySkill(tmp);
    expect(result.ok).toBe(false);
    const err = String(result.err);
    expect(err).toContain('adversarial-review skill version 2.0.0');
    expect(err).toContain('addressing-adversarial-review skill version 0.5.0');
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('verifySkill: no frontmatter on either skill is compatible (no version check)', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-test-'));
  try {
    setupSkills(tmp, null, null);
    const result = verifySkill(tmp);
    expect(result.ok).toBe(true);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

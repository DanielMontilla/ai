import fs from 'node:fs';
import path from 'node:path';

const SKILL_PATH = '.agents/skills/adversarial-review/SKILL.md';
const FIXER_SKILL_PATH = '.agents/skills/addressing-adversarial-review/SKILL.md';

/**
 * Extracts the 'version' field from YAML frontmatter (--- delimited).
 * Returns null if no frontmatter or no version field found.
 * @param {string} content
 * @returns {string | null}
 */
export function extractVersion(content) {
  const m = content.match(/^---\n([\s\S]*?)\n---/);
  if (!m) return null;
  const vm = m[1].match(/^version:\s*(.+)$/m);
  return vm ? vm[1].trim() : null;
}

/**
 * Compares two semver strings by major version only.
 * Returns true when `a` >= `b`.
 * @param {string} a
 * @param {string} b
 * @returns {boolean}
 */
export function majorGte(a, b) {
  const aMajor = parseInt(a.split('.')[0], 10);
  const bMajor = parseInt(b.split('.')[0], 10);
  return !isNaN(aMajor) && !isNaN(bMajor) && aMajor >= bMajor;
}

/**
 * @param {string} cwd - Project root
 * @returns {{ ok: boolean, err?: string }}
 */
export function verifySkill(cwd) {
  const skillPath = path.join(cwd, SKILL_PATH);
  const fixerSkillPath = path.join(cwd, FIXER_SKILL_PATH);

  if (!fs.existsSync(skillPath) || !fs.existsSync(fixerSkillPath)) {
    return {
      ok: false,
      err: `Required skills not found at ${SKILL_PATH} or ${FIXER_SKILL_PATH}. Run from a project with both skills installed.`,
    };
  }

  const skillContent = fs.readFileSync(skillPath, 'utf8');
  const fixerContent = fs.readFileSync(fixerSkillPath, 'utf8');

  const skillVersion = extractVersion(skillContent);
  const fixerVersion = extractVersion(fixerContent);

  const issues = [];
  if (skillVersion && !majorGte(skillVersion, '3.0.0')) {
    issues.push(`adversarial-review skill version ${skillVersion} < 3.0.0 — update required`);
  }
  if (fixerVersion && !majorGte(fixerVersion, '1.0.0')) {
    issues.push(`addressing-adversarial-review skill version ${fixerVersion} < 1.0.0 — update required`);
  }

  if (issues.length > 0) {
    return { ok: false, err: `Version incompatibilities:\n  - ${issues.join('\n  - ')}` };
  }

  return { ok: true };
}

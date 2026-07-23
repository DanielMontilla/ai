import fs from 'node:fs';
import path from 'node:path';

/**
 * Resolve the review file path. Per the adversarial-review skill Step 0:
 * - If the directory exists and contains `.md` files and `fresh` is false,
 *   reuse the highest existing numeric code (re-review, overwrite in place).
 * - Otherwise start at the next unused code (`001` if new, else highest+1).
 *
 * Numeric portion is extracted via a flexible regex that matches the
 * last numeric sequence anywhere in the filename before `.md`, so files
 * like `001-review.md`, `review-001.md`, and `SPEC_001.md` are all handled
 * per the skill's spec ("find the highest existing numeric portion of any
 * filename ignoring non-numeric prefixes").
 *
 * @param {string} cwd
 * @param {string} reviewName
 * @param {boolean} fresh
 * @returns {string} Absolute path to the review file
 */
export function resolveReviewFile(cwd, reviewName, fresh) {
  const dir = path.join(cwd, '.agents/reviews', reviewName);
  if (!fs.existsSync(dir)) return path.join(dir, '001.md');

  const nums = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.md'))
    .map((f) => {
      const m = f.match(/(\d+)(?:[^.]*)?\.md$/);
      return m ? parseInt(m[1], 10) : null;
    })
    .filter((n) => n !== null);

  if (nums.length === 0) return path.join(dir, '001.md');

  const highest = Math.max(...nums);
  const code = fresh ? highest + 1 : highest;
  return path.join(dir, `${String(code).padStart(3, '0')}.md`);
}

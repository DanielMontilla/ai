import fs from 'node:fs';
import path from 'node:path';
import { REVIEWER_SYSTEM, FIXER_SYSTEM, TOOLS } from './agents.js';
import { runAgent, createPersistentAgent } from './runner.js';
import { parseSummary, isAllTerminal } from './parse-summary.js';
import { resolveReviewFile } from './resolve-review-file.js';
import { verifySkill } from './verify-skill.js';
import {
  loadFeatureSpec,
  findActivePhase,
  getReviewLoopCounter,
  updateReviewLoopCounter,
  extractFindings,
  createRemediationTasks,
  updateFeatureTaskTable,
  executeRemediations,
} from './feature-spec.js';

/**
 * @typedef {{ reviewerModel: string, fixerModel: string, maxLoops: number, targetDir: string, reviewName: string, fresh: boolean, featureSpec: boolean, specName: string }} LoopOptions
 */
/**
 * @typedef {{ ok: true, opts: LoopOptions } | { ok: false, err: unknown }} ParsedOptions
 */

/** @type {string} */
const DEFAULT_REVIEWER = 'deepseek-v4-pro';

/** @type {string} */
const DEFAULT_FIXER = 'deepseek-v4-flash-free';

/** @type {number} */
const DEFAULT_DEPTH = 5;

/** @type {number} */
const MAX_CONSECUTIVE_FAILURES = 2;

/** @type {number} */
const REVIEWER_TIMEOUT = 900000;

/** @type {number} */
const FIXER_TIMEOUT = 600000;

/** @type {number} */
const MAX_REVIEW_LOOP_ITERATIONS = 5;

/** @type {string} */
const SKILL_PATH = '.agents/skills/adversarial-review/SKILL.md';

/** @type {string} */
const FIXER_SKILL_PATH = '.agents/skills/addressing-adversarial-review/SKILL.md';

/**
 * @param {string} args - Raw argument string
 * @param {string} cwd - Default working directory
 * @returns {LoopOptions}
 */
function parseOptions(args, cwd) {
  /** @type {Record<string, string>} */
  const map = {};
  for (const token of args.split(/\s+/)) {
    const m = token.match(/^--(\w[\w-]*)=(.+)/);
    if (m) map[m[1]] = m[2];
  }

  const featureSpec = map['feature-spec'] === 'true' || map['feature-spec'] === '1';
  const specName = map['spec-name'];

  if (featureSpec && !specName) {
    throw new Error('--feature-spec requires --spec-name');
  }

  return {
    reviewerModel: map['reviewer-model'] ?? DEFAULT_REVIEWER,
    fixerModel: map['fixer-model'] ?? DEFAULT_FIXER,
    maxLoops: parseInt(map['max-loops'] ?? map['depth'] ?? String(DEFAULT_DEPTH), 10),
    targetDir: map['target-dir'] ?? map['dir'] ?? cwd,
    reviewName: map['name'] ?? 'adversarial',
    fresh: map['fresh'] === 'true' || map['fresh'] === '1',
    featureSpec,
    specName: specName ?? '',
  };
}

/**
 * Parse options, capturing errors as a discriminated union so the caller
 * gets a fully-typed `LoopOptions` after the `ok` check (no `Object` widenings).
 * @param {string} args
 * @param {string} cwd
 * @returns {ParsedOptions}
 */
function tryParseOptions(args, cwd) {
  try {
    return { ok: true, opts: parseOptions(args, cwd) };
  } catch (err) {
    return { ok: false, err };
  }
}


/**
 * Parse the `## Summary` block of a review file. Returns null if the file
 * is missing or unparseable. Used to detect the all-terminal termination
 * condition (no `Open`/`In Review`/`Escalated` findings remain). Lives in
 * `parse-summary.js` so it can be unit-tested in isolation — see
 * `test/parse-summary.test.js` (regression coverage for finding F15).
 */

/**
 * @param {number} cycle
 * @param {number} total
 * @param {string} phase
 * @param {string} status
 * @returns {string}
 */
function statusLine(cycle, total, phase, status) {
  return `● adversarial-review-loop [${cycle}/${total}] ${phase}: ${status}`;
}

/**
 * @param {import('@earendil-works/pi-coding-agent').ExtensionAPI} pi
 */
export default function adversarialReviewLoopExtension(pi) {
  pi.registerCommand('adversarial-review-loop', {
    description:
      'Run an adversarial review loop: reviewer (heavy) → fixer (cheap) cycle, ' +
      'coordinating through a shared review file — standalone mode uses ' +
      '.agents/reviews/<name>/<code>.md; feature-spec mode uses <task-dir>/REVIEW.md. ' +
      'Uses the adversarial-review v3 per-finding protocol (Status/Attempts/Discussion).',
    handler: async (args, ctx) => {
      const parsed = tryParseOptions(args, ctx.cwd);
      if (!parsed.ok) {
        ctx.ui.notify(
          (parsed.err instanceof Error ? parsed.err.message : String(parsed.err)),
          'error',
        );
        return;
      }
      const opts = parsed.opts;

      const skillCheck = verifySkill(ctx.cwd);
      if (!skillCheck.ok) {
        ctx.ui.notify(skillCheck.err, 'error');
        return;
      }
      ctx.ui.notify(
        '[adversarial-review-loop] Verified: adversarial-review + addressing-adversarial-review skills present.',
        'info',
      );

      // Feature-spec mode setup (must happen before reviewFile resolution)
      /** @type {{ spec: import('./feature-spec.js').FeatureSpec, phase: { phase: string, phaseDir: string, reviewTask: { id: string, memoryPath: string, reviewFile: string } | null, highestTaskId: string } } | null} */
      let featureSpecCtx = null;
      if (opts.featureSpec) {
        const loadResult = loadFeatureSpec(ctx.cwd, opts.specName);
        if (!loadResult.ok) {
          ctx.ui.notify(loadResult.err, 'error');
          return;
        }
        const activePhase = findActivePhase(loadResult.spec, loadResult.spec.lockedPhases);
        if (!activePhase) {
          ctx.ui.notify(
            `[adversarial-review-loop] No active phase found for feature '${opts.specName}'. All phases may be complete or locked.`,
            'warning',
          );
          return;
        }
        if (!activePhase.reviewTask) {
          ctx.ui.notify(
            `[adversarial-review-loop] Active phase ${activePhase.phase} has no review task. Cannot run feature-spec mode.`,
            'error',
          );
          return;
        }
        featureSpecCtx = { spec: loadResult.spec, phase: activePhase };
        ctx.ui.notify(
          `[adversarial-review-loop] Feature-spec mode: '${opts.specName}', active phase=${activePhase.phase}, review task=${activePhase.reviewTask.id}`,
          'info',
        );
      }

      const reviewFile = opts.featureSpec
        ? (featureSpecCtx?.phase.reviewTask?.reviewFile ?? resolveReviewFile(ctx.cwd, opts.reviewName, opts.fresh))
        : resolveReviewFile(ctx.cwd, opts.reviewName, opts.fresh);
      const reReview = fs.existsSync(reviewFile) && !opts.fresh;

      ctx.ui.setStatus('adversarial-review-loop', '● starting');
      ctx.ui.notify(
        `[adversarial-review-loop] file=${reviewFile} reReview=${reReview} ` +
          `reviewer=${opts.reviewerModel} fixer=${opts.fixerModel} ` +
          `depth=${opts.maxLoops} dir=${opts.targetDir}`,
        'info',
      );

      let cycle = 0;
      let reviewerConsecutiveFailures = 0;
      let fixerConsecutiveFailures = 0;

      // Reviewer persists across cycles — same context remembers prior findings.
      // The reviewer writes the review file directly (Step 8 / Step 9 of the skill).
      /** @type {import('./runner.js').PersistentAgent | undefined} */
      let reviewer;

      try {
        reviewer = await createPersistentAgent({
          model: opts.reviewerModel,
          systemPrompt: REVIEWER_SYSTEM,
          tools: TOOLS.reviewer,
          cwd: ctx.cwd,
        }, REVIEWER_TIMEOUT);
        while (cycle < opts.maxLoops) {
          cycle++;

          // --- REVIEWER ---
          ctx.ui.setStatus(
            'adversarial-review-loop',
            statusLine(cycle, opts.maxLoops, 'reviewer', 'running'),
          );
          console.log(
            `\n[adversarial-review-loop] Cycle ${cycle}/${opts.maxLoops} — Reviewer ` +
              (cycle === 1 && !reReview ? '(fresh review)' : '(re-review Step 9)'),
          );

const reReviewPrefix = cycle > 3
            ? 'Your context has grown across multiple cycles. Before re-reviewing, briefly summarize the key prior findings (by ID) and their current status from the review file. Then proceed with the re-review.\n\n'
            : '';

          const reviewerTask =
            cycle === 1 && !reReview
              ? `Perform a thorough adversarial review of ${opts.targetDir}. `
                `Load and follow the adversarial-review skill at ${SKILL_PATH}; `
                `write the report to ${reviewFile} using its standard file structure. `
                'Audit Steps 2–7 of the skill; lead with the highest-severity findings. '
                'If no defects are found, state "No defects found." and list coverage areas.'
              : reReviewPrefix +
                `Re-review the existing review file at ${reviewFile} by executing `
                `Step 9 of the adversarial-review skill at ${SKILL_PATH}. `
                'Read only that file; scope to non-terminal findings (Open, In Review, Escalated '
                'only if a [Human] turn resolved the escalation); verify each In Review finding '
                `against the actual code at ${opts.targetDir} (never trust [Fixer] turns as evidence); `
                'hunt Steps 2–7 for regressions; bump Iteration; append [Reviewer] turns; '
                'overwrite the file in place. Do NOT touch Attempts.';

          const preReviewMtime = fs.existsSync(reviewFile)
            ? fs.statSync(reviewFile).mtimeMs
            : null;

          const reviewResult = await reviewer.prompt(reviewerTask, REVIEWER_TIMEOUT);

          if (reviewResult.error) {
            const postReviewStat = fs.existsSync(reviewFile) ? fs.statSync(reviewFile) : null;
            const reviewUpdated = postReviewStat && postReviewStat.mtimeMs > (preReviewMtime ?? 0);
            if (reviewUpdated) {
              console.log(
                `[adversarial-review-loop] Reviewer reported error but review file was updated — assuming success.`,
              );
              reviewerConsecutiveFailures = 0;
            } else {
              ctx.ui.notify(`Reviewer error: ${reviewResult.error}`, 'error');
              reviewerConsecutiveFailures++;
              if (reviewerConsecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
                ctx.ui.notify(
                  `Reviewer failed ${reviewerConsecutiveFailures} consecutive times. Escalating to human.`,
                  'error',
                );
                ctx.ui.setStatus('adversarial-review-loop', '● adversarial-review-loop FAILED');
                return;
              }
              continue;
            }
          }

          // Detect termination via the file's Summary block, not a STATUS line.
          const summary = parseSummary(reviewFile);
          if (isAllTerminal(summary)) {
            console.log(
              `[adversarial-review-loop] Reviewer: all findings terminal ` +
                `(Resolved=${summary?.resolved}, Won't Fix=${summary?.wontFix}). Closing loop.`,
            );
            ctx.ui.setStatus('adversarial-review-loop', '● adversarial-review-loop DONE');
            ctx.ui.notify('[adversarial-review-loop] Completed: all findings resolved or dismissed.', 'info');
            return;
          }

          if (summary && summary.open === 0 && summary.inReview === 0 && summary.escalated > 0) {
            console.log(
              '[adversarial-review-loop] Only Escalated findings remain — surfacing to human.',
            );
            ctx.ui.notify(
              `[adversarial-review-loop] ${summary.escalated} escalated finding(s) need human input. Review file: ${reviewFile}`,
              'warning',
            );
            ctx.ui.setStatus('adversarial-review-loop', '● adversarial-review-loop ESCALATED');
            return;
          }

          reviewerConsecutiveFailures = 0; // agent succeeded this cycle

          // --- FEATURE-SPEC BRANCH: if in feature-spec mode, handle findings ---
          if (featureSpecCtx && summary && !isAllTerminal(summary)) {
            const reviewLoopIter = getReviewLoopCounter(featureSpecCtx.phase.reviewTask.memoryPath);
            if (reviewLoopIter >= MAX_REVIEW_LOOP_ITERATIONS) {
              ctx.ui.notify(
                `[adversarial-review-loop] Review loop cap reached (${MAX_REVIEW_LOOP_ITERATIONS} iterations). Halting feature-spec mode with unresolved findings.`,
                'error',
              );
              ctx.ui.setStatus('adversarial-review-loop', '● adversarial-review-loop REVIEW CAP REACHED');
              return;
            }

            // Extract non-terminal findings
            const allFindings = extractFindings(reviewFile);
            const acceptedFindings = allFindings.filter((f) => f.status !== 'Resolved' && f.status !== "Won't Fix");

            if (acceptedFindings.length === 0) {
              // All findings are terminal — advance the loop counter and continue
              updateReviewLoopCounter(
                featureSpecCtx.phase.reviewTask.memoryPath,
                reviewLoopIter + 1,
                0,
                0,
              );
              console.log(
                `[adversarial-review-loop] Feature-spec: iteration ${reviewLoopIter + 1} found no new findings. Loop closed.`,
              );
              reviewerConsecutiveFailures = 0;
              continue;
            }

            // Create remediation tasks for all accepted findings
            const nextNum = parseInt(featureSpecCtx.phase.highestTaskId.replace(/[A-Z]/g, ''), 10) + 1;
            const newHighestId = `${featureSpecCtx.phase.phase}${String(nextNum).padStart(3, '0')}`;

            const { taskDirs, taskIds } = createRemediationTasks(
              acceptedFindings,
              featureSpecCtx.phase.phase,
              featureSpecCtx.phase.highestTaskId,
              featureSpecCtx.phase.reviewTask.id,
              featureSpecCtx.spec.featureDir,
              reviewFile,
            );

            // Update FEATURE.md task table
            const featureMdPath = path.join(featureSpecCtx.spec.featureDir, 'FEATURE.md');
            const newTasks = taskIds.map((id, i) => ({
              id,
              name: `remediate-${acceptedFindings[i].id.toLowerCase()}`,
            }));
            updateFeatureTaskTable(featureMdPath, newTasks);

            // Update review loop counter
            updateReviewLoopCounter(
              featureSpecCtx.phase.reviewTask.memoryPath,
              reviewLoopIter + 1,
              acceptedFindings.length,
              taskIds.length,
            );

            console.log(
              `[adversarial-review-loop] Feature-spec: created ${taskIds.length} remediation task(s) for ${acceptedFindings.length} finding(s). Task IDs: ${taskIds.join(', ')}`,
            );

            // Execute remediations via fixer
            ctx.ui.setStatus(
              'adversarial-review-loop',
              statusLine(cycle, opts.maxLoops, 'fixer-remediation', `remediating ${taskIds.length} tasks`),
            );
            console.log(
              `[adversarial-review-loop] Cycle ${cycle}/${opts.maxLoops} — Fixer remediating ${taskIds.length} finding(s)`,
            );

            const remediationResult = await executeRemediations(
              opts.targetDir,
              reviewFile,
              ctx.cwd,
              opts.fixerModel,
            );

            if (remediationResult.failed > 0) {
              fixerConsecutiveFailures++;
              if (fixerConsecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
                ctx.ui.notify(
                  `Fixer failed ${fixerConsecutiveFailures} consecutive times during remediation. Escalating to human.`,
                  'error',
                );
                ctx.ui.setStatus('adversarial-review-loop', '● adversarial-review-loop FAILED');
                return;
              }
            } else {
              fixerConsecutiveFailures = 0;
            }

            // Continue to next cycle — reviewer will re-check
            continue;
          }

          // --- FIXER ---
          ctx.ui.setStatus(
            'adversarial-review-loop',
            statusLine(cycle, opts.maxLoops, 'fixer', 'running'),
          );
          console.log(`[adversarial-review-loop] Cycle ${cycle}/${opts.maxLoops} — Fixer`);

          const fixerTask =
            `Resolve the findings in the review file at ${reviewFile}. ` +
            `Load and follow the addressing-adversarial-review skill at ${FIXER_SKILL_PATH} ` +
            'as your governing pipeline: triage findings by Status, enforce the per-finding ' +
            'Attempts ceiling (Max Attempts from Review Metadata, default 3), apply minimal ' +
            'fixes in severity order to the code under ' +
            `${opts.targetDir}, verify with the repo real checks (typecheck/lint/tests), ` +
            'increment Attempts per attempt, set Status to In Review after local verification ' +
            'passes (or leave Open on failure), append [Fixer] turns to each finding\'s ' +
            '### Discussion thread, and overwrite the review file in place. ' +
            'Do NOT touch Iteration or any reviewer-authored field. Escalate findings at the ceiling.';

          const preFixMtime = fs.existsSync(reviewFile)
            ? fs.statSync(reviewFile).mtimeMs
            : null;

          const fixResult = await runAgent({
            model: opts.fixerModel,
            systemPrompt: FIXER_SYSTEM,
            task: fixerTask,
            tools: TOOLS.fixer,
            cwd: ctx.cwd,
          }, FIXER_TIMEOUT);

          if (fixResult.error) {
            const postFixStat = fs.existsSync(reviewFile) ? fs.statSync(reviewFile) : null;
            const fixUpdated = postFixStat && postFixStat.mtimeMs > (preFixMtime ?? 0);
            if (fixUpdated) {
              console.log(
                `[adversarial-review-loop] Fixer reported error but review file was updated — assuming success.`,
              );
              fixerConsecutiveFailures = 0;
            } else {
              ctx.ui.notify(`Fixer error: ${fixResult.error}`, 'error');
              fixerConsecutiveFailures++;
              if (fixerConsecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
                ctx.ui.notify(
                  `Fixer failed ${fixerConsecutiveFailures} consecutive times. Escalating to human.`,
                  'error',
                );
                ctx.ui.setStatus('adversarial-review-loop', '● adversarial-review-loop FAILED');
                return;
              }
              continue;
            }
          }

          fixerConsecutiveFailures = 0; // agent succeeded this cycle

          // If the fixer left nothing for the reviewer (everything terminal),
          // the next reviewer cycle will detect it; cheaper to peek now.
          const postFix = parseSummary(reviewFile);
          if (postFix && isAllTerminal(postFix)) {
            console.log('[adversarial-review-loop] Fixer advanced all findings to terminal status.');
          }
        }

        ctx.ui.setStatus('adversarial-review-loop', undefined);
        ctx.ui.notify(
          `[adversarial-review-loop] Max loops (${opts.maxLoops}) reached. Review file: ${reviewFile}`,
          'warning',
        );
      } finally {
        reviewer?.dispose();
      }
    },
  });
}
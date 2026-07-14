---
name: authoring-feature-spec
description: Authors a phased feature specification with typed tasks and validation gates. Use when user wants to spec a new feature or rewrite an existing plan in the current workspace.
author: Daniel Montilla
version: 3.2.0
license: MIT
dependencies:
  - caveman-compression
  - grilling
  - finding-references
  - executing-skills
groups:
  - skills
  - feature-spec
  - planning
---

# When To Use

When a user asks to spec a new feature, break a feature into actionable phases and tasks, or when initial requirements are vague and require structuring before execution.

> **Prerequisite**: Load the [executing-skills](../executing-skills/SKILL.md) skill before running this pipeline. It governs how skills are loaded, executed, and verified.

# Pipeline

## 0. Redirect if in non-feature worktree

This skill authors specs in-place (current workspace). If the agent is inside a non-feature git worktree (e.g., `development`), delegate to the worktree variant instead.

```bash
GIT_DIR=$(cd "$(git rev-parse --git-dir)" 2>/dev/null && pwd -P)
GIT_COMMON=$(cd "$(git rev-parse --git-common-dir)" 2>/dev/null && pwd -P)
SUBMODULE=$(git rev-parse --show-superproject-working-tree 2>/dev/null)
BRANCH=$(git branch --show-current)
```

- **Not in a worktree** (`GIT_DIR == GIT_COMMON` or `SUBMODULE` is non-empty): continue with this skill (in-place authoring).
- **In a feature worktree** (`GIT_DIR != GIT_COMMON`, no submodule, `BRANCH` starts with `feat/`): already isolated — continue with this skill.
- **In a non-feature worktree** (`GIT_DIR != GIT_COMMON`, no submodule, `BRANCH` does not start with `feat/`): load [authoring-feature-spec-in-worktree](../authoring-feature-spec-in-worktree/SKILL.md) instead. That skill handles worktree-isolated workflows. Do not continue here.

## 1. Gather Context

### Collect requirements

Systematically collect what the user provided and what is missing.

For each mandatory field:
- **name** (kebab-case): If missing, ASK. If context exists (description, requirements), suggest a name.
- **description**: If missing, ASK. Encourage a concise problem statement.
- **requirements**: If missing, ASK. Help user articulate what success looks like.
- **goals**: If missing, ASK. What should be different when done?

Do NOT proceed until all mandatory fields are filled. Offer recommendations whenever possible.

**CRITICAL**: Load the [grilling](../grilling/SKILL.md) skill to deeply question the user. Resolve all ambiguities before moving to step 2.

## 2. Design Phases & Task Types

Organize the workload into sequential **Phases** (Phase A, Phase B, Phase C). 
- Phases must be executed sequentially (Phase B cannot start until Phase A is 100% complete and user-approved).
- Tasks within the same Phase can be executed in parallel.

Assign a specific `type` to every task. The type dictates how the executor agent behaves:
- `exploratory`: Explores codebase, reads context. Reference `finding-references` skill when reference source code or docs exist locally. Can ask the user or use web search.
- `execution`: Modifies code. May optionally include `GATES.md` for validation checks.
- `planning`: Ingests context from exploratory tasks (via MEMORY.md) and plans next steps. Can spawn tasks, update plans, or ask questions.
- `interruptor`: Critical decision point. Halts and asks the user for a required decision before proceeding.
- `defect`: Fixes bugs from phase reviews. Appended at execution time by defect management — not authored upfront. Treated like execution, focused on `related-tasks`.
- `review`: Runs an adversarial review of a completed phase. **Highly recommended** to delegate this to an independent subagent (separate from the main working agent) so the review is unbiased and free of author blind spots. The subagent executes the [adversarial-review](../adversarial-review/SKILL.md) skill and writes its findings to `REVIEW.md` in the task directory. After the human reviews `REVIEW.md`, a new set of remediation tasks (typically `defect` / `execution`) is authored for that phase to close the issues. The `review` task blocks phase completion until the human has reviewed `REVIEW.md` and accepted or dismissed each finding.

All tasks manage their own progress in a `MEMORY.md` file — track context, decisions, completion criteria, and handoff info for subsequent phases.

Naming format:
- Feature dir: `.agents/features/<kebab-name>/`
- Task dir: `<PHASE_LETTER><NN>-<kebab-task-name>/` (e.g., `A01-explore-auth`, `B01-implement-login`)

### Phase-end review tasks

**Highly recommended**: end every Phase with a `review` task (e.g., `A99-review-phase`, `B99-review-phase`). This task delegates to an independent subagent that runs the [adversarial-review](../adversarial-review/SKILL.md) skill over the just-completed phase and records findings in the task's `REVIEW.md`. The phase must not be marked complete, and the next phase must not start, until:

1. The independent subagent has written `REVIEW.md`.
2. The human has reviewed `REVIEW.md` and accepted or dismissed each finding.
3. A remediation task set (`defect` / `execution`) has been authored for the accepted findings, and those tasks are either complete or tracked as pending work for the next phase.

Keep the `review` task's subagent **independent from the main working agent** — it must not be the agent that authored or executed the phase under review, to avoid author blind spots.

## 3. Design Gates

A **gate** is a validation checklist that verifies correctness before a task is considered complete. Gates are organized into sequential phases; checks within a phase can run in parallel. If any check fails, stop, fix the issue, and re-run. Log the failure in `MEMORY.md` under **Deviations** — document what failed, why, and what was changed.

Any task type may include a `GATES.md` — not just execution. A planning task might have gates that verify facts; an exploratory task might gate on coverage of all relevant areas. Execution gates commonly include standard checks: `format:check`, `lint:check`, `ts:check`, and `test` when applicable.

If a task needs gates, create `<task-dir>/GATES.md`.

## 4. Generate Files

Create `.agents/features/<feature-name>/` and subdirectories.
Generate files from templates:
- `FEATURE.md` — feature metadata, description, requirements, task table
- `TASK.md` + `MEMORY.md` per task directory
- `REVIEW.md` for each `review` task (see [templates/REVIEW.md](templates/REVIEW.md)) — populated by the independent subagent after the phase completes
- `GATES.md` when a task requires validation gates (see [templates/GATES.md](templates/GATES.md))

When generating `TASK.md`, prune the `Completion` checklist to include only the items relevant to the assigned task `type`.
Apply `caveman-compression` to generated file **content** — strip stop words, condense prose while preserving meaning. Templates provide structure; actual generated prose should be compressed.

## 5. Review & Refine

Show the user the generated directory tree, phase breakdown, task types, and gates. Ask for approval or changes. Iterate until the user is satisfied.

# Frontmatter Reference

## FEATURE.md

| Field | Values | Description |
|---|---|---|
| `name` | `<kebab-case>` | Feature name, matches directory name |
| `status` | `in-progress` / `complete` | `complete` when all phases done |
| `workspace-type` | `worktree` or `in-place` | How work is isolated |
| `author` | `<name>` | User-provided or `git config user.name` |
| `created` | `<date>` | ISO date of spec creation |

## TASK.md

| Field | Values | Description |
|---|---|---|---|
| `id` | `<LETTER><NN>` e.g. `A01`, `B02` | Phase letter + zero-padded number |
| `name` | `<kebab-case>` | Short task name matching directory |
| `type` | `exploratory` / `execution` / `planning` / `interruptor` / `defect` / `review` | Determines executor behavior |
| `originator` | `user` / `defect` / `defect:<id>` / `planner:<id>` | Who created this task |
| `depends-on` | `<task-ids>` | Comma-separated task IDs this blocks on |
| `related-tasks` | `<task-ids>` | Comma-separated task IDs this fixes (only for `defect` type) |
| `status` | `pending` / `in-progress` / `complete` / `blocked` | Current task state (see Status enum below) |

## Status Enum (canonical — single source of truth)

All feature-spec skills (`authoring-feature-spec`, `executing-feature-spec`) MUST use exactly this status vocabulary. No skill may invent additional values:

| Status | Meaning |
|---|---|
| `pending` | Not yet started |
| `in-progress` | Currently being worked |
| `complete` | All completion criteria met |
| `blocked` | Cannot proceed — awaiting an external decision, dependency, or unresolved defect sub-tasks. A parent task whose `defect` sub-tasks are open is `blocked`, never `defect`. |

> **Note**: `defect` is a task **type**, not a status. A task blocked by open defects keeps `type` describing its work and `status: blocked`; the open `type: defect` children explain why. Do not set `status: defect` anywhere.

## MEMORY.md

No frontmatter. Free-form sections: Context, Progress, Open Questions, Handoff, Deviations.

## REVIEW.md

No frontmatter. Artifact written by a `review` task's independent subagent after running the [adversarial-review](../adversarial-review/SKILL.md) skill. Free-form sections: Scope Reviewed, Findings (severity + `file_path:line` + problem + impact + suggestion), Accepted/Dismissed tally, Remediation Task IDs. Created from [templates/REVIEW.md](templates/REVIEW.md).

## GATES.md

No frontmatter. Plain validation checklists organized in sequential phases.

# Reference

- **[templates/](templates/)** — File templates: `FEATURE.md`, `TASK.md`, `MEMORY.md`, `GATES.md` (MUST READ)
- **[executing-feature-spec](../executing-feature-spec/SKILL.md)** — Executor logic for task types and phase interruptions




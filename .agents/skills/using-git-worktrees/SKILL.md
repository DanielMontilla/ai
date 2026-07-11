---
name: using-git-worktrees
description: Use starting feature work needs isolation from current workspace or before executing implementation plans - ensures isolated workspace exists via native tools or git worktree fallback
version: 1.1.0
dependencies:
  - executing-skills
groups:
  - git
  - workflow
---

# When To Use

Use when starting feature work that needs isolation from the current workspace, or before executing implementation plans.

> **Prerequisite**: Load the [executing-skills](../executing-skills/SKILL.md) skill before running this pipeline. It governs how skills are loaded, executed, and verified.

# Using Git Worktrees

## Overview

Work happens in isolated workspace. Prefer platform native worktree tools. Fall back to manual git worktrees only when no native tool available.

**Core principle:** Detect existing isolation first. Use native tools. Fall back to git. Never fight harness.

**Announce at start:** "I'm using using-git-worktrees skill to set up isolated workspace."

## Step 0: Detect Existing Isolation

**Before creating anything, check if already in isolated workspace.**

```bash
GIT_DIR=$(cd "$(git rev-parse --git-dir)" 2>/dev/null && pwd -P)
GIT_COMMON=$(cd "$(git rev-parse --git-common-dir)" 2>/dev/null && pwd -P)
BRANCH=$(git branch --show-current)
```

**Submodule guard:** `GIT_DIR != GIT_COMMON` also true inside git submodules. Before concluding "already in a worktree," verify not in submodule:

```bash
# If returns path, in submodule, not worktree — treat as normal repo
git rev-parse --show-superproject-working-tree 2>/dev/null
```

**If `GIT_DIR != GIT_COMMON` (and not submodule):** Already in linked worktree.

**Exception**: If the calling skill (e.g., `authoring-feature-spec-in-worktree`) explicitly instructs creating a new feature branch worktree, follow that instruction — the "skip" rule is overridden. The calling skill will handle worktree creation and relocation.

**Otherwise**: Skip to Step 2. Do NOT create another worktree.

Report branch state:
- On branch: "Already in isolated workspace at `<path>` on branch `<name>`."
- Detached HEAD: "Already in isolated workspace at `<path>` (detached HEAD, externally managed). Branch creation needed at finish time."

**If `GIT_DIR == GIT_COMMON` (or in submodule):** In normal repo checkout.

Has user already indicated worktree preference in instructions? If not, ask consent:

> "Would you like me to set up an isolated worktree? It protects your current branch from changes."

Honor existing declared preference without asking. If user declines consent, work in place and skip to Step 2.

## Step 1: Create Isolated Workspace

**Two mechanisms. Try in this order.**

### 1a. Native Worktree Tools (preferred)

User asked for isolated workspace (Step 0 consent). Do you already have way to create worktree? Might be tool named `EnterWorktree`, `WorktreeCreate`, `/worktree` command, or `--worktree` flag. If so, use it and skip to Step 2.

Native tools handle directory placement, branch creation, cleanup automatically. Using `git worktree add` when native tool available creates phantom state harness cannot see or manage.

Only proceed to Step 1b if no native worktree tool available.

### 1b. Git Worktree Fallback

**Only use if Step 1a does not apply** — no native worktree tool available. Create worktree manually using git.

#### Directory Selection

Follow priority order. Explicit user preference always beats observed filesystem state.

1. **Check instructions for declared worktree directory preference.** If user specified one, set `WORKTREE_LOCATION` accordingly.

2. **Check for existing project-local worktree directory:**
   ```bash
   ls -d .worktrees 2>/dev/null     # Preferred (hidden)
   ls -d worktrees 2>/dev/null      # Alternative
   ```
   If found, use it. If both exist, `.worktrees` wins.

3. **If no other guidance**, default to `.worktrees/` at project root.

#### Safety Verification (project-local directories only)

**MUST verify directory ignored before creating worktree:**

```bash
git check-ignore -q .worktrees 2>/dev/null || git check-ignore -q worktrees 2>/dev/null
```

**If NOT ignored:** Add to .gitignore, commit change, then proceed.

**Why critical:** Prevents accidentally committing worktree contents to repository.

#### Create Worktree

```bash
# Determine location from directory selection logic above
if [ -n "$WORKTREE_LOCATION" ]; then
  LOCATION="$WORKTREE_LOCATION"
elif [ -d .worktrees ]; then
  LOCATION=".worktrees"
elif [ -d worktrees ]; then
  LOCATION="worktrees"
else
  LOCATION=".worktrees"
fi

# Determine branch name for new worktree
# Use current branch as base, append feature suffix or derive from context
BRANCH_NAME="${1:-$(git branch --show-current)-worktree}"

path="$LOCATION/$BRANCH_NAME"
git worktree add "$path" -b "$BRANCH_NAME"
cd "$path"
```

**Sandbox fallback:** If `git worktree add` fails with permission error (sandbox denial), tell user sandbox blocked worktree creation, work in current directory instead. Then run setup and baseline tests in place.

## Step 2: Project Setup

Initialize the worktree environment. If the agent does not already know the correct setup procedure, ask the user with a recommended option "let agent figure it out." If that option is chosen, explore project conventions (AGENTS.md, README.md, package.json, scripts/) to determine the correct setup command. Do not hardcode to any specific tool or package manager.

Typical patterns (may vary):
```bash
# Node.js / Bun
bun install / npm install / pnpm install

# Rust
cargo build

# Python
pip install -r requirements.txt / poetry install

# Go
go mod download
```

## Step 3: Verify Clean Baseline

Run tests to ensure workspace starts clean:

```bash
# Use project-appropriate command
npm test / cargo test / pytest / go test ./...
```

**If tests fail:** Report failures, ask whether to proceed or investigate.

**If tests pass:** Report ready.

### Report

```
Worktree ready at <full-path>
Tests passing (<N> tests, 0 failures)
Ready to implement <feature-name>
```

## Quick Reference

| Situation | Action |
|-----------|--------|
| Already in linked worktree | Skip creation (Step 0) unless calling skill overrides |
| In submodule | Treat as normal repo (Step 0 guard) |
| Native worktree tool available | Use it (Step 1a) |
| No native tool | Git worktree fallback (Step 1b) |
| `.worktrees/` exists | Use it (verify ignored) |
| `worktrees/` exists | Use it (verify ignored) |
| Both exist | Use `.worktrees/` |
| Neither exists | Check instruction file, then default `.worktrees/` |
| Directory not ignored | Add to .gitignore + commit |
| Permission error on create | Sandbox fallback, work in place |
| Tests fail during baseline | Report failures + ask |
| No package.json/Cargo.toml | Skip dependency install |

## Common Mistakes

### Fighting harness

- **Problem:** Using `git worktree add` when platform already provides isolation
- **Fix:** Step 0 detects existing isolation. Step 1a defers to native tools.

### Skipping detection

- **Problem:** Creating nested worktree inside existing one
- **Fix:** Always run Step 0 before creating anything

### Skipping ignore verification

- **Problem:** Worktree contents get tracked, pollute git status
- **Fix:** Always use `git check-ignore` before creating project-local worktree

### Assuming directory location

- **Problem:** Creates inconsistency, violates project conventions
- **Fix:** Follow priority: explicit instructions > existing project-local directory > default

### Proceeding with failing tests

- **Problem:** Cannot distinguish new bugs from pre-existing issues
- **Fix:** Report failures, get explicit permission to proceed

## Red Flags

**Never:**
- Create worktree when Step 0 detects existing isolation (exception: calling skill explicitly instructs new worktree creation)
- Use `git worktree add` when native worktree tool available (e.g., `EnterWorktree`). This is #1 mistake — use native tool if available.
- Skip Step 1a by jumping straight to Step 1b git commands
- Create worktree without verifying it is ignored (project-local)
- Skip baseline test verification
- Proceed with failing tests without asking

**Always:**
- Run Step 0 detection first
- Prefer native tools over git fallback
- Follow directory priority: explicit instructions > existing project-local directory > default
- Verify directory ignored for project-local
- Auto-detect and run project setup
- Verify clean test baseline

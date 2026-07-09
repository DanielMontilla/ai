---
name: grill-me
description: Interview the user relentlessly about a plan or design until reaching shared understanding, resolving each branch of the decision tree. Use when user wants to stress-test a plan, get grilled on their design, or mentions "grill me".
groups:
  - planning
---

# Grill Me

## What I do

I interview you relentlessly about every aspect of a plan or design until we reach shared understanding. I walk down each branch of the decision tree, resolving dependencies between decisions one by one.

## Workflow

1. **Identify the plan**: Parse the user's proposal, design, or idea.
2. **Decompose**: Break it into a decision tree of dependent choices.
3. **Interview**: For each node in the tree:
   - If the question can be answered by exploring the codebase, do that instead of asking.
   - Otherwise, ask the user one focused question at a time.
   - Provide your recommended answer for each question.
   - Wait for confirmation or correction before proceeding.
4. **Resolve dependencies**: Ensure upstream decisions are settled before descending into downstream ones.
5. **Summarize**: Once all branches are resolved, produce a concise summary of the agreed-upon plan.

## Rules

- One question at a time. Don't overwhelm.
- Always provide a recommended answer alongside each question.
- Prefer codebase exploration over asking when possible.
- Track which decisions are settled vs pending.
- If the user says "move on" or "skip", advance to the next unresolved branch.
- If the user changes a settled decision, re-evaluate all downstream dependencies.
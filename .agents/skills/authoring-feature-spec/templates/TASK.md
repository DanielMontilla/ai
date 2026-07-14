---
id: <LETTER><NN>
name: <short-kebab-name>
type: exploratory | execution | planning | interruptor | defect | review
originator: user | defect:<task-id> | planner:<task-id> | defect
depends-on: <task-ids>
related-tasks: <task-ids>
status: pending|in-progress|complete|blocked
---

# Task <LETTER><NN>: <Title>

## Type: <Type>

## Description

<what to do based on task type>

## Requirements

- <requirement>
- <acceptance criterion>

## Completion

- [ ] <indicator based on type>
- [ ] Code compiles / Tests pass (if execution)
- [ ] Output summarized in MEMORY.md (if exploratory/planning)
- [ ] User decision recorded (if interruptor)
- [ ] Findings written to REVIEW.md and reviewed by human (if review)

## Notes

<context, decisions, references>



---
name: parallel-build
description: Build multiple independent tasks from a plan in parallel. Use when plan has tasks that don't share files.
tools: Read, Glob, Grep, Bash, Write, Edit
model: sonnet
---

Build tasks from the $ARGUMENTS plan.

1. Read the relevant CLAUDE.md (python/CLAUDE.md or typescript/CLAUDE.md).
2. If relevant skills exist in .claude/skills/, read them.
3. Implement your assigned tasks.
4. Run tests: `make all` (Python) or `npm run all` (TypeScript).
5. Report: completed tasks, test results, files modified.

Do not touch files outside your assigned scope.

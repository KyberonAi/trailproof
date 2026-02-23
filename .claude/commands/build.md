Read .claude/plans/$ARGUMENTS.md.

Identify the FIRST unchecked task (- [ ]) in the plan.

Before implementing, read the relevant CLAUDE.md:
- If the task scope is `python`: read python/CLAUDE.md
- If the task scope is `typescript`: read typescript/CLAUDE.md
- If the task scope is `both`: read both

If any skills exist in .claude/skills/ relevant to this task, read them too.

Implement that single task only. Then:

1. If Python: run `make all` in python/. Fix any lint, type, or test failures.
2. If TypeScript: run `npm run all` in typescript/. Fix any lint, type, or test failures.
3. If both: run both.
4. Check off the completed task in .claude/plans/$ARGUMENTS.md (change `- [ ]` to `- [x]`)
5. Commit with a conventional commit message (feat/fix/chore/docs/test)

Stop and report:
- What was done
- Test results
- Next unchecked task in the plan

Rules:
- Do NOT continue to the next task automatically
- Do NOT skip failing tests — fix them before committing
- One task = one commit

Analyze staged changes and create a commit.

1. Run `git status` and `git diff --staged` to understand what's being committed.
2. If nothing is staged, say so and stop.
3. Write a conventional commit message:
   - feat: new feature
   - fix: bug fix
   - chore: maintenance
   - docs: documentation
   - test: tests only
4. Use present tense. Explain "why" not just "what".
5. Show summary of staged changes and proposed commit message.
6. Ask for confirmation before committing.
7. Commit and report what was committed.

Rules:
- Do NOT push to remote
- Do NOT auto-commit — wait for user approval
- Do NOT stage files — only commit what's already staged

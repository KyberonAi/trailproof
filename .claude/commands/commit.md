Analyze changes and create a commit.

1. Run `git status` to see all modified, untracked, and staged files.
2. Run `git diff` (unstaged) and `git diff --staged` (staged) to understand all changes.
3. If nothing is modified or staged, say "Nothing to commit" and stop.
4. Show a summary of ALL changes grouped by:
   - Already staged
   - Modified but not staged
   - Untracked (new files)
5. If files are not yet staged, suggest which files to stage and ask for approval.
   - Exclude files that should not be committed (node_modules, .venv, __pycache__, etc.)
6. After user approves, stage the approved files with `git add`.
7. Write a conventional commit message:
   - feat: new feature
   - fix: bug fix
   - chore: maintenance
   - docs: documentation
   - test: tests only
8. Use present tense. Explain "why" not just "what".
9. Show the proposed commit message and ask for confirmation.
10. Commit and report what was committed.

Rules:
- Do NOT push to remote
- Do NOT auto-commit — wait for user approval before committing
- Do NOT stage files without showing them and getting approval first
- Do NOT stage sensitive files (.env, credentials, secrets)
- Do NOT stage generated files (node_modules, dist, __pycache__, .venv, uv.lock)

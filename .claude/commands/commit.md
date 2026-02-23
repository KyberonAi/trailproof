---
description: Stage changes and create a commit with user approval
argument-hint: (optional) commit message hint
allowed-tools: Bash(git status), Bash(git diff *), Bash(git add *), Bash(git commit *), Bash(git log *)
---

Analyze changes and create a commit.

## Step 1. Understand the changes

Run `git status` to see all modified, untracked, and staged files.
Run `git diff` (unstaged) and `git diff --staged` (staged) to understand all changes.

If nothing is modified or staged, say "Nothing to commit" and stop.

## Step 2. Show changes

Show a summary of ALL changes grouped by:
- Already staged
- Modified but not staged
- Untracked (new files)

## Step 3. Stage files

If files are not yet staged, suggest which files to stage.
- Exclude: node_modules, .venv, __pycache__, dist, .mypy_cache, .ruff_cache, .pytest_cache, coverage, uv.lock
- Exclude: .env, credentials, secrets, sensitive files
- Ask for user approval before staging.
- After approval, stage the files with `git add`.

## Step 4. Propose commit message

Write a conventional commit message:
- feat: new feature
- fix: bug fix
- chore: maintenance
- docs: documentation
- test: tests only

Use present tense. Explain "why" not just "what".
Show the proposed message and ask for confirmation.

## Step 5. Commit

After user confirms, commit and report what was committed.

Rules:
- Do NOT push to remote
- Do NOT auto-commit — wait for user approval
- Do NOT stage files without showing them and getting approval first
- Do NOT stage sensitive files (.env, credentials, secrets)
- Do NOT add "Co-Authored-By" trailers or any other trailers to commit messages

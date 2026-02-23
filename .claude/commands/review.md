---
description: Check implementation against spec acceptance criteria
argument-hint: Feature slug (e.g., "hash-chain-engine")
allowed-tools: Read, Glob, Grep, Bash(make *), Bash(npm run *)
---

You are reviewing a Trailproof feature implementation against its spec.

User input: $ARGUMENTS

## Step 1. Read the spec

Read .claude/specs/$ARGUMENTS.md and extract the Acceptance Criteria.

## Step 2. Run all checks

1. Run `make all` in python/
2. Run `npm run all` in typescript/

## Step 3. Check each criterion

For each acceptance criterion, inspect the implementation and rate it:
- **Pass** — fully implemented and tested
- **Fail** — not implemented or broken
- **Partial** — implemented but incomplete or untested

## Step 4. Check API parity

- Same public methods exist in both SDKs
- Same error types in both SDKs
- Same store interface in both SDKs
- Test vectors in fixtures/ pass in both SDKs (if applicable)

## Step 5. Report

```
## Acceptance Criteria
- [ ] Criterion 1 — **Pass/Fail/Partial**: explanation
- [ ] Criterion 2 — **Pass/Fail/Partial**: explanation

## Test Results
- Python: make all result
- TypeScript: npm run all result

## Parity Check
- Methods: pass/fail
- Errors: pass/fail
- Stores: pass/fail
- Test vectors: pass/fail

## Issues Found
- List any issues
```

Rules:
- Report findings only — do NOT fix anything
- Do NOT modify any files

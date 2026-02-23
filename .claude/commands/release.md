---
description: Prepare and tag a release (regenerate changelog, verify, tag, push)
argument-hint: <version> (e.g., 0.1.0 or 0.2.0)
allowed-tools: Bash(git *), Bash(make *), Bash(npm *), Bash(python3 *), Bash(git-cliff *), Bash(grep *), Bash(cat *), Bash(ls *)
---

Prepare and execute a release for Trailproof.

## Step 0. Parse version

Extract the version from `$ARGUMENTS`. It should be a semver string like `0.1.0` or `1.0.0`.
If no version is provided, ask the user what version to release.
Strip any leading `v` — the tag will be `v{version}` but the version in files is just `{version}`.

## Step 1. Pre-flight checks

Run ALL of the following and stop if any fail:

1. **Branch check**: Must be on `main`. If not, abort: "Switch to main before releasing."
2. **Clean tree**: `git status` must show nothing to commit. If dirty, abort: "Commit or stash changes first."
3. **Up to date**: `git fetch origin && git diff main origin/main` must be empty. If not, abort: "Pull latest changes first."
4. **Tag not taken**: `git tag -l v{version}` must return empty. If taken, abort: "Tag v{version} already exists."
5. **Python tests**: `cd python && make all` must pass.
6. **TypeScript tests**: `cd typescript && npm run all` must pass.

## Step 2. Verify versions in manifests

Check that both files declare the correct version:
- `grep 'version = "{version}"' python/pyproject.toml`
- `grep '"version": "{version}"' typescript/package.json`

If either doesn't match, show the user what's wrong and ask if they want to update.
If they say yes, update the version in both files. If they say no, abort.

## Step 3. Regenerate CHANGELOG

Run:
```
git-cliff --tag v{version} -o CHANGELOG.md
```

This generates the changelog with the new version tag applied (converting `[Unreleased]` to `[{version}]`).

Show the user a preview: `head -40 CHANGELOG.md`

## Step 4. Show release summary

Present a clear summary:

```
Release Summary
───────────────
Version:    v{version}
Python:     trailproof {version} → PyPI
TypeScript: @kyberonai/trailproof {version} → npm
Tag:        v{version}
Changelog:  Updated ✓
Tests:      Python ✓ TypeScript ✓
```

Then list the commits that will be in this release (since the last tag, or all commits if first release):
```
git log $(git describe --tags --abbrev=0 2>/dev/null || git rev-list --max-parents=0 HEAD)..HEAD --oneline
```

## Step 5. Ask for confirmation

Ask: "Ready to commit changelog, tag v{version}, and push to origin? This will trigger the publish workflows."

Wait for explicit "yes" from the user.

## Step 6. Commit, tag, and push

After user confirms:

```bash
git add CHANGELOG.md
git commit -m "chore: release v{version}"
git tag v{version}
git push origin main --tags
```

## Step 7. Post-release instructions

After pushing, tell the user:

```
✓ Tag v{version} pushed to origin.

Next steps:
1. Go to GitHub Actions → approve the "release" environment for both workflows:
   - Publish Python: https://github.com/KyberonAi/trailproof/actions/workflows/publish-python.yml
   - Publish npm: https://github.com/KyberonAi/trailproof/actions/workflows/publish-npm.yml
2. After both succeed, verify:
   - pip install trailproof=={version}
   - npm install @kyberonai/trailproof@{version}
```

## Rules
- Do NOT skip pre-flight checks
- Do NOT push without user confirmation
- Do NOT modify any source code (only CHANGELOG.md and optionally version fields)
- Do NOT add "Co-Authored-By" trailers to commit messages
- If git-cliff is not installed, tell the user to install it: `brew install git-cliff` or `cargo install git-cliff`

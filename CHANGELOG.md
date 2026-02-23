# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-02-23

### Added

- add types, errors, spec, and plan for core API (Task 1)
- add store interface and memory store (Task 3)
- add Trailproof facade class with emit() (Task 4)
- add query() and get_trace() methods (Task 5)
- add verify() and flush() methods (Task 6)
- add HMAC-SHA256 signing and verification (Task 7)
- add JSONL file store with recovery and corrupt line handling (Task 8)
- add TypeScript types and error hierarchy (Task 10)
- add TypeScript hash chain engine with canonical JSON (Task 11)
- add TypeScript store interface and memory store (Task 12)
- add TypeScript Trailproof class with emit() (Task 13)
- add query, getTrace, verify, and flush to TypeScript Trailproof (Task 14)
- add TypeScript HMAC signer with timing-safe verification (Task 15)
- add TypeScript JSONL file store with recovery and permissions (Task 16)
- add cross-SDK test vectors to verify Python/TypeScript parity (Task 18)

### Documentation

- add README with badges, quickstart, and release checklist
- add architecture diagram to README and CI/CD spec and plan

### Maintenance

- initial skeleton
- add CLAUDE.md files, custom commands, agent definitions, and permissions
- scaffold project infrastructure for both SDKs
- scaffold project infrastructure for both SDKs
- remove _ prefix convention from Python module names
- wire up Python public API exports in __init__.py (Task 9)
- enforce /commit skill usage in build command
- wire up TypeScript public API exports in index.ts (Task 17)
- add Mintlify documentation skill
- add Apache 2.0 LICENSE
- update license declarations to Apache-2.0
- add cliff.toml for git-cliff changelog generation
- generate CHANGELOG.md from git history
- add PyPI publish workflow using OIDC trusted publisher
- add npm publish workflow using OIDC trusted publisher
- add release command for automated version tagging and publishing
- add branch guard to commit command to prevent direct commits to main



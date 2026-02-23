# Trailproof

Trailproof is a tamper-evident audit trail library using hash chains and optional HMAC signing. It ships as dual Python + TypeScript SDKs with identical public APIs and shared test vectors.

## Stack

- Python 3.11+ / TypeScript 5 / Node.js 18+
- Zero runtime dependencies in both SDKs (stdlib/built-ins only)
- Build: hatchling (Python), tsup ESM+CJS (TypeScript)

## Project Structure

```
trailproof/
├── .claude/           commands, specs, plans, decisions, skills, context
├── python/            Python SDK (built first)
│   ├── src/trailproof/
│   └── tests/
├── typescript/        TypeScript SDK (mirrors Python)
│   ├── src/
│   └── tests/
├── fixtures/          Shared cross-SDK test vectors (JSON)
├── .github/workflows/ CI/CD
├── docs/
├── SPEC.md            Source of truth for v1.0 design
└── README.md
```

## Core Concepts

- **TrailEvent** — 10-field event envelope (event_id, event_type, timestamp, actor_id, tenant_id, trace_id?, session_id?, payload, prev_hash, hash, signature?)
- **Hash chain** — SHA-256(prev_hash + canonical_json(event)). Genesis hash is `"0" x 64`
- **Canonical JSON** — sorted keys, compact, no whitespace, exclude `hash` and `signature` fields, exclude null fields, UTF-8
- **Store** — append-only backend (memory or JSONL file in v1.0)
- **Signer** — optional HMAC-SHA256 provenance
- **Verifier** — walks the chain, returns VerifyResult { intact, total, broken }

## Commands

- Python: see `python/CLAUDE.md` for make targets
- TypeScript: see `typescript/CLAUDE.md` for npm scripts

## Conventions

### SDK Parity Rules

1. Both SDKs produce identical hashes for the same event data
2. Same canonical JSON algorithm
3. Same genesis hash (`"0" x 64`)
4. Pass the same test vectors from `fixtures/test-vectors.json`
5. Same public API (snake_case in Python, camelCase in TypeScript)
6. Same error types: TrailproofError, ValidationError, StoreError, ChainError, SignatureError
7. Same store interface: append, read_all, query, last_hash, count

### Build Order

Python first, TypeScript mirrors after. Each step: Python -> TypeScript -> shared test vectors -> commit.

## Workflow Rules

1. No code without an approved spec in `.claude/specs/`
2. Spec -> Plan -> Build -> Test -> Review -> Commit
3. One task = one commit
4. Run tests before every commit
5. Update plan files to reflect state after each session

## What NOT To Do

- Do not write code without an approved spec
- Do not modify pyproject.toml or package.json without asking
- Do not add dependencies without asking (both SDKs must stay zero-dep at runtime)
- Do not build v1.1 features: external anchoring, KMS/HSM, compliance packs, OTel adapters, CLI
- Do not validate `payload` contents — Trailproof stores it opaquely
- Do not implement async batching, retention/TTL, or pub-sub
- Do not continue to the next task without stopping for review

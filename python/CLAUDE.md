# Trailproof — Python SDK

The Python SDK is the primary implementation. TypeScript mirrors it. Build Python first.

## Stack

- Python 3.11+
- Build: hatchling (pyproject.toml)
- Lint: ruff
- Types: mypy (strict)
- Test: pytest + pytest-asyncio
- Runtime deps: none (stdlib only: hashlib, hmac, json, uuid, datetime)

## Module Structure

```
python/src/trailproof/
├── __init__.py          Public API: Trailproof class, re-exports
├── types.py             TrailEvent, QueryResult, VerifyResult, QueryFilters
├── chain.py             Hash chain engine + canonical JSON
├── signer.py            Optional HMAC-SHA256
├── errors.py            TrailproofError, ValidationError, StoreError, ChainError, SignatureError
└── stores/
    ├── __init__.py
    ├── base.py          TrailStore ABC
    ├── memory.py        In-memory store
    └── jsonl.py         JSONL file store
```

## Commands

```
make test        pytest
make lint        ruff check + ruff format --check
make typecheck   mypy
make all         lint + typecheck + test
```

## Conventions

- Type hints on all public functions and methods
- dataclasses for data types (TrailEvent, QueryResult, VerifyResult)
- ABC for store interface in stores/base.py
- `__init__.py` re-exports the public API: Trailproof, TrailEvent, QueryResult, VerifyResult, error classes
- JSONL file created with 0o600 permissions
- Timing-safe comparison for HMAC verification (hmac.compare_digest)

## Workflow Rules

- Python SDK is built first for every feature
- Run `make all` before committing
- One task = one commit

## What NOT To Do

- Do not add runtime dependencies
- Do not use `Any` in public API signatures
- Do not modify pyproject.toml without asking

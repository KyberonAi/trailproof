# Plan: Core API

## Spec
.claude/specs/core-api.md

## Branch
feature/core-api

## Tasks

### Python SDK

- [x] **Task 1:** Types and errors — define TrailEvent, QueryResult, VerifyResult, QueryFilters dataclasses and error hierarchy (TrailproofError, ValidationError, StoreError, ChainError, SignatureError) with tests — scope: `python`, complexity: `medium`
- [x] **Task 2:** Hash chain engine — implement canonical JSON serialization and SHA-256 hash computation (genesis hash, chain linking) with tests — scope: `python`, complexity: `medium`
- [ ] **Task 3:** Store interface and memory store — define TrailStore ABC (append, read_all, query, last_hash, count) and implement MemoryStore with tests — scope: `python`, complexity: `medium`
- [ ] **Task 4:** Trailproof class with emit() — implement the facade class with constructor (store, path, signing_key, default_tenant_id), emit() with validation and hash chaining, and tests — scope: `python`, complexity: `large`
- [ ] **Task 5:** query() and get_trace() — implement query with all filters, cursor pagination, and get_trace; add tests — scope: `python`, complexity: `medium`
- [ ] **Task 6:** verify() and flush() — implement chain verification returning VerifyResult, flush as no-op for memory store; add tests — scope: `python`, complexity: `medium`
- [ ] **Task 7:** HMAC signer — implement optional HMAC-SHA256 signing and verification with timing-safe comparison; add tests — scope: `python`, complexity: `medium`
- [ ] **Task 8:** JSONL file store — implement append-only JSONL storage with 0o600 permissions, file recovery on init, corrupt line handling; add tests — scope: `python`, complexity: `large`
- [ ] **Task 9:** Public API exports — wire up __init__.py re-exports, ensure `make all` passes cleanly — scope: `python`, complexity: `small`

### TypeScript SDK

- [ ] **Task 10:** Types and errors (TS mirror) — mirror Task 1: TrailEvent, QueryResult, VerifyResult interfaces and error classes with tests — scope: `typescript`, complexity: `medium`
- [ ] **Task 11:** Hash chain engine (TS mirror) — mirror Task 2: canonical JSON and SHA-256 with Node.js crypto; tests — scope: `typescript`, complexity: `medium`
- [ ] **Task 12:** Store interface and memory store (TS mirror) — mirror Task 3: TrailStore interface and MemoryStore; tests — scope: `typescript`, complexity: `medium`
- [ ] **Task 13:** Trailproof class with emit() (TS mirror) — mirror Task 4: constructor, emit with validation and hashing; tests — scope: `typescript`, complexity: `large`
- [ ] **Task 14:** query(), getTrace(), verify(), flush() (TS mirror) — mirror Tasks 5-6: all query/verify methods; tests — scope: `typescript`, complexity: `large`
- [ ] **Task 15:** HMAC signer (TS mirror) — mirror Task 7: HMAC-SHA256 with crypto.timingSafeEqual; tests — scope: `typescript`, complexity: `medium`
- [ ] **Task 16:** JSONL file store (TS mirror) — mirror Task 8: JSONL with fs, permissions, recovery; tests — scope: `typescript`, complexity: `large`
- [ ] **Task 17:** Public API exports (TS mirror) — wire up index.ts re-exports, ensure `npm run all` passes cleanly — scope: `typescript`, complexity: `small`

### Shared

- [ ] **Task 18:** Cross-SDK test vectors — create fixtures/test-vectors.json with canonical JSON, hash chain, and HMAC test cases; verify both SDKs produce identical results — scope: `both`, complexity: `medium`

## Dependencies

- Tasks 2-9 depend on Task 1 (types and errors are the foundation)
- Task 3 depends on Task 2 (store needs to work with hashed events)
- Tasks 4-6 depend on Tasks 2 and 3 (facade needs chain engine and store)
- Task 7 depends on Task 2 (signer uses canonical JSON)
- Task 8 depends on Task 3 (JSONL extends store interface)
- Task 9 depends on Tasks 4-8 (exports need all modules)
- Tasks 10-17 depend on their Python counterparts (mirror after Python is done)
- Task 18 depends on Tasks 9 and 17 (both SDKs must be complete)

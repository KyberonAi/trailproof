# Trailproof — TypeScript SDK

The TypeScript SDK mirrors the Python SDK. Same API surface, same behavior, camelCase naming.

## Stack

- TypeScript 5 (strict mode, no `any`)
- Build: tsup (ESM + CJS dual output)
- Lint: eslint + prettier
- Test: vitest
- Runtime deps: none (Node.js built-ins only: crypto, fs, path)
- Target: Node.js 18+
- Package: @kyberon/trailproof

## Module Structure

```
typescript/src/
├── index.ts             Public API: Trailproof class, re-exports
├── types.ts             TrailEvent, QueryResult, VerifyResult, QueryFilters
├── chain.ts             Hash chain engine + canonical JSON
├── signer.ts            Optional HMAC-SHA256
├── errors.ts            TrailproofError, ValidationError, StoreError, ChainError, SignatureError
└── stores/
    ├── base.ts          TrailStore interface
    ├── memory.ts        In-memory store
    └── jsonl.ts         JSONL file store
```

## Commands

```
npm run test        vitest
npm run lint        eslint + prettier --check
npm run typecheck   tsc --noEmit
npm run build       tsup
npm run all         lint + typecheck + test
```

## Conventions

- No `any` — use `unknown` or proper types
- Interfaces for data types (TrailEvent, QueryResult, VerifyResult)
- Interface for store contract in stores/base.ts
- Export types and classes from index.ts
- snake_case field names in TrailEvent (matching the wire format), camelCase for method names
- Use Node.js crypto for SHA-256 and HMAC
- Timing-safe comparison for HMAC verification (crypto.timingSafeEqual)

## Workflow Rules

- TypeScript mirrors Python — do not build TypeScript first
- Run `npm run all` before committing
- Verify parity with `fixtures/test-vectors.json` after any change

## What NOT To Do

- Do not add runtime dependencies
- Do not use `any`
- Do not modify package.json without asking
- Do not diverge from Python SDK behavior

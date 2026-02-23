/**
 * Cross-SDK test vectors — verify TypeScript produces identical results to shared fixtures.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it, expect } from "vitest";
import { GENESIS_HASH, canonicalJson, computeHash } from "../src/chain.js";
import { signEvent } from "../src/signer.js";
import type { TrailEvent } from "../src/types.js";

interface CanonicalJsonVector {
  description: string;
  event: TrailEvent;
  expected: string;
}

interface HashChainVector {
  description: string;
  prev_hash: string;
  event: TrailEvent;
  expected_hash: string;
}

interface HmacVector {
  description: string;
  key: string;
  event: TrailEvent;
  expected_signature: string;
}

interface TestVectors {
  genesis_hash: string;
  canonical_json: CanonicalJsonVector[];
  hash_chain: HashChainVector[];
  hmac: HmacVector[];
}

function loadVectors(): TestVectors {
  const path = resolve(__dirname, "../../fixtures/test-vectors.json");
  const content = readFileSync(path, "utf-8");
  return JSON.parse(content) as TestVectors;
}

describe("genesis hash vector", () => {
  it("matches shared test vector", () => {
    const vectors = loadVectors();
    expect(GENESIS_HASH).toBe(vectors.genesis_hash);
  });
});

describe("canonical JSON vectors", () => {
  it("all vectors match", () => {
    const vectors = loadVectors();
    for (const vector of vectors.canonical_json) {
      const result = canonicalJson(vector.event);
      expect(result).toBe(vector.expected);
    }
  });

  it("basic event", () => {
    const vectors = loadVectors();
    const vector = vectors.canonical_json[0];
    if (vector == null) throw new Error("missing vector");
    expect(canonicalJson(vector.event)).toBe(vector.expected);
  });

  it("nested payload", () => {
    const vectors = loadVectors();
    const vector = vectors.canonical_json[1];
    if (vector == null) throw new Error("missing vector");
    expect(canonicalJson(vector.event)).toBe(vector.expected);
  });

  it("optional fields", () => {
    const vectors = loadVectors();
    const vector = vectors.canonical_json[2];
    if (vector == null) throw new Error("missing vector");
    expect(canonicalJson(vector.event)).toBe(vector.expected);
  });

  it("unicode and emoji", () => {
    const vectors = loadVectors();
    const vector = vectors.canonical_json[3];
    if (vector == null) throw new Error("missing vector");
    expect(canonicalJson(vector.event)).toBe(vector.expected);
  });
});

describe("hash chain vectors", () => {
  it("all vectors match", () => {
    const vectors = loadVectors();
    for (const vector of vectors.hash_chain) {
      const result = computeHash(vector.prev_hash, vector.event);
      expect(result).toBe(vector.expected_hash);
    }
  });

  it("genesis event hash", () => {
    const vectors = loadVectors();
    const vector = vectors.hash_chain[0];
    if (vector == null) throw new Error("missing vector");
    expect(computeHash(vector.prev_hash, vector.event)).toBe(vector.expected_hash);
  });

  it("chained event hash", () => {
    const vectors = loadVectors();
    const vector = vectors.hash_chain[1];
    if (vector == null) throw new Error("missing vector");
    expect(computeHash(vector.prev_hash, vector.event)).toBe(vector.expected_hash);
  });
});

describe("HMAC vectors", () => {
  it("all vectors match", () => {
    const vectors = loadVectors();
    for (const vector of vectors.hmac) {
      const result = signEvent(vector.key, vector.event);
      expect(result).toBe(vector.expected_signature);
    }
  });

  it("basic HMAC", () => {
    const vectors = loadVectors();
    const vector = vectors.hmac[0];
    if (vector == null) throw new Error("missing vector");
    expect(signEvent(vector.key, vector.event)).toBe(vector.expected_signature);
  });
});

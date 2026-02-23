import { createHash } from "node:crypto";
import { describe, it, expect } from "vitest";
import { GENESIS_HASH, canonicalJson, computeHash } from "../src/chain.js";
import type { TrailEvent } from "../src/types.js";

function makeEvent(overrides: Partial<TrailEvent> = {}): TrailEvent {
  return {
    event_id: "evt-001",
    event_type: "test.event",
    timestamp: "2025-01-01T00:00:00Z",
    actor_id: "actor-1",
    tenant_id: "tenant-1",
    payload: { key: "value" },
    prev_hash: GENESIS_HASH,
    hash: "placeholder",
    ...overrides,
  };
}

describe("GENESIS_HASH", () => {
  it("is 64 zero characters", () => {
    expect(GENESIS_HASH).toBe("0".repeat(64));
  });

  it("has length 64", () => {
    expect(GENESIS_HASH).toHaveLength(64);
  });
});

describe("canonicalJson", () => {
  it("excludes hash field", () => {
    const event = makeEvent({ hash: "should-be-excluded" });
    const result = canonicalJson(event);
    expect(result).not.toContain('"hash"');
  });

  it("excludes signature field", () => {
    const event = makeEvent({ signature: "hmac-sha256:abc123" });
    const result = canonicalJson(event);
    expect(result).not.toContain('"signature"');
  });

  it("excludes null fields", () => {
    const event = makeEvent({ trace_id: null, session_id: null });
    const result = canonicalJson(event);
    expect(result).not.toContain('"trace_id"');
    expect(result).not.toContain('"session_id"');
  });

  it("excludes undefined fields", () => {
    const event = makeEvent();
    // trace_id and session_id are undefined by default
    const result = canonicalJson(event);
    expect(result).not.toContain('"trace_id"');
    expect(result).not.toContain('"session_id"');
  });

  it("includes optional fields when set", () => {
    const event = makeEvent({ trace_id: "trace-1", session_id: "session-1" });
    const result = canonicalJson(event);
    expect(result).toContain('"trace_id":"trace-1"');
    expect(result).toContain('"session_id":"session-1"');
  });

  it("sorts keys alphabetically", () => {
    const event = makeEvent();
    const result = canonicalJson(event);
    const parsed = JSON.parse(result) as Record<string, unknown>;
    const keys = Object.keys(parsed);
    expect(keys).toEqual([...keys].sort());
  });

  it("uses compact format with no whitespace", () => {
    const event = makeEvent();
    const result = canonicalJson(event);
    expect(result).not.toContain(": ");
    expect(result).not.toContain(", ");
  });

  it("sorts nested payload recursively", () => {
    const event = makeEvent({ payload: { zebra: 1, alpha: { gamma: 3, beta: 2 } } });
    const result = canonicalJson(event);
    const alphaPos = result.indexOf('"alpha"');
    const zebraPos = result.indexOf('"zebra"');
    expect(alphaPos).toBeLessThan(zebraPos);
    const betaPos = result.indexOf('"beta"');
    const gammaPos = result.indexOf('"gamma"');
    expect(betaPos).toBeLessThan(gammaPos);
  });

  it("produces deterministic output", () => {
    const event = makeEvent();
    const result1 = canonicalJson(event);
    const result2 = canonicalJson(event);
    expect(result1).toBe(result2);
  });

  it("handles unicode characters", () => {
    const event = makeEvent({ payload: { message: "Hello \u4e16\u754c" } });
    const result = canonicalJson(event);
    expect(result).toContain("\u4e16\u754c");
  });

  it("handles emoji characters", () => {
    const event = makeEvent({ payload: { emoji: "\u{1F680}" } });
    const result = canonicalJson(event);
    expect(result).toContain("\u{1F680}");
  });

  it("handles empty payload", () => {
    const event = makeEvent({ payload: {} });
    const result = canonicalJson(event);
    expect(result).toContain('"payload":{}');
  });

  it("excludes null values in nested payload", () => {
    const event = makeEvent({ payload: { a: 1, b: null } });
    const result = canonicalJson(event);
    expect(result).not.toContain('"b"');
  });
});

describe("computeHash", () => {
  it("produces valid SHA-256 hex string", () => {
    const event = makeEvent();
    const result = computeHash(GENESIS_HASH, event);
    expect(result).toHaveLength(64);
    expect(/^[0-9a-f]{64}$/.test(result)).toBe(true);
  });

  it("matches manual SHA-256 computation", () => {
    const event = makeEvent({ prev_hash: GENESIS_HASH });
    const result = computeHash(GENESIS_HASH, event);
    const canonical = canonicalJson(event);
    const expected = createHash("sha256")
      .update(GENESIS_HASH + canonical, "utf-8")
      .digest("hex");
    expect(result).toBe(expected);
  });

  it("different prev_hash produces different result", () => {
    const event = makeEvent();
    const hash1 = computeHash(GENESIS_HASH, event);
    const hash2 = computeHash("a".repeat(64), event);
    expect(hash1).not.toBe(hash2);
  });

  it("different events produce different hashes", () => {
    const event1 = makeEvent({ event_id: "evt-001" });
    const event2 = makeEvent({ event_id: "evt-002" });
    const hash1 = computeHash(GENESIS_HASH, event1);
    const hash2 = computeHash(GENESIS_HASH, event2);
    expect(hash1).not.toBe(hash2);
  });

  it("hash field is excluded from computation", () => {
    const event1 = makeEvent({ hash: "hash-a" });
    const event2 = makeEvent({ hash: "hash-b" });
    const hash1 = computeHash(GENESIS_HASH, event1);
    const hash2 = computeHash(GENESIS_HASH, event2);
    expect(hash1).toBe(hash2);
  });

  it("signature field is excluded from computation", () => {
    const event1 = makeEvent({ signature: null });
    const event2 = makeEvent({ signature: "hmac-sha256:abc123" });
    const hash1 = computeHash(GENESIS_HASH, event1);
    const hash2 = computeHash(GENESIS_HASH, event2);
    expect(hash1).toBe(hash2);
  });
});

describe("chain linking", () => {
  it("chain of two events", () => {
    const event1 = makeEvent({ event_id: "evt-001", prev_hash: GENESIS_HASH, hash: "" });
    const hash1 = computeHash(GENESIS_HASH, event1);

    const event2 = makeEvent({ event_id: "evt-002", prev_hash: hash1, hash: "" });
    const hash2 = computeHash(hash1, event2);

    expect(hash1).not.toBe(hash2);
    const hash2Recomputed = computeHash(hash1, event2);
    expect(hash2).toBe(hash2Recomputed);
  });

  it("chain of three events", () => {
    const event1 = makeEvent({ event_id: "evt-001", prev_hash: GENESIS_HASH, hash: "" });
    const hash1 = computeHash(GENESIS_HASH, event1);

    const event2 = makeEvent({ event_id: "evt-002", prev_hash: hash1, hash: "" });
    const hash2 = computeHash(hash1, event2);

    const event3 = makeEvent({ event_id: "evt-003", prev_hash: hash2, hash: "" });
    const hash3 = computeHash(hash2, event3);

    expect(new Set([hash1, hash2, hash3]).size).toBe(3);
  });

  it("tampered event changes hash", () => {
    const eventOriginal = makeEvent({ payload: { action: "write" }, hash: "" });
    const hashOriginal = computeHash(GENESIS_HASH, eventOriginal);

    const eventTampered = makeEvent({ payload: { action: "delete" }, hash: "" });
    const hashTampered = computeHash(GENESIS_HASH, eventTampered);

    expect(hashOriginal).not.toBe(hashTampered);
  });
});

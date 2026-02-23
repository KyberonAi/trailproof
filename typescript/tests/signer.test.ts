import { describe, it, expect } from "vitest";
import { GENESIS_HASH } from "../src/chain.js";
import { SignatureError } from "../src/errors.js";
import { SIGNATURE_PREFIX, signEvent, verifySignature } from "../src/signer.js";
import { Trailproof } from "../src/trailproof.js";
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
    hash: "abc123",
    ...overrides,
  };
}

describe("signEvent", () => {
  it("returns prefixed signature", () => {
    const event = makeEvent();
    const sig = signEvent("secret", event);
    expect(sig.startsWith(SIGNATURE_PREFIX)).toBe(true);
  });

  it("signature is deterministic", () => {
    const event = makeEvent();
    const sig1 = signEvent("secret", event);
    const sig2 = signEvent("secret", event);
    expect(sig1).toBe(sig2);
  });

  it("different keys produce different signatures", () => {
    const event = makeEvent();
    const sig1 = signEvent("key-a", event);
    const sig2 = signEvent("key-b", event);
    expect(sig1).not.toBe(sig2);
  });

  it("different events produce different signatures", () => {
    const event1 = makeEvent({ event_id: "evt-001" });
    const event2 = makeEvent({ event_id: "evt-002" });
    const sig1 = signEvent("secret", event1);
    const sig2 = signEvent("secret", event2);
    expect(sig1).not.toBe(sig2);
  });

  it("signature hex length is 64", () => {
    const event = makeEvent();
    const sig = signEvent("secret", event);
    const hexPart = sig.slice(SIGNATURE_PREFIX.length);
    expect(hexPart).toHaveLength(64);
  });
});

describe("verifySignature", () => {
  it("valid signature passes", () => {
    const event = makeEvent();
    const sig = signEvent("secret", event);
    const signedEvent = makeEvent({ signature: sig });
    expect(() => verifySignature("secret", signedEvent)).not.toThrow();
  });

  it("tampered signature raises", () => {
    const event = makeEvent();
    const sig = signEvent("secret", event);
    const tamperedSig = sig.slice(0, -4) + "dead";
    const signedEvent = makeEvent({ signature: tamperedSig });
    expect(() => verifySignature("secret", signedEvent)).toThrow(SignatureError);
    expect(() => verifySignature("secret", signedEvent)).toThrow(/signature mismatch/);
  });

  it("wrong key raises", () => {
    const event = makeEvent();
    const sig = signEvent("correct-key", event);
    const signedEvent = makeEvent({ signature: sig });
    expect(() => verifySignature("wrong-key", signedEvent)).toThrow(SignatureError);
    expect(() => verifySignature("wrong-key", signedEvent)).toThrow(/signature mismatch/);
  });

  it("missing signature raises", () => {
    const event = makeEvent();
    expect(() => verifySignature("secret", event)).toThrow(SignatureError);
    expect(() => verifySignature("secret", event)).toThrow(/missing signature/);
  });

  it("invalid prefix raises", () => {
    const event = makeEvent({ signature: "not-hmac:abcdef" });
    expect(() => verifySignature("secret", event)).toThrow(SignatureError);
    expect(() => verifySignature("secret", event)).toThrow(/invalid signature format/);
  });
});

describe("Trailproof with signing", () => {
  it("emit with signing key adds signature", () => {
    const tp = new Trailproof({ signingKey: "secret", defaultTenantId: "t" });
    const event = tp.emit({ eventType: "test", actorId: "a", payload: {} });
    expect(event.signature).not.toBeNull();
    expect(event.signature).not.toBeUndefined();
    expect(event.signature?.startsWith(SIGNATURE_PREFIX)).toBe(true);
  });

  it("emit without signing key has no signature", () => {
    const tp = new Trailproof({ defaultTenantId: "t" });
    const event = tp.emit({ eventType: "test", actorId: "a", payload: {} });
    expect(event.signature).toBeUndefined();
  });

  it("signed event is verifiable", () => {
    const tp = new Trailproof({ signingKey: "secret", defaultTenantId: "t" });
    const event = tp.emit({ eventType: "test", actorId: "a", payload: {} });
    expect(() => verifySignature("secret", event)).not.toThrow();
  });

  it("verify chain with signatures intact", () => {
    const tp = new Trailproof({ signingKey: "secret", defaultTenantId: "t" });
    for (let i = 0; i < 3; i++) {
      tp.emit({ eventType: "test", actorId: "a", payload: { n: i } });
    }
    const result = tp.verify();
    expect(result.intact).toBe(true);
  });

  it("verify detects tampered signature", () => {
    const tp = new Trailproof({ signingKey: "secret", defaultTenantId: "t" });
    for (let i = 0; i < 3; i++) {
      tp.emit({ eventType: "test", actorId: "a", payload: { n: i } });
    }

    // Tamper with signature of event 1
    const store = tp._store as Record<string, unknown>;
    const events = store["events"] as TrailEvent[];
    const original = events[1];
    if (original != null) {
      events[1] = { ...original, signature: "hmac-sha256:" + "dead".repeat(16) };
    }

    const result = tp.verify();
    expect(result.intact).toBe(false);
    expect(result.broken).toContain(1);
  });

  it("signature without key raises on verify", () => {
    const tpSigned = new Trailproof({ signingKey: "secret", defaultTenantId: "t" });
    tpSigned.emit({ eventType: "test", actorId: "a", payload: {} });

    // Create a new Trailproof without signing key but with the same store
    const tpUnsigned = new Trailproof({ defaultTenantId: "t" });
    (tpUnsigned as Record<string, unknown>)["_store"] = tpSigned._store;

    expect(() => tpUnsigned.verify()).toThrow(SignatureError);
    expect(() => tpUnsigned.verify()).toThrow(/no signing key configured/);
  });
});

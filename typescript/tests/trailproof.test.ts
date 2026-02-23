import { describe, it, expect } from "vitest";
import { GENESIS_HASH, computeHash } from "../src/chain.js";
import { ValidationError } from "../src/errors.js";
import { MemoryStore } from "../src/stores/memory.js";
import { Trailproof } from "../src/trailproof.js";

describe("Trailproof constructor", () => {
  it("default constructor uses memory store", () => {
    const tp = new Trailproof();
    expect(tp._store).toBeInstanceOf(MemoryStore);
  });

  it("explicit memory store", () => {
    const tp = new Trailproof({ store: "memory" });
    expect(tp._store).toBeInstanceOf(MemoryStore);
  });

  it("invalid store type throws ValidationError", () => {
    expect(() => new Trailproof({ store: "redis" })).toThrow(ValidationError);
    expect(() => new Trailproof({ store: "redis" })).toThrow("not supported");
  });

  it("signing key is stored", () => {
    const tp = new Trailproof({ signingKey: "secret" });
    expect(tp).toBeDefined();
  });

  it("default tenant id is stored", () => {
    const tp = new Trailproof({ defaultTenantId: "acme" });
    const event = tp.emit({ eventType: "test", actorId: "a", payload: {} });
    expect(event.tenant_id).toBe("acme");
  });
});

describe("emit happy path", () => {
  it("returns a TrailEvent", () => {
    const tp = new Trailproof({ defaultTenantId: "t" });
    const event = tp.emit({ eventType: "test", actorId: "a", payload: {} });
    expect(event.event_id).toBeDefined();
    expect(event.event_type).toBe("test");
    expect(event.actor_id).toBe("a");
    expect(event.tenant_id).toBe("t");
  });

  it("generates UUID v4 event_id", () => {
    const tp = new Trailproof({ defaultTenantId: "t" });
    const event = tp.emit({ eventType: "test", actorId: "a", payload: {} });
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
    expect(uuidRegex.test(event.event_id)).toBe(true);
  });

  it("generates ISO timestamp with milliseconds", () => {
    const tp = new Trailproof({ defaultTenantId: "t" });
    const event = tp.emit({ eventType: "test", actorId: "a", payload: {} });
    const isoRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
    expect(isoRegex.test(event.timestamp)).toBe(true);
  });

  it("first event uses genesis prev_hash", () => {
    const tp = new Trailproof({ defaultTenantId: "t" });
    const event = tp.emit({ eventType: "test", actorId: "a", payload: {} });
    expect(event.prev_hash).toBe(GENESIS_HASH);
  });

  it("computes valid hash", () => {
    const tp = new Trailproof({ defaultTenantId: "t" });
    const event = tp.emit({ eventType: "test", actorId: "a", payload: {} });
    expect(event.hash).toHaveLength(64);
    expect(/^[0-9a-f]{64}$/.test(event.hash)).toBe(true);
  });

  it("stores event", () => {
    const tp = new Trailproof({ defaultTenantId: "t" });
    tp.emit({ eventType: "test", actorId: "a", payload: {} });
    expect(tp._store.count()).toBe(1);
  });

  it("supports optional trace_id", () => {
    const tp = new Trailproof({ defaultTenantId: "t" });
    const event = tp.emit({ eventType: "test", actorId: "a", payload: {}, traceId: "tr-1" });
    expect(event.trace_id).toBe("tr-1");
  });

  it("supports optional session_id", () => {
    const tp = new Trailproof({ defaultTenantId: "t" });
    const event = tp.emit({ eventType: "test", actorId: "a", payload: {}, sessionId: "s-1" });
    expect(event.session_id).toBe("s-1");
  });

  it("omits optional fields when not set", () => {
    const tp = new Trailproof({ defaultTenantId: "t" });
    const event = tp.emit({ eventType: "test", actorId: "a", payload: {} });
    expect(event.trace_id).toBeUndefined();
    expect(event.session_id).toBeUndefined();
  });
});

describe("emit default tenant_id", () => {
  it("uses default tenant_id", () => {
    const tp = new Trailproof({ defaultTenantId: "acme" });
    const event = tp.emit({ eventType: "test", actorId: "a", payload: {} });
    expect(event.tenant_id).toBe("acme");
  });

  it("explicit tenant_id overrides default", () => {
    const tp = new Trailproof({ defaultTenantId: "acme" });
    const event = tp.emit({ eventType: "test", actorId: "a", payload: {}, tenantId: "other" });
    expect(event.tenant_id).toBe("other");
  });

  it("no tenant_id and no default throws", () => {
    const tp = new Trailproof();
    expect(() => tp.emit({ eventType: "test", actorId: "a", payload: {} })).toThrow(
      ValidationError,
    );
    expect(() => tp.emit({ eventType: "test", actorId: "a", payload: {} })).toThrow(
      "tenant_id is required",
    );
  });
});

describe("emit validation", () => {
  it("missing event_type throws", () => {
    const tp = new Trailproof({ defaultTenantId: "t" });
    expect(() => tp.emit({ eventType: "", actorId: "a", payload: {} })).toThrow(ValidationError);
  });

  it("missing actor_id throws", () => {
    const tp = new Trailproof({ defaultTenantId: "t" });
    expect(() => tp.emit({ eventType: "test", actorId: "", payload: {} })).toThrow(ValidationError);
  });

  it("missing tenant_id throws", () => {
    const tp = new Trailproof();
    expect(() => tp.emit({ eventType: "test", actorId: "a", payload: {} })).toThrow(
      ValidationError,
    );
  });

  it("error message follows format", () => {
    const tp = new Trailproof({ defaultTenantId: "t" });
    expect(() => tp.emit({ eventType: "", actorId: "a", payload: {} })).toThrow(
      "Trailproof: missing required field — event_type is required",
    );
  });
});

describe("emit chain linking", () => {
  it("second event links to first", () => {
    const tp = new Trailproof({ defaultTenantId: "t" });
    const e1 = tp.emit({ eventType: "test", actorId: "a", payload: { n: 1 } });
    const e2 = tp.emit({ eventType: "test", actorId: "a", payload: { n: 2 } });
    expect(e2.prev_hash).toBe(e1.hash);
  });

  it("three event chain", () => {
    const tp = new Trailproof({ defaultTenantId: "t" });
    const e1 = tp.emit({ eventType: "test", actorId: "a", payload: { n: 1 } });
    const e2 = tp.emit({ eventType: "test", actorId: "a", payload: { n: 2 } });
    const e3 = tp.emit({ eventType: "test", actorId: "a", payload: { n: 3 } });
    expect(e1.prev_hash).toBe(GENESIS_HASH);
    expect(e2.prev_hash).toBe(e1.hash);
    expect(e3.prev_hash).toBe(e2.hash);
  });

  it("each event has unique hash", () => {
    const tp = new Trailproof({ defaultTenantId: "t" });
    const e1 = tp.emit({ eventType: "test", actorId: "a", payload: { n: 1 } });
    const e2 = tp.emit({ eventType: "test", actorId: "a", payload: { n: 2 } });
    const e3 = tp.emit({ eventType: "test", actorId: "a", payload: { n: 3 } });
    expect(new Set([e1.hash, e2.hash, e3.hash]).size).toBe(3);
  });

  it("hash is verifiable", () => {
    const tp = new Trailproof({ defaultTenantId: "t" });
    const event = tp.emit({ eventType: "test", actorId: "a", payload: { key: "val" } });
    const eventForHash = { ...event, hash: "" };
    const expected = computeHash(event.prev_hash, eventForHash);
    expect(event.hash).toBe(expected);
  });
});

describe("emit payload", () => {
  it("empty payload", () => {
    const tp = new Trailproof({ defaultTenantId: "t" });
    const event = tp.emit({ eventType: "test", actorId: "a", payload: {} });
    expect(event.payload).toEqual({});
  });

  it("nested payload", () => {
    const tp = new Trailproof({ defaultTenantId: "t" });
    const event = tp.emit({
      eventType: "test",
      actorId: "a",
      payload: { nested: { deep: true } },
    });
    expect(event.payload).toEqual({ nested: { deep: true } });
  });

  it("payload with unicode", () => {
    const tp = new Trailproof({ defaultTenantId: "t" });
    const event = tp.emit({
      eventType: "test",
      actorId: "a",
      payload: { message: "Hello \u4e16\u754c" },
    });
    expect(event.payload).toEqual({ message: "Hello \u4e16\u754c" });
  });
});

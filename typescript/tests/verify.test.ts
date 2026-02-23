import { describe, it, expect } from "vitest";
import type { VerifyResult, TrailEvent } from "../src/types.js";
import { Trailproof } from "../src/trailproof.js";

/** Tamper with an event at the given index in the store's internal array. */
function tamperEvent(tp: Trailproof, index: number, overrides: Partial<TrailEvent>): void {
  // Access internal events array via bracket notation for testing
  const store = tp._store as Record<string, unknown>;
  const events = store["events"] as TrailEvent[];
  const original = events[index];
  if (original == null) return;
  events[index] = { ...original, ...overrides };
}

describe("verify empty chain", () => {
  it("empty chain is intact", () => {
    const tp = new Trailproof();
    const result: VerifyResult = tp.verify();
    expect(result.intact).toBe(true);
    expect(result.total).toBe(0);
    expect(result.broken).toEqual([]);
  });

  it("returns VerifyResult shape", () => {
    const tp = new Trailproof();
    const result = tp.verify();
    expect(result).toHaveProperty("intact");
    expect(result).toHaveProperty("total");
    expect(result).toHaveProperty("broken");
  });
});

describe("verify intact chain", () => {
  it("single event intact", () => {
    const tp = new Trailproof({ defaultTenantId: "t" });
    tp.emit({ eventType: "test", actorId: "a", payload: {} });
    const result = tp.verify();
    expect(result.intact).toBe(true);
    expect(result.total).toBe(1);
    expect(result.broken).toEqual([]);
  });

  it("multiple events intact", () => {
    const tp = new Trailproof({ defaultTenantId: "t" });
    for (let i = 0; i < 5; i++) {
      tp.emit({ eventType: "test", actorId: "a", payload: { n: i } });
    }
    const result = tp.verify();
    expect(result.intact).toBe(true);
    expect(result.total).toBe(5);
    expect(result.broken).toEqual([]);
  });

  it("ten events intact", () => {
    const tp = new Trailproof({ defaultTenantId: "t" });
    for (let i = 0; i < 10; i++) {
      tp.emit({ eventType: "test", actorId: "a", payload: { n: i } });
    }
    const result = tp.verify();
    expect(result.intact).toBe(true);
    expect(result.total).toBe(10);
  });
});

describe("verify tampered chain", () => {
  it("tampered first event", () => {
    const tp = new Trailproof({ defaultTenantId: "t" });
    tp.emit({ eventType: "test", actorId: "a", payload: { n: 1 } });
    tp.emit({ eventType: "test", actorId: "a", payload: { n: 2 } });
    tp.emit({ eventType: "test", actorId: "a", payload: { n: 3 } });

    tamperEvent(tp, 0, { payload: { n: 999 } });

    const result = tp.verify();
    expect(result.intact).toBe(false);
    expect(result.total).toBe(3);
    expect(result.broken).toContain(0);
  });

  it("tampered middle event", () => {
    const tp = new Trailproof({ defaultTenantId: "t" });
    for (let i = 0; i < 5; i++) {
      tp.emit({ eventType: "test", actorId: "a", payload: { n: i } });
    }

    tamperEvent(tp, 2, { payload: { n: 999 } });

    const result = tp.verify();
    expect(result.intact).toBe(false);
    expect(result.broken).toContain(2);
  });

  it("tampered last event", () => {
    const tp = new Trailproof({ defaultTenantId: "t" });
    for (let i = 0; i < 3; i++) {
      tp.emit({ eventType: "test", actorId: "a", payload: { n: i } });
    }

    tamperEvent(tp, 2, { payload: { n: 999 } });

    const result = tp.verify();
    expect(result.intact).toBe(false);
    expect(result.broken).toContain(2);
  });
});

describe("verify cascading breaks", () => {
  it("cascading from first", () => {
    const tp = new Trailproof({ defaultTenantId: "t" });
    for (let i = 0; i < 5; i++) {
      tp.emit({ eventType: "test", actorId: "a", payload: { n: i } });
    }

    tamperEvent(tp, 0, { payload: { n: 999 } });

    const result = tp.verify();
    expect(result.intact).toBe(false);
    expect(result.broken).toEqual([0, 1, 2, 3, 4]);
  });

  it("cascading from middle", () => {
    const tp = new Trailproof({ defaultTenantId: "t" });
    for (let i = 0; i < 5; i++) {
      tp.emit({ eventType: "test", actorId: "a", payload: { n: i } });
    }

    tamperEvent(tp, 2, { payload: { n: 999 } });

    const result = tp.verify();
    expect(result.intact).toBe(false);
    expect(result.broken).toEqual([2, 3, 4]);
  });

  it("cascading from second to last", () => {
    const tp = new Trailproof({ defaultTenantId: "t" });
    for (let i = 0; i < 4; i++) {
      tp.emit({ eventType: "test", actorId: "a", payload: { n: i } });
    }

    tamperEvent(tp, 2, { payload: { n: 999 } });

    const result = tp.verify();
    expect(result.broken).toEqual([2, 3]);
  });
});

describe("verify tampered hash", () => {
  it("modified hash detected", () => {
    const tp = new Trailproof({ defaultTenantId: "t" });
    tp.emit({ eventType: "test", actorId: "a", payload: {} });
    tp.emit({ eventType: "test", actorId: "a", payload: {} });

    tamperEvent(tp, 0, { hash: "deadbeef".repeat(8) });

    const result = tp.verify();
    expect(result.intact).toBe(false);
    expect(result.broken).toContain(0);
  });
});

describe("flush", () => {
  it("does not raise", () => {
    const tp = new Trailproof({ defaultTenantId: "t" });
    tp.emit({ eventType: "test", actorId: "a", payload: {} });
    expect(() => tp.flush()).not.toThrow();
  });

  it("preserves events", () => {
    const tp = new Trailproof({ defaultTenantId: "t" });
    tp.emit({ eventType: "test", actorId: "a", payload: {} });
    tp.flush();
    expect(tp._store.count()).toBe(1);
  });

  it("on empty store", () => {
    const tp = new Trailproof();
    expect(() => tp.flush()).not.toThrow();
  });
});

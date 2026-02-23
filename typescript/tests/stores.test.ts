import { describe, it, expect } from "vitest";
import { GENESIS_HASH } from "../src/chain.js";
import { MemoryStore } from "../src/stores/memory.js";
import type { TrailEvent } from "../src/types.js";

function makeEvent(overrides: Partial<TrailEvent> = {}): TrailEvent {
  return {
    event_id: "evt-001",
    event_type: "test.event",
    timestamp: "2025-01-01T00:00:00.000Z",
    actor_id: "actor-1",
    tenant_id: "tenant-1",
    payload: { key: "value" },
    prev_hash: GENESIS_HASH,
    hash: "abc123",
    ...overrides,
  };
}

describe("MemoryStore implements TrailStore", () => {
  it("is an object with all required methods", () => {
    const store = new MemoryStore();
    expect(typeof store.append).toBe("function");
    expect(typeof store.readAll).toBe("function");
    expect(typeof store.query).toBe("function");
    expect(typeof store.lastHash).toBe("function");
    expect(typeof store.count).toBe("function");
  });
});

describe("MemoryStore append and readAll", () => {
  it("empty store readAll returns empty array", () => {
    const store = new MemoryStore();
    expect(store.readAll()).toEqual([]);
  });

  it("append one event", () => {
    const store = new MemoryStore();
    const event = makeEvent();
    store.append(event);
    expect(store.readAll()).toEqual([event]);
  });

  it("append multiple events preserves order", () => {
    const store = new MemoryStore();
    const events = [
      makeEvent({ event_id: "evt-001", hash: "h1" }),
      makeEvent({ event_id: "evt-002", hash: "h2" }),
      makeEvent({ event_id: "evt-003", hash: "h3" }),
    ];
    for (const e of events) store.append(e);
    expect(store.readAll()).toEqual(events);
  });

  it("readAll returns a copy", () => {
    const store = new MemoryStore();
    store.append(makeEvent());
    const r1 = store.readAll();
    const r2 = store.readAll();
    expect(r1).toEqual(r2);
    expect(r1).not.toBe(r2);
  });
});

describe("MemoryStore lastHash", () => {
  it("empty store returns genesis hash", () => {
    const store = new MemoryStore();
    expect(store.lastHash()).toBe(GENESIS_HASH);
  });

  it("returns hash of last event", () => {
    const store = new MemoryStore();
    store.append(makeEvent({ event_id: "evt-001", hash: "hash-1" }));
    store.append(makeEvent({ event_id: "evt-002", hash: "hash-2" }));
    expect(store.lastHash()).toBe("hash-2");
  });
});

describe("MemoryStore count", () => {
  it("empty store count is 0", () => {
    const store = new MemoryStore();
    expect(store.count()).toBe(0);
  });

  it("count after appends", () => {
    const store = new MemoryStore();
    store.append(makeEvent({ event_id: "evt-001" }));
    store.append(makeEvent({ event_id: "evt-002" }));
    store.append(makeEvent({ event_id: "evt-003" }));
    expect(store.count()).toBe(3);
  });
});

describe("MemoryStore query no filters", () => {
  it("returns all events", () => {
    const store = new MemoryStore();
    store.append(makeEvent({ event_id: "evt-001", hash: "h1" }));
    store.append(makeEvent({ event_id: "evt-002", hash: "h2" }));
    const result = store.query({});
    expect(result.events).toHaveLength(2);
  });

  it("respects limit", () => {
    const store = new MemoryStore();
    for (let i = 0; i < 5; i++) {
      store.append(makeEvent({ event_id: `evt-${i}`, hash: `h${i}` }));
    }
    const result = store.query({ limit: 2 });
    expect(result.events).toHaveLength(2);
    expect(result.next_cursor).toBe("evt-1");
  });

  it("empty store returns empty", () => {
    const store = new MemoryStore();
    const result = store.query({});
    expect(result.events).toEqual([]);
    expect(result.next_cursor).toBeNull();
  });
});

describe("MemoryStore query filters", () => {
  it("filter by event_type", () => {
    const store = new MemoryStore();
    store.append(makeEvent({ event_id: "e1", event_type: "a", hash: "h1" }));
    store.append(makeEvent({ event_id: "e2", event_type: "b", hash: "h2" }));
    const result = store.query({ event_type: "a" });
    expect(result.events).toHaveLength(1);
    expect(result.events[0]?.event_id).toBe("e1");
  });

  it("filter by actor_id", () => {
    const store = new MemoryStore();
    store.append(makeEvent({ event_id: "e1", actor_id: "a1", hash: "h1" }));
    store.append(makeEvent({ event_id: "e2", actor_id: "a2", hash: "h2" }));
    const result = store.query({ actor_id: "a1" });
    expect(result.events).toHaveLength(1);
  });

  it("filter by tenant_id", () => {
    const store = new MemoryStore();
    store.append(makeEvent({ event_id: "e1", tenant_id: "t1", hash: "h1" }));
    store.append(makeEvent({ event_id: "e2", tenant_id: "t2", hash: "h2" }));
    const result = store.query({ tenant_id: "t1" });
    expect(result.events).toHaveLength(1);
  });

  it("filter by trace_id", () => {
    const store = new MemoryStore();
    store.append(makeEvent({ event_id: "e1", trace_id: "tr1", hash: "h1" }));
    store.append(makeEvent({ event_id: "e2", hash: "h2" }));
    const result = store.query({ trace_id: "tr1" });
    expect(result.events).toHaveLength(1);
  });

  it("filter by session_id", () => {
    const store = new MemoryStore();
    store.append(makeEvent({ event_id: "e1", session_id: "s1", hash: "h1" }));
    store.append(makeEvent({ event_id: "e2", hash: "h2" }));
    const result = store.query({ session_id: "s1" });
    expect(result.events).toHaveLength(1);
  });

  it("multiple filters", () => {
    const store = new MemoryStore();
    store.append(makeEvent({ event_id: "e1", event_type: "a", actor_id: "a1", hash: "h1" }));
    store.append(makeEvent({ event_id: "e2", event_type: "a", actor_id: "a2", hash: "h2" }));
    store.append(makeEvent({ event_id: "e3", event_type: "b", actor_id: "a1", hash: "h3" }));
    const result = store.query({ event_type: "a", actor_id: "a1" });
    expect(result.events).toHaveLength(1);
    expect(result.events[0]?.event_id).toBe("e1");
  });

  it("no match returns empty", () => {
    const store = new MemoryStore();
    store.append(makeEvent({ event_id: "e1", event_type: "a", hash: "h1" }));
    const result = store.query({ event_type: "nonexistent" });
    expect(result.events).toEqual([]);
  });
});

describe("MemoryStore query time range", () => {
  it("from_time filter", () => {
    const store = new MemoryStore();
    store.append(makeEvent({ event_id: "e1", timestamp: "2025-01-01T00:00:00Z", hash: "h1" }));
    store.append(makeEvent({ event_id: "e2", timestamp: "2025-06-01T00:00:00Z", hash: "h2" }));
    const result = store.query({ from_time: "2025-03-01T00:00:00Z" });
    expect(result.events).toHaveLength(1);
    expect(result.events[0]?.event_id).toBe("e2");
  });

  it("to_time filter", () => {
    const store = new MemoryStore();
    store.append(makeEvent({ event_id: "e1", timestamp: "2025-01-01T00:00:00Z", hash: "h1" }));
    store.append(makeEvent({ event_id: "e2", timestamp: "2025-06-01T00:00:00Z", hash: "h2" }));
    const result = store.query({ to_time: "2025-03-01T00:00:00Z" });
    expect(result.events).toHaveLength(1);
    expect(result.events[0]?.event_id).toBe("e1");
  });

  it("time range filter", () => {
    const store = new MemoryStore();
    store.append(makeEvent({ event_id: "e1", timestamp: "2025-01-01T00:00:00Z", hash: "h1" }));
    store.append(makeEvent({ event_id: "e2", timestamp: "2025-06-01T00:00:00Z", hash: "h2" }));
    store.append(makeEvent({ event_id: "e3", timestamp: "2025-12-01T00:00:00Z", hash: "h3" }));
    const result = store.query({
      from_time: "2025-03-01T00:00:00Z",
      to_time: "2025-09-01T00:00:00Z",
    });
    expect(result.events).toHaveLength(1);
    expect(result.events[0]?.event_id).toBe("e2");
  });
});

describe("MemoryStore query cursor pagination", () => {
  it("cursor skips to after event", () => {
    const store = new MemoryStore();
    store.append(makeEvent({ event_id: "e1", hash: "h1" }));
    store.append(makeEvent({ event_id: "e2", hash: "h2" }));
    store.append(makeEvent({ event_id: "e3", hash: "h3" }));
    const result = store.query({ cursor: "e1" });
    expect(result.events).toHaveLength(2);
    expect(result.events[0]?.event_id).toBe("e2");
  });

  it("cursor with limit", () => {
    const store = new MemoryStore();
    for (let i = 0; i < 5; i++) {
      store.append(makeEvent({ event_id: `e${i}`, hash: `h${i}` }));
    }
    const result = store.query({ cursor: "e0", limit: 2 });
    expect(result.events).toHaveLength(2);
    expect(result.events[0]?.event_id).toBe("e1");
    expect(result.next_cursor).toBe("e2");
  });

  it("nonexistent cursor returns empty", () => {
    const store = new MemoryStore();
    store.append(makeEvent({ event_id: "e1", hash: "h1" }));
    const result = store.query({ cursor: "nonexistent" });
    expect(result.events).toEqual([]);
    expect(result.next_cursor).toBeNull();
  });

  it("cursor at last event returns empty", () => {
    const store = new MemoryStore();
    store.append(makeEvent({ event_id: "e1", hash: "h1" }));
    store.append(makeEvent({ event_id: "e2", hash: "h2" }));
    const result = store.query({ cursor: "e2" });
    expect(result.events).toEqual([]);
  });
});

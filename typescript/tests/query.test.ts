import { describe, it, expect } from "vitest";
import { Trailproof } from "../src/trailproof.js";

function populatedTp(): Trailproof {
  const tp = new Trailproof({ defaultTenantId: "acme" });
  tp.emit({
    eventType: "type.a",
    actorId: "alice",
    payload: { n: 1 },
    traceId: "trace-1",
    sessionId: "sess-1",
  });
  tp.emit({
    eventType: "type.b",
    actorId: "bob",
    payload: { n: 2 },
    traceId: "trace-1",
    sessionId: "sess-2",
  });
  tp.emit({
    eventType: "type.a",
    actorId: "alice",
    payload: { n: 3 },
    traceId: "trace-2",
    sessionId: "sess-1",
  });
  tp.emit({
    eventType: "type.b",
    actorId: "bob",
    payload: { n: 4 },
    traceId: "trace-2",
    sessionId: "sess-2",
  });
  tp.emit({ eventType: "type.a", actorId: "carol", payload: { n: 5 }, traceId: "trace-1" });
  tp.emit({ eventType: "type.c", actorId: "alice", payload: { n: 6 } });
  return tp;
}

describe("query no filters", () => {
  it("returns all events", () => {
    const tp = populatedTp();
    const result = tp.query();
    expect(result.events).toHaveLength(6);
  });

  it("no next_cursor when all fit", () => {
    const tp = populatedTp();
    const result = tp.query();
    expect(result.next_cursor).toBeNull();
  });

  it("empty store returns empty", () => {
    const tp = new Trailproof();
    const result = tp.query();
    expect(result.events).toEqual([]);
    expect(result.next_cursor).toBeNull();
  });
});

describe("query single filter", () => {
  it("filter by event_type", () => {
    const tp = populatedTp();
    const result = tp.query({ eventType: "type.a" });
    expect(result.events).toHaveLength(3);
    expect(result.events.every((e) => e.event_type === "type.a")).toBe(true);
  });

  it("filter by actor_id", () => {
    const tp = populatedTp();
    const result = tp.query({ actorId: "alice" });
    expect(result.events).toHaveLength(3);
    expect(result.events.every((e) => e.actor_id === "alice")).toBe(true);
  });

  it("filter by tenant_id", () => {
    const tp = populatedTp();
    const result = tp.query({ tenantId: "acme" });
    expect(result.events).toHaveLength(6);
  });

  it("filter by trace_id", () => {
    const tp = populatedTp();
    const result = tp.query({ traceId: "trace-1" });
    expect(result.events).toHaveLength(3);
    expect(result.events.every((e) => e.trace_id === "trace-1")).toBe(true);
  });

  it("filter by session_id", () => {
    const tp = populatedTp();
    const result = tp.query({ sessionId: "sess-1" });
    expect(result.events).toHaveLength(2);
    expect(result.events.every((e) => e.session_id === "sess-1")).toBe(true);
  });

  it("no match returns empty", () => {
    const tp = populatedTp();
    const result = tp.query({ eventType: "nonexistent" });
    expect(result.events).toEqual([]);
  });
});

describe("query multiple filters", () => {
  it("event_type and actor_id", () => {
    const tp = populatedTp();
    const result = tp.query({ eventType: "type.a", actorId: "alice" });
    expect(result.events).toHaveLength(2);
  });

  it("trace_id and session_id", () => {
    const tp = populatedTp();
    const result = tp.query({ traceId: "trace-1", sessionId: "sess-1" });
    expect(result.events).toHaveLength(1);
  });
});

describe("query time range", () => {
  it("from_time filter", () => {
    const tp = new Trailproof({ defaultTenantId: "t" });
    const events = [];
    for (let i = 0; i < 3; i++) {
      events.push(tp.emit({ eventType: "test", actorId: "a", payload: { n: i } }));
    }
    const fromTime = events[1]?.timestamp ?? "";
    const result = tp.query({ fromTime });
    expect(result.events.length).toBeGreaterThanOrEqual(2);
  });

  it("to_time filter", () => {
    const tp = new Trailproof({ defaultTenantId: "t" });
    const events = [];
    for (let i = 0; i < 3; i++) {
      events.push(tp.emit({ eventType: "test", actorId: "a", payload: { n: i } }));
    }
    const toTime = events[0]?.timestamp ?? "";
    const result = tp.query({ toTime });
    expect(result.events.length).toBeGreaterThanOrEqual(1);
  });
});

describe("query pagination", () => {
  it("limit restricts results", () => {
    const tp = populatedTp();
    const result = tp.query({ limit: 2 });
    expect(result.events).toHaveLength(2);
    expect(result.next_cursor).not.toBeNull();
  });

  it("cursor resumes from event", () => {
    const tp = populatedTp();
    const page1 = tp.query({ limit: 2 });
    expect(page1.next_cursor).not.toBeNull();
    const page2 = tp.query({ limit: 2, cursor: page1.next_cursor ?? undefined });
    expect(page2.events).toHaveLength(2);
    const page1Ids = new Set(page1.events.map((e) => e.event_id));
    const page2Ids = new Set(page2.events.map((e) => e.event_id));
    for (const id of page1Ids) {
      expect(page2Ids.has(id)).toBe(false);
    }
  });

  it("paginate through all", () => {
    const tp = populatedTp();
    const allIds = new Set<string>();
    let cursor: string | undefined;
    for (;;) {
      const result = tp.query({ limit: 2, cursor });
      for (const e of result.events) {
        allIds.add(e.event_id);
      }
      if (result.next_cursor == null) break;
      cursor = result.next_cursor;
    }
    expect(allIds.size).toBe(6);
  });

  it("nonexistent cursor returns empty", () => {
    const tp = populatedTp();
    const result = tp.query({ cursor: "nonexistent-id" });
    expect(result.events).toEqual([]);
    expect(result.next_cursor).toBeNull();
  });
});

describe("getTrace", () => {
  it("returns matching events", () => {
    const tp = populatedTp();
    const events = tp.getTrace("trace-1");
    expect(events).toHaveLength(3);
    expect(events.every((e) => e.trace_id === "trace-1")).toBe(true);
  });

  it("ordered by timestamp", () => {
    const tp = populatedTp();
    const events = tp.getTrace("trace-1");
    const timestamps = events.map((e) => e.timestamp);
    expect(timestamps).toEqual([...timestamps].sort());
  });

  it("no matching trace returns empty", () => {
    const tp = populatedTp();
    const events = tp.getTrace("nonexistent");
    expect(events).toEqual([]);
  });

  it("single event trace", () => {
    const tp = new Trailproof({ defaultTenantId: "t" });
    tp.emit({ eventType: "test", actorId: "a", payload: {}, traceId: "solo" });
    tp.emit({ eventType: "test", actorId: "a", payload: {} });
    const events = tp.getTrace("solo");
    expect(events).toHaveLength(1);
    expect(events[0]?.trace_id).toBe("solo");
  });
});

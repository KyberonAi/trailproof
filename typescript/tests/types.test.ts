import { describe, it, expect } from "vitest";
import type { TrailEvent, QueryFilters, QueryResult, VerifyResult } from "../src/types.js";

describe("TrailEvent", () => {
  it("creates with all fields", () => {
    const event: TrailEvent = {
      event_id: "evt-001",
      event_type: "test.event",
      timestamp: "2025-01-01T00:00:00Z",
      actor_id: "actor-1",
      tenant_id: "tenant-1",
      payload: { key: "value" },
      prev_hash: "0".repeat(64),
      hash: "abc123",
      trace_id: "trace-1",
      session_id: "session-1",
      signature: "hmac-sha256:abc",
    };
    expect(event.event_id).toBe("evt-001");
    expect(event.event_type).toBe("test.event");
    expect(event.trace_id).toBe("trace-1");
    expect(event.session_id).toBe("session-1");
    expect(event.signature).toBe("hmac-sha256:abc");
  });

  it("optional fields default to undefined", () => {
    const event: TrailEvent = {
      event_id: "evt-001",
      event_type: "test.event",
      timestamp: "2025-01-01T00:00:00Z",
      actor_id: "actor-1",
      tenant_id: "tenant-1",
      payload: { key: "value" },
      prev_hash: "0".repeat(64),
      hash: "abc123",
    };
    expect(event.trace_id).toBeUndefined();
    expect(event.session_id).toBeUndefined();
    expect(event.signature).toBeUndefined();
  });

  it("supports equality comparison", () => {
    const a: TrailEvent = {
      event_id: "evt-001",
      event_type: "test",
      timestamp: "2025-01-01T00:00:00Z",
      actor_id: "a",
      tenant_id: "t",
      payload: {},
      prev_hash: "0".repeat(64),
      hash: "abc",
    };
    const b: TrailEvent = { ...a };
    expect(a).toEqual(b);
  });

  it("supports nested payload objects", () => {
    const event: TrailEvent = {
      event_id: "evt-001",
      event_type: "test",
      timestamp: "2025-01-01T00:00:00Z",
      actor_id: "a",
      tenant_id: "t",
      payload: { nested: { deep: true } },
      prev_hash: "0".repeat(64),
      hash: "abc",
    };
    expect(event.payload).toEqual({ nested: { deep: true } });
  });
});

describe("QueryFilters", () => {
  it("all fields are optional", () => {
    const filters: QueryFilters = {};
    expect(filters.event_type).toBeUndefined();
    expect(filters.actor_id).toBeUndefined();
    expect(filters.tenant_id).toBeUndefined();
    expect(filters.trace_id).toBeUndefined();
    expect(filters.session_id).toBeUndefined();
    expect(filters.from_time).toBeUndefined();
    expect(filters.to_time).toBeUndefined();
    expect(filters.limit).toBeUndefined();
    expect(filters.cursor).toBeUndefined();
  });

  it("accepts custom values", () => {
    const filters: QueryFilters = {
      event_type: "test",
      actor_id: "actor-1",
      tenant_id: "tenant-1",
      trace_id: "trace-1",
      session_id: "session-1",
      from_time: "2025-01-01T00:00:00Z",
      to_time: "2025-12-31T23:59:59Z",
      limit: 50,
      cursor: "evt-050",
    };
    expect(filters.event_type).toBe("test");
    expect(filters.limit).toBe(50);
    expect(filters.cursor).toBe("evt-050");
  });
});

describe("QueryResult", () => {
  it("holds events and next_cursor", () => {
    const result: QueryResult = {
      events: [],
      next_cursor: null,
    };
    expect(result.events).toEqual([]);
    expect(result.next_cursor).toBeNull();
  });

  it("holds events with cursor", () => {
    const event: TrailEvent = {
      event_id: "evt-001",
      event_type: "test",
      timestamp: "2025-01-01T00:00:00Z",
      actor_id: "a",
      tenant_id: "t",
      payload: {},
      prev_hash: "0".repeat(64),
      hash: "abc",
    };
    const result: QueryResult = {
      events: [event],
      next_cursor: "evt-001",
    };
    expect(result.events).toHaveLength(1);
    expect(result.next_cursor).toBe("evt-001");
  });
});

describe("VerifyResult", () => {
  it("represents intact chain", () => {
    const result: VerifyResult = {
      intact: true,
      total: 5,
      broken: [],
    };
    expect(result.intact).toBe(true);
    expect(result.total).toBe(5);
    expect(result.broken).toEqual([]);
  });

  it("represents broken chain", () => {
    const result: VerifyResult = {
      intact: false,
      total: 5,
      broken: [2, 3, 4],
    };
    expect(result.intact).toBe(false);
    expect(result.broken).toEqual([2, 3, 4]);
  });

  it("represents empty chain", () => {
    const result: VerifyResult = {
      intact: true,
      total: 0,
      broken: [],
    };
    expect(result.intact).toBe(true);
    expect(result.total).toBe(0);
  });
});

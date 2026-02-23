import { describe, it, expect, vi } from "vitest";
import { existsSync, readFileSync, writeFileSync, chmodSync, statSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { mkdtempSync } from "node:fs";
import { GENESIS_HASH } from "../src/chain.js";
import { StoreError } from "../src/errors.js";
import { JsonlStore } from "../src/stores/jsonl.js";
import { Trailproof } from "../src/trailproof.js";
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

function tmpPath(): string {
  const dir = mkdtempSync(join(tmpdir(), "trailproof-test-"));
  return join(dir, "events.jsonl");
}

describe("JsonlStore creation", () => {
  it("creates file on first append", () => {
    const path = tmpPath();
    const store = new JsonlStore(path);
    expect(existsSync(path)).toBe(false);
    store.append(makeEvent());
    expect(existsSync(path)).toBe(true);
  });

  it("file has 0o600 permissions", () => {
    const path = tmpPath();
    const store = new JsonlStore(path);
    store.append(makeEvent());
    const mode = statSync(path).mode & 0o777;
    expect(mode).toBe(0o600);
  });

  it("empty store has no file", () => {
    const path = tmpPath();
    const store = new JsonlStore(path);
    expect(store.count()).toBe(0);
    expect(store.readAll()).toEqual([]);
  });
});

describe("JsonlStore append and read", () => {
  it("append one event", () => {
    const path = tmpPath();
    const store = new JsonlStore(path);
    const event = makeEvent();
    store.append(event);
    expect(store.count()).toBe(1);
    expect(store.readAll()).toEqual([event]);
  });

  it("append multiple events", () => {
    const path = tmpPath();
    const store = new JsonlStore(path);
    const events = [
      makeEvent({ event_id: "evt-001", hash: "hash-1" }),
      makeEvent({ event_id: "evt-002", hash: "hash-2" }),
      makeEvent({ event_id: "evt-003", hash: "hash-3" }),
    ];
    for (const event of events) {
      store.append(event);
    }
    expect(store.count()).toBe(3);
    expect(store.readAll()).toEqual(events);
  });

  it("file contains one JSON per line", () => {
    const path = tmpPath();
    const store = new JsonlStore(path);
    store.append(makeEvent({ event_id: "evt-001" }));
    store.append(makeEvent({ event_id: "evt-002" }));
    const content = readFileSync(path, "utf-8");
    const lines = content.split("\n").filter((l) => l.trim());
    expect(lines).toHaveLength(2);
    for (const line of lines) {
      expect(() => JSON.parse(line)).not.toThrow();
    }
  });

  it("readAll returns copy", () => {
    const path = tmpPath();
    const store = new JsonlStore(path);
    store.append(makeEvent());
    const result1 = store.readAll();
    const result2 = store.readAll();
    expect(result1).toEqual(result2);
    expect(result1).not.toBe(result2);
  });
});

describe("JsonlStore lastHash", () => {
  it("empty store returns genesis", () => {
    const path = tmpPath();
    const store = new JsonlStore(path);
    expect(store.lastHash()).toBe(GENESIS_HASH);
  });

  it("returns hash of last event", () => {
    const path = tmpPath();
    const store = new JsonlStore(path);
    store.append(makeEvent({ event_id: "evt-001", hash: "hash-1" }));
    store.append(makeEvent({ event_id: "evt-002", hash: "hash-2" }));
    expect(store.lastHash()).toBe("hash-2");
  });
});

describe("JsonlStore recovery", () => {
  it("recovers events on init", () => {
    const path = tmpPath();
    const event = makeEvent();
    writeFileSync(path, JSON.stringify(event) + "\n");
    const store = new JsonlStore(path);
    expect(store.count()).toBe(1);
    expect(store.readAll()[0]?.event_id).toBe("evt-001");
  });

  it("recovers last hash on init", () => {
    const path = tmpPath();
    const event = makeEvent({ hash: "recovered-hash" });
    writeFileSync(path, JSON.stringify(event) + "\n");
    const store = new JsonlStore(path);
    expect(store.lastHash()).toBe("recovered-hash");
  });

  it("recovers count on init", () => {
    const path = tmpPath();
    const lines: string[] = [];
    for (let i = 0; i < 5; i++) {
      lines.push(JSON.stringify(makeEvent({ event_id: `evt-${i}`, hash: `hash-${i}` })));
    }
    writeFileSync(path, lines.join("\n") + "\n");
    const store = new JsonlStore(path);
    expect(store.count()).toBe(5);
  });

  it("append after recovery continues chain", () => {
    const path = tmpPath();
    const event1 = makeEvent({ event_id: "evt-001", hash: "hash-1" });
    writeFileSync(path, JSON.stringify(event1) + "\n");
    const store = new JsonlStore(path);
    const event2 = makeEvent({ event_id: "evt-002", hash: "hash-2" });
    store.append(event2);
    expect(store.count()).toBe(2);
    expect(store.lastHash()).toBe("hash-2");
    const content = readFileSync(path, "utf-8");
    const lines = content.split("\n").filter((l) => l.trim());
    expect(lines).toHaveLength(2);
  });
});

describe("JsonlStore corrupt lines", () => {
  it("skips corrupt line", () => {
    const path = tmpPath();
    const event = makeEvent({ event_id: "evt-001" });
    const event2 = makeEvent({ event_id: "evt-002", hash: "hash-2" });
    writeFileSync(
      path,
      [JSON.stringify(event), "this is not valid json", JSON.stringify(event2)].join("\n") + "\n",
    );
    const store = new JsonlStore(path);
    expect(store.count()).toBe(2);
  });

  it("tracks corrupt line indices", () => {
    const path = tmpPath();
    const event = makeEvent();
    const event2 = makeEvent({ event_id: "evt-002", hash: "hash-2" });
    writeFileSync(
      path,
      [JSON.stringify(event), "corrupt line one", "corrupt line two", JSON.stringify(event2)].join(
        "\n",
      ) + "\n",
    );
    const store = new JsonlStore(path);
    expect(store.corruptLines).toEqual([1, 2]);
  });

  it("no corrupt lines in clean file", () => {
    const path = tmpPath();
    const event = makeEvent();
    writeFileSync(path, JSON.stringify(event) + "\n");
    const store = new JsonlStore(path);
    expect(store.corruptLines).toEqual([]);
  });

  it("skips empty lines", () => {
    const path = tmpPath();
    const event = makeEvent();
    writeFileSync(path, JSON.stringify(event) + "\n\n\n");
    const store = new JsonlStore(path);
    expect(store.count()).toBe(1);
    expect(store.corruptLines).toEqual([]);
  });

  it("corrupt JSON with valid structure", () => {
    const path = tmpPath();
    writeFileSync(path, '{"not_a_field": "value"}\n');
    const store = new JsonlStore(path);
    expect(store.count()).toBe(0);
    expect(store.corruptLines).toEqual([0]);
  });

  it("logs warning on corrupt line", () => {
    const path = tmpPath();
    writeFileSync(path, "not json\n");
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    new JsonlStore(path);
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("corrupt line 0"));
    warnSpy.mockRestore();
  });
});

describe("JsonlStore query", () => {
  it("query all", () => {
    const path = tmpPath();
    const store = new JsonlStore(path);
    store.append(makeEvent({ event_id: "evt-001", hash: "h1" }));
    store.append(makeEvent({ event_id: "evt-002", hash: "h2" }));
    const result = store.query({});
    expect(result.events).toHaveLength(2);
  });

  it("query with filter", () => {
    const path = tmpPath();
    const store = new JsonlStore(path);
    store.append(makeEvent({ event_id: "evt-001", event_type: "a", hash: "h1" }));
    store.append(makeEvent({ event_id: "evt-002", event_type: "b", hash: "h2" }));
    const result = store.query({ event_type: "a" });
    expect(result.events).toHaveLength(1);
    expect(result.events[0]?.event_id).toBe("evt-001");
  });

  it("query with cursor", () => {
    const path = tmpPath();
    const store = new JsonlStore(path);
    store.append(makeEvent({ event_id: "evt-001", hash: "h1" }));
    store.append(makeEvent({ event_id: "evt-002", hash: "h2" }));
    store.append(makeEvent({ event_id: "evt-003", hash: "h3" }));
    const result = store.query({ cursor: "evt-001" });
    expect(result.events).toHaveLength(2);
    expect(result.events[0]?.event_id).toBe("evt-002");
  });

  it("query with limit", () => {
    const path = tmpPath();
    const store = new JsonlStore(path);
    for (let i = 0; i < 5; i++) {
      store.append(makeEvent({ event_id: `evt-${i}`, hash: `h${i}` }));
    }
    const result = store.query({ limit: 2 });
    expect(result.events).toHaveLength(2);
    expect(result.next_cursor).toBe("evt-1");
  });
});

describe("JsonlStore with Trailproof", () => {
  it("emit and verify", () => {
    const path = tmpPath();
    const tp = new Trailproof({ store: "jsonl", path, defaultTenantId: "t" });
    for (let i = 0; i < 3; i++) {
      tp.emit({ eventType: "test", actorId: "a", payload: { n: i } });
    }
    const result = tp.verify();
    expect(result.intact).toBe(true);
    expect(result.total).toBe(3);
  });

  it("persist and reload", () => {
    const path = tmpPath();
    const tp1 = new Trailproof({ store: "jsonl", path, defaultTenantId: "t" });
    tp1.emit({ eventType: "test", actorId: "a", payload: { n: 1 } });
    tp1.emit({ eventType: "test", actorId: "a", payload: { n: 2 } });

    const tp2 = new Trailproof({ store: "jsonl", path, defaultTenantId: "t" });
    expect(tp2._store.count()).toBe(2);
    const result = tp2.verify();
    expect(result.intact).toBe(true);
  });

  it("continue chain after reload", () => {
    const path = tmpPath();
    const tp1 = new Trailproof({ store: "jsonl", path, defaultTenantId: "t" });
    tp1.emit({ eventType: "test", actorId: "a", payload: { n: 1 } });

    const tp2 = new Trailproof({ store: "jsonl", path, defaultTenantId: "t" });
    tp2.emit({ eventType: "test", actorId: "a", payload: { n: 2 } });

    const tp3 = new Trailproof({ store: "jsonl", path, defaultTenantId: "t" });
    const result = tp3.verify();
    expect(result.intact).toBe(true);
    expect(result.total).toBe(2);
  });
});

describe("JsonlStore error handling", () => {
  it("write to bad path raises", () => {
    const store = new JsonlStore("/nonexistent/dir/events.jsonl");
    expect(() => store.append(makeEvent())).toThrow(StoreError);
    expect(() => store.append(makeEvent())).toThrow(/write failed/);
  });

  it("read from unreadable file raises", () => {
    const path = tmpPath();
    writeFileSync(path, "data\n");
    chmodSync(path, 0o000);
    try {
      expect(() => new JsonlStore(path)).toThrow(StoreError);
      expect(() => new JsonlStore(path)).toThrow(/read failed/);
    } finally {
      chmodSync(path, 0o600);
    }
  });
});

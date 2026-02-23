/**
 * Append-only JSONL file store for trail events.
 */

import { appendFileSync, closeSync, existsSync, openSync, readFileSync, writeSync } from "node:fs";
import { GENESIS_HASH } from "../chain.js";
import { StoreError } from "../errors.js";
import type { QueryFilters, QueryResult, TrailEvent } from "../types.js";
import type { TrailStore } from "./base.js";

const DEFAULT_LIMIT = 100;
const FILE_PERMISSIONS = 0o600;

/**
 * Persistent store that writes one JSON object per line to a JSONL file.
 *
 * Append-only. File is created with 0o600 permissions on first write.
 * On init, reads any existing file to recover last_hash and count.
 * Corrupt lines are skipped with a warning.
 */
export class JsonlStore implements TrailStore {
  private readonly path: string;
  private events: TrailEvent[] = [];
  private _corruptLines: number[] = [];

  constructor(path: string) {
    this.path = path;
    this.loadExisting();
  }

  /** Append a single event to the JSONL file. */
  append(event: TrailEvent): void {
    const line = JSON.stringify(event) + "\n";
    try {
      if (!existsSync(this.path)) {
        const fd = openSync(this.path, "wx", FILE_PERMISSIONS);
        writeSync(fd, line, undefined, "utf-8");
        closeSync(fd);
      } else {
        appendFileSync(this.path, line, { encoding: "utf-8" });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      throw new StoreError(`Trailproof: write failed — ${message}`);
    }
    this.events.push(event);
  }

  /** Return all events in insertion order. */
  readAll(): TrailEvent[] {
    return [...this.events];
  }

  /** Query events with optional filters and cursor pagination. */
  query(filters: QueryFilters): QueryResult {
    let events: TrailEvent[] = this.events;

    // Apply cursor: skip events up to and including the cursor event_id
    if (filters.cursor != null) {
      const cursorIndex = events.findIndex((e) => e.event_id === filters.cursor);
      if (cursorIndex === -1) {
        return { events: [], next_cursor: null };
      }
      events = events.slice(cursorIndex + 1);
    }

    // Apply filters
    if (filters.event_type != null) {
      events = events.filter((e) => e.event_type === filters.event_type);
    }
    if (filters.actor_id != null) {
      events = events.filter((e) => e.actor_id === filters.actor_id);
    }
    if (filters.tenant_id != null) {
      events = events.filter((e) => e.tenant_id === filters.tenant_id);
    }
    if (filters.trace_id != null) {
      events = events.filter((e) => e.trace_id === filters.trace_id);
    }
    if (filters.session_id != null) {
      events = events.filter((e) => e.session_id === filters.session_id);
    }
    if (filters.from_time != null) {
      const fromTime = filters.from_time;
      events = events.filter((e) => e.timestamp >= fromTime);
    }
    if (filters.to_time != null) {
      const toTime = filters.to_time;
      events = events.filter((e) => e.timestamp <= toTime);
    }

    // Apply limit and determine next_cursor
    const limit = filters.limit ?? DEFAULT_LIMIT;
    if (events.length > limit) {
      const cursorEvent = events[limit - 1];
      const nextCursor = cursorEvent ? cursorEvent.event_id : null;
      events = events.slice(0, limit);
      return { events, next_cursor: nextCursor };
    }

    return { events, next_cursor: null };
  }

  /** Return hash of the last event, or genesis hash if empty. */
  lastHash(): string {
    if (this.events.length === 0) {
      return GENESIS_HASH;
    }
    const last = this.events[this.events.length - 1];
    return last ? last.hash : GENESIS_HASH;
  }

  /** Return total number of stored events. */
  count(): number {
    return this.events.length;
  }

  /** Return indices of corrupt lines found during file load. */
  get corruptLines(): number[] {
    return [...this._corruptLines];
  }

  /** Load events from an existing JSONL file. */
  private loadExisting(): void {
    if (!existsSync(this.path)) {
      return;
    }

    let content: string;
    try {
      content = readFileSync(this.path, { encoding: "utf-8" });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      throw new StoreError(`Trailproof: read failed — ${message}`);
    }

    const lines = content.split("\n");
    for (let lineNum = 0; lineNum < lines.length; lineNum++) {
      const line = lines[lineNum];
      const stripped = line?.trim();
      if (!stripped) {
        continue;
      }

      try {
        const data: unknown = JSON.parse(stripped);
        if (!isValidTrailEvent(data)) {
          this._corruptLines.push(lineNum);
          console.warn(
            `Trailproof: corrupt line ${lineNum} in ${this.path} — missing required fields`,
          );
          continue;
        }
        this.events.push(data);
      } catch {
        this._corruptLines.push(lineNum);
        console.warn(`Trailproof: corrupt line ${lineNum} in ${this.path} — invalid JSON`);
      }
    }
  }
}

/** Check that a parsed JSON object has all required TrailEvent fields. */
function isValidTrailEvent(data: unknown): data is TrailEvent {
  if (typeof data !== "object" || data === null) return false;
  const record = data as Record<string, unknown>;
  return (
    typeof record["event_id"] === "string" &&
    typeof record["event_type"] === "string" &&
    typeof record["timestamp"] === "string" &&
    typeof record["actor_id"] === "string" &&
    typeof record["tenant_id"] === "string" &&
    typeof record["payload"] === "object" &&
    record["payload"] !== null &&
    typeof record["prev_hash"] === "string" &&
    typeof record["hash"] === "string"
  );
}

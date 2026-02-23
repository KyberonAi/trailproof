/**
 * In-memory trail event store.
 */

import { GENESIS_HASH } from "../chain.js";
import type { QueryFilters, QueryResult, TrailEvent } from "../types.js";
import type { TrailStore } from "./base.js";

const DEFAULT_LIMIT = 100;

/**
 * In-memory store that keeps events in an array.
 *
 * Events are lost when the process exits. Useful for testing
 * and short-lived applications.
 */
export class MemoryStore implements TrailStore {
  private events: TrailEvent[] = [];

  /** Append a single event to the in-memory array. */
  append(event: TrailEvent): void {
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
}

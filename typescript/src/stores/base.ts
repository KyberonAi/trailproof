/**
 * Abstract store interface for trail events.
 */

import type { QueryFilters, QueryResult, TrailEvent } from "../types.js";

/**
 * Append-only storage backend for trail events.
 *
 * All store implementations must implement these five methods.
 * Stores are append-only — events cannot be modified or deleted.
 */
export interface TrailStore {
  /** Append a single event to the store. */
  append(event: TrailEvent): void;

  /** Return all events in insertion order. */
  readAll(): TrailEvent[];

  /** Query events with optional filters and pagination. */
  query(filters: QueryFilters): QueryResult;

  /** Return the hash of the most recent event, or genesis hash if empty. */
  lastHash(): string;

  /** Return the total number of stored events. */
  count(): number;
}

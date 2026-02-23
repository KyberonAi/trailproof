/**
 * Trailproof facade class — the main public API.
 */

import { randomUUID } from "node:crypto";
import { GENESIS_HASH, computeHash } from "./chain.js";
import { SignatureError, ValidationError } from "./errors.js";
import type { TrailStore } from "./stores/base.js";
import { MemoryStore } from "./stores/memory.js";
import type { QueryFilters, QueryResult, TrailEvent, VerifyResult } from "./types.js";

/** Options for constructing a Trailproof instance. */
export interface TrailproofOptions {
  /** Store type — "memory" (default) or "jsonl". */
  store?: string;
  /** File path for JSONL store. Required when store="jsonl". */
  path?: string;
  /** Optional HMAC-SHA256 key for event signing. */
  signingKey?: string;
  /** Default tenant_id used when emit() is called without one. */
  defaultTenantId?: string;
}

/** Options for querying events. */
export interface QueryOptions {
  /** Filter by exact event type match. */
  eventType?: string;
  /** Filter by exact actor ID match. */
  actorId?: string;
  /** Filter by exact tenant ID match. */
  tenantId?: string;
  /** Filter by exact trace ID match. */
  traceId?: string;
  /** Filter by exact session ID match. */
  sessionId?: string;
  /** Include events at or after this ISO-8601 timestamp. */
  fromTime?: string;
  /** Include events at or before this ISO-8601 timestamp. */
  toTime?: string;
  /** Maximum number of events to return (default 100). */
  limit?: number;
  /** Resume pagination from this event_id. */
  cursor?: string;
}

/** Options for emitting a new event. */
export interface EmitOptions {
  /** Namespaced event type (e.g., "memproof.memory.write"). */
  eventType: string;
  /** Who performed the action. */
  actorId: string;
  /** Domain-specific data (stored opaquely). */
  payload: Record<string, unknown>;
  /** Tenant/org isolation key. Falls back to defaultTenantId. */
  tenantId?: string;
  /** Optional cross-system correlation ID. */
  traceId?: string;
  /** Optional session grouping ID. */
  sessionId?: string;
}

/**
 * Tamper-evident audit trail using hash chains and optional HMAC signing.
 *
 * The main entry point for recording, querying, and verifying events.
 */
export class Trailproof {
  /** @internal */
  readonly _store: TrailStore;
  private readonly _signingKey: string | undefined;
  private readonly defaultTenantId: string | undefined;

  constructor(options: TrailproofOptions = {}) {
    const storeType = options.store ?? "memory";
    this._signingKey = options.signingKey;
    this.defaultTenantId = options.defaultTenantId;

    if (storeType === "memory") {
      this._store = new MemoryStore();
    } else if (storeType === "jsonl") {
      if (!options.path) {
        throw new ValidationError(
          "Trailproof: missing required parameter — path is required for jsonl store",
        );
      }
      // Lazy import — JsonlStore will be implemented in Task 16
      throw new ValidationError("Trailproof: jsonl store not yet implemented in TypeScript");
    } else {
      throw new ValidationError(`Trailproof: invalid store type — '${storeType}' is not supported`);
    }
  }

  /**
   * Record a new event in the audit trail.
   *
   * Validates required fields, generates event_id and timestamp,
   * computes the hash chain link, and appends to the store.
   */
  emit(options: EmitOptions): TrailEvent {
    // Resolve tenant_id
    const tenantId = options.tenantId || this.defaultTenantId;

    // Validate required fields
    this.validateRequired("event_type", options.eventType);
    this.validateRequired("actor_id", options.actorId);
    this.validateRequired("tenant_id", tenantId);

    // Generate auto fields
    const eventId = randomUUID();
    const now = new Date();
    const timestamp = now.toISOString().replace(/(\.\d{3})\d*Z$/, "$1Z");

    // Get previous hash for chain linking
    const prevHash = this._store.lastHash();

    // Build event without hash first (hash field is placeholder)
    const eventForHash: TrailEvent = {
      event_id: eventId,
      event_type: options.eventType,
      timestamp,
      actor_id: options.actorId,
      tenant_id: tenantId as string,
      payload: options.payload,
      prev_hash: prevHash,
      hash: "",
    };

    // Compute hash
    const eventHash = computeHash(prevHash, eventForHash);

    // Build final event with real hash and optional fields
    const event: TrailEvent = {
      event_id: eventId,
      event_type: options.eventType,
      timestamp,
      actor_id: options.actorId,
      tenant_id: tenantId as string,
      payload: options.payload,
      prev_hash: prevHash,
      hash: eventHash,
      ...(options.traceId != null ? { trace_id: options.traceId } : {}),
      ...(options.sessionId != null ? { session_id: options.sessionId } : {}),
    };

    // Append to store
    this._store.append(event);

    return event;
  }

  /**
   * Query events with optional filters and cursor pagination.
   *
   * All filter parameters are optional. No filters returns all events
   * up to the limit.
   */
  query(options: QueryOptions = {}): QueryResult {
    const filters: QueryFilters = {
      event_type: options.eventType,
      actor_id: options.actorId,
      tenant_id: options.tenantId,
      trace_id: options.traceId,
      session_id: options.sessionId,
      from_time: options.fromTime,
      to_time: options.toTime,
      limit: options.limit,
      cursor: options.cursor,
    };
    return this._store.query(filters);
  }

  /**
   * Return all events with the given trace_id, ordered by timestamp.
   */
  getTrace(traceId: string): TrailEvent[] {
    const result = this._store.query({ trace_id: traceId, limit: 10_000 });
    return [...result.events].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  }

  /**
   * Verify the integrity of the entire hash chain.
   *
   * Walks every event and recomputes its hash. If any event's hash
   * does not match, that index and all subsequent indices are reported
   * as broken (cascading breaks).
   */
  verify(): VerifyResult {
    const events = this._store.readAll();
    const total = events.length;

    if (total === 0) {
      return { intact: true, total: 0, broken: [] };
    }

    const broken: number[] = [];
    let prevHash = GENESIS_HASH;
    let chainBroken = false;

    for (let i = 0; i < events.length; i++) {
      const event = events[i];
      if (event == null) continue;

      if (chainBroken) {
        broken.push(i);
        continue;
      }

      // Check for signature without key
      if (event.signature != null && this._signingKey == null) {
        throw new SignatureError(
          "Trailproof: signature found but no signing key configured — cannot verify signature",
        );
      }

      // Recompute hash using event with hash="" (as during emit)
      const eventForHash: TrailEvent = {
        event_id: event.event_id,
        event_type: event.event_type,
        timestamp: event.timestamp,
        actor_id: event.actor_id,
        tenant_id: event.tenant_id,
        payload: event.payload,
        prev_hash: event.prev_hash,
        hash: "",
      };
      const expectedHash = computeHash(prevHash, eventForHash);

      if (event.hash !== expectedHash || event.prev_hash !== prevHash) {
        broken.push(i);
        chainBroken = true;
        continue;
      }

      prevHash = event.hash;
    }

    const intact = broken.length === 0;
    return { intact, total, broken };
  }

  /**
   * Flush any buffered data to the underlying store.
   *
   * For MemoryStore this is a no-op.
   */
  flush(): void {
    // MemoryStore has no buffering; JSONL store will override if needed
  }

  private validateRequired(fieldName: string, value: string | undefined | null): void {
    if (value == null || value === "") {
      throw new ValidationError(`Trailproof: missing required field — ${fieldName} is required`);
    }
  }
}

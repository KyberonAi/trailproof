/**
 * Trailproof facade class — the main public API.
 */

import { randomUUID } from "node:crypto";
import { computeHash } from "./chain.js";
import { ValidationError } from "./errors.js";
import type { TrailStore } from "./stores/base.js";
import { MemoryStore } from "./stores/memory.js";
import type { TrailEvent } from "./types.js";

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
  private readonly defaultTenantId: string | undefined;

  constructor(options: TrailproofOptions = {}) {
    const storeType = options.store ?? "memory";
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

  private validateRequired(fieldName: string, value: string | undefined | null): void {
    if (value == null || value === "") {
      throw new ValidationError(`Trailproof: missing required field — ${fieldName} is required`);
    }
  }
}

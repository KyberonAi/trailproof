/**
 * Trailproof core data types.
 */

/** A single event in the audit trail.
 *
 * Contains the 10-field event envelope. Domain-specific data
 * goes in the payload field, which Trailproof stores opaquely.
 *
 * Field names use snake_case to match the wire format.
 */
export interface TrailEvent {
  readonly event_id: string;
  readonly event_type: string;
  readonly timestamp: string;
  readonly actor_id: string;
  readonly tenant_id: string;
  readonly payload: Record<string, unknown>;
  readonly prev_hash: string;
  readonly hash: string;
  readonly trace_id?: string | null;
  readonly session_id?: string | null;
  readonly signature?: string | null;
}

/** Filters for querying events from a store.
 *
 * All fields are optional. No filters returns all events up to limit.
 */
export interface QueryFilters {
  readonly event_type?: string | null;
  readonly actor_id?: string | null;
  readonly tenant_id?: string | null;
  readonly trace_id?: string | null;
  readonly session_id?: string | null;
  readonly from_time?: string | null;
  readonly to_time?: string | null;
  readonly limit?: number;
  readonly cursor?: string | null;
}

/** Result of a query operation.
 *
 * Contains the matching events and an optional cursor for pagination.
 */
export interface QueryResult {
  readonly events: TrailEvent[];
  readonly next_cursor: string | null;
}

/** Result of a chain verification operation.
 *
 * intact is true when the entire chain is valid.
 * broken contains the indices of events with invalid hashes.
 */
export interface VerifyResult {
  readonly intact: boolean;
  readonly total: number;
  readonly broken: number[];
}

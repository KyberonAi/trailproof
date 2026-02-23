/**
 * Trailproof — tamper-evident audit trail with hash chains and optional HMAC signing.
 */

export {
  ChainError,
  SignatureError,
  StoreError,
  TrailproofError,
  ValidationError,
} from "./errors.js";
export { Trailproof } from "./trailproof.js";
export type { EmitOptions, QueryOptions, TrailproofOptions } from "./trailproof.js";
export type { QueryFilters, QueryResult, TrailEvent, VerifyResult } from "./types.js";

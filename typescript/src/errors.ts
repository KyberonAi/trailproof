/**
 * Trailproof error hierarchy.
 */

/** Base error for all Trailproof operations. */
export class TrailproofError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TrailproofError";
  }
}

/** Raised when event data is invalid (missing or empty required fields). */
export class ValidationError extends TrailproofError {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

/** Raised when a storage operation fails (disk, permissions, corruption). */
export class StoreError extends TrailproofError {
  constructor(message: string) {
    super(message);
    this.name = "StoreError";
  }
}

/** Raised when the hash chain is broken. */
export class ChainError extends TrailproofError {
  constructor(message: string) {
    super(message);
    this.name = "ChainError";
  }
}

/** Raised when HMAC signature verification fails. */
export class SignatureError extends TrailproofError {
  constructor(message: string) {
    super(message);
    this.name = "SignatureError";
  }
}

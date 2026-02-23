/**
 * Optional HMAC-SHA256 event signing and verification.
 */

import { createHmac, timingSafeEqual } from "node:crypto";
import { canonicalJson } from "./chain.js";
import { SignatureError } from "./errors.js";
import type { TrailEvent } from "./types.js";

export const SIGNATURE_PREFIX = "hmac-sha256:";

/**
 * Compute an HMAC-SHA256 signature for an event.
 *
 * @param key - The HMAC signing key.
 * @param event - The trail event to sign.
 * @returns Signature string in format "hmac-sha256:<hex>".
 */
export function signEvent(key: string, event: TrailEvent): string {
  const canonical = canonicalJson(event);
  const mac = createHmac("sha256", key).update(canonical, "utf-8").digest("hex");
  return SIGNATURE_PREFIX + mac;
}

/**
 * Verify the HMAC-SHA256 signature on an event.
 *
 * Uses timing-safe comparison to prevent timing attacks.
 *
 * @param key - The HMAC signing key.
 * @param event - The trail event with a signature to verify.
 * @throws SignatureError if the event has no signature or the signature doesn't match.
 */
export function verifySignature(key: string, event: TrailEvent): void {
  if (event.signature == null) {
    throw new SignatureError("Trailproof: missing signature — event has no signature field");
  }

  if (!event.signature.startsWith(SIGNATURE_PREFIX)) {
    throw new SignatureError(
      "Trailproof: invalid signature format — expected 'hmac-sha256:' prefix",
    );
  }

  const expected = signEvent(key, event);
  const actualBuf = Buffer.from(event.signature, "utf-8");
  const expectedBuf = Buffer.from(expected, "utf-8");

  if (actualBuf.length !== expectedBuf.length || !timingSafeEqual(actualBuf, expectedBuf)) {
    throw new SignatureError("Trailproof: signature mismatch — HMAC verification failed");
  }
}

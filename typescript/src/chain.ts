/**
 * Hash chain engine with canonical JSON serialization.
 */

import { createHash } from "node:crypto";
import type { TrailEvent } from "./types.js";

/** Genesis hash: 64 zero characters. */
export const GENESIS_HASH = "0".repeat(64);

const EXCLUDED_FIELDS = new Set(["hash", "signature"]);

/**
 * Serialize an event to canonical JSON for hashing.
 *
 * Produces deterministic output:
 * - Keys sorted alphabetically (recursive for nested objects)
 * - Compact format: no whitespace
 * - Excludes "hash" and "signature" fields
 * - Excludes null/undefined fields
 * - UTF-8 encoding
 */
export function canonicalJson(event: TrailEvent): string {
  const raw: Record<string, unknown> = { ...event };
  const cleaned = stripExcluded(raw);
  return stableStringify(cleaned);
}

/**
 * Compute the SHA-256 hash for an event in the chain.
 *
 * hash = SHA-256(prev_hash + canonicalJson(event))
 */
export function computeHash(prevHash: string, event: TrailEvent): string {
  const payload = prevHash + canonicalJson(event);
  return createHash("sha256").update(payload, "utf-8").digest("hex");
}

/** Remove excluded fields and null/undefined values, recursing into nested objects. */
function stripExcluded(data: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const key of Object.keys(data)) {
    if (EXCLUDED_FIELDS.has(key)) continue;
    const value = data[key];
    if (value === null || value === undefined) continue;
    if (typeof value === "object" && !Array.isArray(value)) {
      result[key] = stripExcluded(value as Record<string, unknown>);
    } else {
      result[key] = value;
    }
  }
  return result;
}

/** JSON.stringify with sorted keys (recursive), compact format. */
function stableStringify(obj: unknown): string {
  if (obj === null || obj === undefined) return "null";
  if (typeof obj === "string") return JSON.stringify(obj);
  if (typeof obj === "number" || typeof obj === "boolean") return String(obj);
  if (Array.isArray(obj)) {
    return "[" + obj.map((item) => stableStringify(item)).join(",") + "]";
  }
  if (typeof obj === "object") {
    const record = obj as Record<string, unknown>;
    const keys = Object.keys(record).sort();
    const pairs = keys.map((k) => JSON.stringify(k) + ":" + stableStringify(record[k]));
    return "{" + pairs.join(",") + "}";
  }
  return String(obj);
}

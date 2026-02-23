"""Hash chain engine with canonical JSON serialization."""

import hashlib
import json
from dataclasses import asdict

from trailproof.types import TrailEvent

GENESIS_HASH = "0" * 64

_EXCLUDED_FIELDS = {"hash", "signature"}


def canonical_json(event: TrailEvent) -> str:
    """Serialize an event to canonical JSON for hashing.

    Produces deterministic output:
    - Keys sorted alphabetically (recursive for nested objects)
    - Compact format: no whitespace
    - Excludes "hash" and "signature" fields
    - Excludes None fields
    - UTF-8 encoding

    Args:
        event: The trail event to serialize.

    Returns:
        A canonical JSON string.
    """
    raw = asdict(event)
    cleaned = _strip_excluded(raw)
    return json.dumps(cleaned, sort_keys=True, separators=(",", ":"), ensure_ascii=False)


def compute_hash(prev_hash: str, event: TrailEvent) -> str:
    """Compute the SHA-256 hash for an event in the chain.

    hash = SHA-256(prev_hash + canonical_json(event))

    Args:
        prev_hash: Hash of the previous event, or GENESIS_HASH for the first.
        event: The trail event to hash.

    Returns:
        Hex-encoded SHA-256 hash string.
    """
    payload = prev_hash + canonical_json(event)
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def _strip_excluded(data: dict[str, object]) -> dict[str, object]:
    """Remove excluded fields and None values, recursing into nested dicts.

    Args:
        data: Dictionary to clean.

    Returns:
        A new dictionary with excluded fields and None values removed,
        nested dicts sorted recursively.
    """
    result: dict[str, object] = {}
    for key, value in data.items():
        if key in _EXCLUDED_FIELDS:
            continue
        if value is None:
            continue
        if isinstance(value, dict):
            result[key] = _strip_excluded(value)
        else:
            result[key] = value
    return result

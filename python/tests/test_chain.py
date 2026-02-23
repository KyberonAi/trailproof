"""Tests for the hash chain engine and canonical JSON."""

import hashlib

from trailproof.chain import GENESIS_HASH, canonical_json, compute_hash
from trailproof.types import TrailEvent


def _make_event(**overrides: object) -> TrailEvent:
    """Create a TrailEvent with sensible defaults, allowing field overrides."""
    defaults: dict[str, object] = {
        "event_id": "evt-001",
        "event_type": "test.event",
        "timestamp": "2025-01-01T00:00:00Z",
        "actor_id": "actor-1",
        "tenant_id": "tenant-1",
        "payload": {"key": "value"},
        "prev_hash": GENESIS_HASH,
        "hash": "placeholder",
    }
    defaults.update(overrides)
    return TrailEvent(**defaults)  # type: ignore[arg-type]


class TestGenesisHash:
    """Genesis hash is 64 zero characters."""

    def test_genesis_hash_value(self) -> None:
        assert GENESIS_HASH == "0" * 64

    def test_genesis_hash_length(self) -> None:
        assert len(GENESIS_HASH) == 64


class TestCanonicalJson:
    """Canonical JSON produces deterministic, sorted, compact output."""

    def test_excludes_hash_field(self) -> None:
        event = _make_event(hash="should-be-excluded")
        result = canonical_json(event)
        assert '"hash"' not in result

    def test_excludes_signature_field(self) -> None:
        event = _make_event(signature="hmac-sha256:abc123")
        result = canonical_json(event)
        assert '"signature"' not in result

    def test_excludes_none_fields(self) -> None:
        event = _make_event(trace_id=None, session_id=None)
        result = canonical_json(event)
        assert '"trace_id"' not in result
        assert '"session_id"' not in result

    def test_includes_optional_fields_when_set(self) -> None:
        event = _make_event(trace_id="trace-1", session_id="session-1")
        result = canonical_json(event)
        assert '"trace_id":"trace-1"' in result
        assert '"session_id":"session-1"' in result

    def test_keys_sorted_alphabetically(self) -> None:
        event = _make_event()
        result = canonical_json(event)
        # Extract keys from the JSON string
        import json

        parsed = json.loads(result)
        keys = list(parsed.keys())
        assert keys == sorted(keys)

    def test_compact_format_no_whitespace(self) -> None:
        event = _make_event()
        result = canonical_json(event)
        # No spaces after colons or commas (except inside string values)
        assert ": " not in result
        assert ", " not in result

    def test_nested_payload_sorted_recursively(self) -> None:
        event = _make_event(payload={"zebra": 1, "alpha": {"gamma": 3, "beta": 2}})
        result = canonical_json(event)
        # alpha should come before zebra, beta before gamma
        alpha_pos = result.index('"alpha"')
        zebra_pos = result.index('"zebra"')
        assert alpha_pos < zebra_pos
        beta_pos = result.index('"beta"')
        gamma_pos = result.index('"gamma"')
        assert beta_pos < gamma_pos

    def test_deterministic_output(self) -> None:
        event = _make_event()
        result1 = canonical_json(event)
        result2 = canonical_json(event)
        assert result1 == result2

    def test_unicode_characters(self) -> None:
        event = _make_event(payload={"message": "Hello \u4e16\u754c"})
        result = canonical_json(event)
        assert "\u4e16\u754c" in result

    def test_emoji_characters(self) -> None:
        event = _make_event(payload={"emoji": "\U0001f680"})
        result = canonical_json(event)
        assert "\U0001f680" in result

    def test_empty_payload(self) -> None:
        event = _make_event(payload={})
        result = canonical_json(event)
        assert '"payload":{}' in result

    def test_payload_with_nested_none_excluded(self) -> None:
        event = _make_event(payload={"a": 1, "b": None})
        result = canonical_json(event)
        # None values in payload dict should be excluded
        assert '"b"' not in result


class TestComputeHash:
    """SHA-256 hash computation for chain linking."""

    def test_produces_valid_sha256_hex(self) -> None:
        event = _make_event()
        result = compute_hash(GENESIS_HASH, event)
        assert len(result) == 64
        # Should be valid hex
        int(result, 16)

    def test_genesis_event_hash(self) -> None:
        event = _make_event(prev_hash=GENESIS_HASH)
        result = compute_hash(GENESIS_HASH, event)
        # Manually verify: SHA-256(genesis + canonical_json(event))
        canonical = canonical_json(event)
        expected = hashlib.sha256((GENESIS_HASH + canonical).encode("utf-8")).hexdigest()
        assert result == expected

    def test_different_prev_hash_produces_different_result(self) -> None:
        event = _make_event()
        hash1 = compute_hash(GENESIS_HASH, event)
        hash2 = compute_hash("a" * 64, event)
        assert hash1 != hash2

    def test_different_events_produce_different_hashes(self) -> None:
        event1 = _make_event(event_id="evt-001")
        event2 = _make_event(event_id="evt-002")
        hash1 = compute_hash(GENESIS_HASH, event1)
        hash2 = compute_hash(GENESIS_HASH, event2)
        assert hash1 != hash2

    def test_hash_field_excluded_from_computation(self) -> None:
        event1 = _make_event(hash="hash-a")
        event2 = _make_event(hash="hash-b")
        hash1 = compute_hash(GENESIS_HASH, event1)
        hash2 = compute_hash(GENESIS_HASH, event2)
        assert hash1 == hash2

    def test_signature_field_excluded_from_computation(self) -> None:
        event1 = _make_event(signature=None)
        event2 = _make_event(signature="hmac-sha256:abc123")
        hash1 = compute_hash(GENESIS_HASH, event1)
        hash2 = compute_hash(GENESIS_HASH, event2)
        assert hash1 == hash2


class TestChainLinking:
    """Events form a chain where each hash depends on the previous."""

    def test_chain_of_two_events(self) -> None:
        event1 = _make_event(event_id="evt-001", prev_hash=GENESIS_HASH, hash="")
        hash1 = compute_hash(GENESIS_HASH, event1)

        event2 = _make_event(event_id="evt-002", prev_hash=hash1, hash="")
        hash2 = compute_hash(hash1, event2)

        assert hash1 != hash2
        # Verify chain: hash2 depends on hash1
        hash2_recomputed = compute_hash(hash1, event2)
        assert hash2 == hash2_recomputed

    def test_chain_of_three_events(self) -> None:
        event1 = _make_event(event_id="evt-001", prev_hash=GENESIS_HASH, hash="")
        hash1 = compute_hash(GENESIS_HASH, event1)

        event2 = _make_event(event_id="evt-002", prev_hash=hash1, hash="")
        hash2 = compute_hash(hash1, event2)

        event3 = _make_event(event_id="evt-003", prev_hash=hash2, hash="")
        hash3 = compute_hash(hash2, event3)

        # All hashes should be unique
        assert len({hash1, hash2, hash3}) == 3

    def test_tampered_event_changes_hash(self) -> None:
        event_original = _make_event(payload={"action": "write"}, hash="")
        hash_original = compute_hash(GENESIS_HASH, event_original)

        event_tampered = _make_event(payload={"action": "delete"}, hash="")
        hash_tampered = compute_hash(GENESIS_HASH, event_tampered)

        assert hash_original != hash_tampered

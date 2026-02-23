"""Tests for the Trailproof facade class and emit()."""

import re

import pytest

from trailproof.chain import GENESIS_HASH, compute_hash
from trailproof.errors import ValidationError
from trailproof.trailproof import Trailproof


class TestTrailproofConstructor:
    """Constructor accepts store type, signing_key, and default_tenant_id."""

    def test_default_constructor_uses_memory_store(self) -> None:
        tp = Trailproof()
        assert tp._store.count() == 0

    def test_explicit_memory_store(self) -> None:
        tp = Trailproof(store="memory")
        assert tp._store.count() == 0

    def test_invalid_store_type_raises(self) -> None:
        with pytest.raises(ValidationError, match="invalid store type"):
            Trailproof(store="sqlite")

    def test_signing_key_stored(self) -> None:
        tp = Trailproof(signing_key="secret")
        assert tp._signing_key == "secret"

    def test_default_tenant_id_stored(self) -> None:
        tp = Trailproof(default_tenant_id="acme-corp")
        assert tp._default_tenant_id == "acme-corp"


class TestEmitHappyPath:
    """emit() creates a valid event with auto-generated fields."""

    def test_emit_returns_trail_event(self) -> None:
        tp = Trailproof()
        event = tp.emit(
            event_type="test.event",
            actor_id="actor-1",
            tenant_id="tenant-1",
            payload={"key": "value"},
        )
        assert event.event_type == "test.event"
        assert event.actor_id == "actor-1"
        assert event.tenant_id == "tenant-1"
        assert event.payload == {"key": "value"}

    def test_emit_generates_uuid_event_id(self) -> None:
        tp = Trailproof()
        event = tp.emit(
            event_type="test.event",
            actor_id="actor-1",
            tenant_id="tenant-1",
            payload={},
        )
        uuid_pattern = re.compile(
            r"^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$"
        )
        assert uuid_pattern.match(event.event_id)

    def test_emit_generates_iso_timestamp(self) -> None:
        tp = Trailproof()
        event = tp.emit(
            event_type="test.event",
            actor_id="actor-1",
            tenant_id="tenant-1",
            payload={},
        )
        # ISO-8601 format with milliseconds and Z suffix
        ts_pattern = re.compile(r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$")
        assert ts_pattern.match(event.timestamp)

    def test_emit_first_event_uses_genesis_prev_hash(self) -> None:
        tp = Trailproof()
        event = tp.emit(
            event_type="test.event",
            actor_id="actor-1",
            tenant_id="tenant-1",
            payload={},
        )
        assert event.prev_hash == GENESIS_HASH

    def test_emit_computes_valid_hash(self) -> None:
        tp = Trailproof()
        event = tp.emit(
            event_type="test.event",
            actor_id="actor-1",
            tenant_id="tenant-1",
            payload={"key": "value"},
        )
        assert len(event.hash) == 64
        # Hash should be valid hex
        int(event.hash, 16)

    def test_emit_stores_event(self) -> None:
        tp = Trailproof()
        tp.emit(
            event_type="test.event",
            actor_id="actor-1",
            tenant_id="tenant-1",
            payload={},
        )
        assert tp._store.count() == 1

    def test_emit_optional_trace_id(self) -> None:
        tp = Trailproof()
        event = tp.emit(
            event_type="test.event",
            actor_id="actor-1",
            tenant_id="tenant-1",
            payload={},
            trace_id="trace-abc",
        )
        assert event.trace_id == "trace-abc"

    def test_emit_optional_session_id(self) -> None:
        tp = Trailproof()
        event = tp.emit(
            event_type="test.event",
            actor_id="actor-1",
            tenant_id="tenant-1",
            payload={},
            session_id="session-xyz",
        )
        assert event.session_id == "session-xyz"

    def test_emit_without_optional_fields(self) -> None:
        tp = Trailproof()
        event = tp.emit(
            event_type="test.event",
            actor_id="actor-1",
            tenant_id="tenant-1",
            payload={},
        )
        assert event.trace_id is None
        assert event.session_id is None
        assert event.signature is None


class TestEmitDefaultTenantId:
    """emit() uses default_tenant_id when tenant_id not provided."""

    def test_uses_default_tenant_id(self) -> None:
        tp = Trailproof(default_tenant_id="acme-corp")
        event = tp.emit(
            event_type="test.event",
            actor_id="actor-1",
            payload={},
        )
        assert event.tenant_id == "acme-corp"

    def test_explicit_tenant_id_overrides_default(self) -> None:
        tp = Trailproof(default_tenant_id="acme-corp")
        event = tp.emit(
            event_type="test.event",
            actor_id="actor-1",
            tenant_id="globex",
            payload={},
        )
        assert event.tenant_id == "globex"

    def test_no_tenant_id_and_no_default_raises(self) -> None:
        tp = Trailproof()
        with pytest.raises(ValidationError, match="tenant_id is required"):
            tp.emit(
                event_type="test.event",
                actor_id="actor-1",
                payload={},
            )


class TestEmitValidation:
    """emit() validates required fields."""

    def test_missing_event_type_raises(self) -> None:
        tp = Trailproof()
        with pytest.raises(ValidationError, match="event_type is required"):
            tp.emit(
                event_type="",
                actor_id="actor-1",
                tenant_id="tenant-1",
                payload={},
            )

    def test_missing_actor_id_raises(self) -> None:
        tp = Trailproof()
        with pytest.raises(ValidationError, match="actor_id is required"):
            tp.emit(
                event_type="test.event",
                actor_id="",
                tenant_id="tenant-1",
                payload={},
            )

    def test_missing_tenant_id_raises(self) -> None:
        tp = Trailproof()
        with pytest.raises(ValidationError, match="tenant_id is required"):
            tp.emit(
                event_type="test.event",
                actor_id="actor-1",
                tenant_id="",
                payload={},
            )

    def test_error_message_format(self) -> None:
        tp = Trailproof()
        with pytest.raises(
            ValidationError,
            match=r"^Trailproof: missing required field — actor_id is required$",
        ):
            tp.emit(
                event_type="test.event",
                actor_id="",
                tenant_id="tenant-1",
                payload={},
            )


class TestEmitChainLinking:
    """emit() chains events via prev_hash."""

    def test_second_event_links_to_first(self) -> None:
        tp = Trailproof()
        event1 = tp.emit(
            event_type="test.event",
            actor_id="actor-1",
            tenant_id="tenant-1",
            payload={"n": 1},
        )
        event2 = tp.emit(
            event_type="test.event",
            actor_id="actor-1",
            tenant_id="tenant-1",
            payload={"n": 2},
        )
        assert event2.prev_hash == event1.hash

    def test_three_event_chain(self) -> None:
        tp = Trailproof()
        events = []
        for i in range(3):
            event = tp.emit(
                event_type="test.event",
                actor_id="actor-1",
                tenant_id="tenant-1",
                payload={"n": i},
            )
            events.append(event)

        assert events[0].prev_hash == GENESIS_HASH
        assert events[1].prev_hash == events[0].hash
        assert events[2].prev_hash == events[1].hash

    def test_each_event_has_unique_hash(self) -> None:
        tp = Trailproof()
        hashes = set()
        for i in range(5):
            event = tp.emit(
                event_type="test.event",
                actor_id="actor-1",
                tenant_id="tenant-1",
                payload={"n": i},
            )
            hashes.add(event.hash)
        assert len(hashes) == 5

    def test_hash_is_verifiable(self) -> None:
        tp = Trailproof()
        event = tp.emit(
            event_type="test.event",
            actor_id="actor-1",
            tenant_id="tenant-1",
            payload={"key": "value"},
        )
        # Recompute hash to verify — use event with hash="" to match what was hashed
        from trailproof.types import TrailEvent

        event_for_hash = TrailEvent(
            event_id=event.event_id,
            event_type=event.event_type,
            timestamp=event.timestamp,
            actor_id=event.actor_id,
            tenant_id=event.tenant_id,
            payload=event.payload,
            prev_hash=event.prev_hash,
            hash="",
        )
        expected = compute_hash(event.prev_hash, event_for_hash)
        assert event.hash == expected


class TestEmitPayload:
    """emit() handles various payload types."""

    def test_empty_payload(self) -> None:
        tp = Trailproof()
        event = tp.emit(
            event_type="test.event",
            actor_id="actor-1",
            tenant_id="tenant-1",
            payload={},
        )
        assert event.payload == {}

    def test_nested_payload(self) -> None:
        tp = Trailproof()
        payload = {"nested": {"deep": {"value": 42}}}
        event = tp.emit(
            event_type="test.event",
            actor_id="actor-1",
            tenant_id="tenant-1",
            payload=payload,
        )
        assert event.payload == payload

    def test_payload_with_unicode(self) -> None:
        tp = Trailproof()
        event = tp.emit(
            event_type="test.event",
            actor_id="actor-1",
            tenant_id="tenant-1",
            payload={"message": "Hello \u4e16\u754c \U0001f680"},
        )
        assert event.payload["message"] == "Hello \u4e16\u754c \U0001f680"

"""Tests for the Trailproof core data types."""

import pytest

from trailproof.types import QueryFilters, QueryResult, TrailEvent, VerifyResult


class TestTrailEvent:
    """TrailEvent is a frozen dataclass with 10 fields + signature."""

    def test_create_with_all_fields(self) -> None:
        event = TrailEvent(
            event_id="evt-001",
            event_type="memproof.memory.write",
            timestamp="2025-01-01T00:00:00Z",
            actor_id="agent-47",
            tenant_id="acme-corp",
            payload={"key": "value"},
            prev_hash="0" * 64,
            hash="abc123",
            trace_id="trace-abc",
            session_id="session-xyz",
            signature="hmac-sha256:deadbeef",
        )
        assert event.event_id == "evt-001"
        assert event.event_type == "memproof.memory.write"
        assert event.timestamp == "2025-01-01T00:00:00Z"
        assert event.actor_id == "agent-47"
        assert event.tenant_id == "acme-corp"
        assert event.payload == {"key": "value"}
        assert event.prev_hash == "0" * 64
        assert event.hash == "abc123"
        assert event.trace_id == "trace-abc"
        assert event.session_id == "session-xyz"
        assert event.signature == "hmac-sha256:deadbeef"

    def test_optional_fields_default_to_none(self) -> None:
        event = TrailEvent(
            event_id="evt-001",
            event_type="test.event",
            timestamp="2025-01-01T00:00:00Z",
            actor_id="actor-1",
            tenant_id="tenant-1",
            payload={},
            prev_hash="0" * 64,
            hash="abc123",
        )
        assert event.trace_id is None
        assert event.session_id is None
        assert event.signature is None

    def test_frozen_cannot_mutate(self) -> None:
        event = TrailEvent(
            event_id="evt-001",
            event_type="test.event",
            timestamp="2025-01-01T00:00:00Z",
            actor_id="actor-1",
            tenant_id="tenant-1",
            payload={},
            prev_hash="0" * 64,
            hash="abc123",
        )
        with pytest.raises(AttributeError):
            event.hash = "tampered"  # type: ignore[misc]

    def test_equality(self) -> None:
        kwargs = {
            "event_id": "evt-001",
            "event_type": "test.event",
            "timestamp": "2025-01-01T00:00:00Z",
            "actor_id": "actor-1",
            "tenant_id": "tenant-1",
            "payload": {"a": 1},
            "prev_hash": "0" * 64,
            "hash": "abc123",
        }
        assert TrailEvent(**kwargs) == TrailEvent(**kwargs)

    def test_payload_with_nested_objects(self) -> None:
        event = TrailEvent(
            event_id="evt-001",
            event_type="test.event",
            timestamp="2025-01-01T00:00:00Z",
            actor_id="actor-1",
            tenant_id="tenant-1",
            payload={"nested": {"deep": {"value": 42}}},
            prev_hash="0" * 64,
            hash="abc123",
        )
        assert event.payload["nested"] == {"deep": {"value": 42}}


class TestQueryFilters:
    """QueryFilters has all-optional fields with sensible defaults."""

    def test_defaults(self) -> None:
        filters = QueryFilters()
        assert filters.event_type is None
        assert filters.actor_id is None
        assert filters.tenant_id is None
        assert filters.trace_id is None
        assert filters.session_id is None
        assert filters.from_time is None
        assert filters.to_time is None
        assert filters.limit == 100
        assert filters.cursor is None

    def test_custom_values(self) -> None:
        filters = QueryFilters(
            event_type="test.event",
            actor_id="actor-1",
            tenant_id="tenant-1",
            trace_id="trace-1",
            session_id="session-1",
            from_time="2025-01-01T00:00:00Z",
            to_time="2025-12-31T23:59:59Z",
            limit=50,
            cursor="cursor-abc",
        )
        assert filters.event_type == "test.event"
        assert filters.actor_id == "actor-1"
        assert filters.tenant_id == "tenant-1"
        assert filters.trace_id == "trace-1"
        assert filters.session_id == "session-1"
        assert filters.from_time == "2025-01-01T00:00:00Z"
        assert filters.to_time == "2025-12-31T23:59:59Z"
        assert filters.limit == 50
        assert filters.cursor == "cursor-abc"

    def test_frozen_cannot_mutate(self) -> None:
        filters = QueryFilters()
        with pytest.raises(AttributeError):
            filters.limit = 200  # type: ignore[misc]


class TestQueryResult:
    """QueryResult holds events and optional pagination cursor."""

    def test_defaults(self) -> None:
        result = QueryResult()
        assert result.events == []
        assert result.next_cursor is None

    def test_with_events_and_cursor(self) -> None:
        event = TrailEvent(
            event_id="evt-001",
            event_type="test.event",
            timestamp="2025-01-01T00:00:00Z",
            actor_id="actor-1",
            tenant_id="tenant-1",
            payload={},
            prev_hash="0" * 64,
            hash="abc123",
        )
        result = QueryResult(events=[event], next_cursor="cursor-next")
        assert len(result.events) == 1
        assert result.events[0].event_id == "evt-001"
        assert result.next_cursor == "cursor-next"

    def test_frozen_cannot_mutate(self) -> None:
        result = QueryResult()
        with pytest.raises(AttributeError):
            result.next_cursor = "tampered"  # type: ignore[misc]


class TestVerifyResult:
    """VerifyResult reports chain integrity."""

    def test_intact_chain(self) -> None:
        result = VerifyResult(intact=True, total=10)
        assert result.intact is True
        assert result.total == 10
        assert result.broken == []

    def test_broken_chain(self) -> None:
        result = VerifyResult(intact=False, total=10, broken=[3, 4, 5])
        assert result.intact is False
        assert result.total == 10
        assert result.broken == [3, 4, 5]

    def test_empty_chain(self) -> None:
        result = VerifyResult(intact=True, total=0)
        assert result.intact is True
        assert result.total == 0
        assert result.broken == []

    def test_frozen_cannot_mutate(self) -> None:
        result = VerifyResult(intact=True, total=0)
        with pytest.raises(AttributeError):
            result.intact = False  # type: ignore[misc]

"""Tests for the store interface and memory store."""

from trailproof.chain import GENESIS_HASH
from trailproof.stores.base import TrailStore
from trailproof.stores.memory import MemoryStore
from trailproof.types import QueryFilters, TrailEvent


def _make_event(
    event_id: str = "evt-001",
    event_type: str = "test.event",
    timestamp: str = "2025-01-01T00:00:00Z",
    actor_id: str = "actor-1",
    tenant_id: str = "tenant-1",
    trace_id: str | None = None,
    session_id: str | None = None,
    prev_hash: str = GENESIS_HASH,
    hash: str = "abc123",
) -> TrailEvent:
    return TrailEvent(
        event_id=event_id,
        event_type=event_type,
        timestamp=timestamp,
        actor_id=actor_id,
        tenant_id=tenant_id,
        payload={"key": "value"},
        prev_hash=prev_hash,
        hash=hash,
        trace_id=trace_id,
        session_id=session_id,
    )


class TestMemoryStoreIsTrailStore:
    """MemoryStore implements the TrailStore interface."""

    def test_is_subclass_of_trail_store(self) -> None:
        assert issubclass(MemoryStore, TrailStore)

    def test_instance_is_trail_store(self) -> None:
        store = MemoryStore()
        assert isinstance(store, TrailStore)


class TestMemoryStoreAppendAndReadAll:
    """Append and read_all operations."""

    def test_empty_store_read_all(self) -> None:
        store = MemoryStore()
        assert store.read_all() == []

    def test_append_one_event(self) -> None:
        store = MemoryStore()
        event = _make_event()
        store.append(event)
        assert store.read_all() == [event]

    def test_append_multiple_events_preserves_order(self) -> None:
        store = MemoryStore()
        e1 = _make_event(event_id="evt-001", hash="hash-1")
        e2 = _make_event(event_id="evt-002", hash="hash-2")
        e3 = _make_event(event_id="evt-003", hash="hash-3")
        store.append(e1)
        store.append(e2)
        store.append(e3)
        result = store.read_all()
        assert [e.event_id for e in result] == ["evt-001", "evt-002", "evt-003"]

    def test_read_all_returns_copy(self) -> None:
        store = MemoryStore()
        event = _make_event()
        store.append(event)
        result = store.read_all()
        result.clear()
        assert store.read_all() == [event]


class TestMemoryStoreLastHash:
    """last_hash returns the most recent hash or genesis."""

    def test_empty_store_returns_genesis_hash(self) -> None:
        store = MemoryStore()
        assert store.last_hash() == GENESIS_HASH

    def test_returns_hash_of_last_event(self) -> None:
        store = MemoryStore()
        store.append(_make_event(event_id="evt-001", hash="hash-1"))
        store.append(_make_event(event_id="evt-002", hash="hash-2"))
        assert store.last_hash() == "hash-2"


class TestMemoryStoreCount:
    """count returns the total number of events."""

    def test_empty_store_count(self) -> None:
        store = MemoryStore()
        assert store.count() == 0

    def test_count_after_appends(self) -> None:
        store = MemoryStore()
        store.append(_make_event(event_id="evt-001"))
        store.append(_make_event(event_id="evt-002"))
        assert store.count() == 2


class TestMemoryStoreQueryNoFilters:
    """Query with no filters returns all events up to limit."""

    def test_no_filters_returns_all(self) -> None:
        store = MemoryStore()
        for i in range(5):
            store.append(_make_event(event_id=f"evt-{i:03d}", hash=f"hash-{i}"))
        result = store.query(QueryFilters())
        assert len(result.events) == 5
        assert result.next_cursor is None

    def test_no_filters_respects_limit(self) -> None:
        store = MemoryStore()
        for i in range(10):
            store.append(_make_event(event_id=f"evt-{i:03d}", hash=f"hash-{i}"))
        result = store.query(QueryFilters(limit=3))
        assert len(result.events) == 3
        assert result.next_cursor == "evt-002"

    def test_empty_store_query(self) -> None:
        store = MemoryStore()
        result = store.query(QueryFilters())
        assert result.events == []
        assert result.next_cursor is None


class TestMemoryStoreQueryFilters:
    """Query with various filter combinations."""

    def test_filter_by_event_type(self) -> None:
        store = MemoryStore()
        store.append(_make_event(event_id="evt-001", event_type="type.a", hash="h1"))
        store.append(_make_event(event_id="evt-002", event_type="type.b", hash="h2"))
        store.append(_make_event(event_id="evt-003", event_type="type.a", hash="h3"))
        result = store.query(QueryFilters(event_type="type.a"))
        assert len(result.events) == 2
        assert all(e.event_type == "type.a" for e in result.events)

    def test_filter_by_actor_id(self) -> None:
        store = MemoryStore()
        store.append(_make_event(event_id="evt-001", actor_id="alice", hash="h1"))
        store.append(_make_event(event_id="evt-002", actor_id="bob", hash="h2"))
        result = store.query(QueryFilters(actor_id="alice"))
        assert len(result.events) == 1
        assert result.events[0].actor_id == "alice"

    def test_filter_by_tenant_id(self) -> None:
        store = MemoryStore()
        store.append(_make_event(event_id="evt-001", tenant_id="acme", hash="h1"))
        store.append(_make_event(event_id="evt-002", tenant_id="globex", hash="h2"))
        result = store.query(QueryFilters(tenant_id="acme"))
        assert len(result.events) == 1
        assert result.events[0].tenant_id == "acme"

    def test_filter_by_trace_id(self) -> None:
        store = MemoryStore()
        store.append(_make_event(event_id="evt-001", trace_id="trace-1", hash="h1"))
        store.append(_make_event(event_id="evt-002", trace_id="trace-2", hash="h2"))
        result = store.query(QueryFilters(trace_id="trace-1"))
        assert len(result.events) == 1

    def test_filter_by_session_id(self) -> None:
        store = MemoryStore()
        store.append(_make_event(event_id="evt-001", session_id="sess-1", hash="h1"))
        store.append(_make_event(event_id="evt-002", session_id="sess-2", hash="h2"))
        result = store.query(QueryFilters(session_id="sess-1"))
        assert len(result.events) == 1

    def test_multiple_filters(self) -> None:
        store = MemoryStore()
        store.append(
            _make_event(event_id="evt-001", event_type="type.a", actor_id="alice", hash="h1")
        )
        store.append(
            _make_event(event_id="evt-002", event_type="type.a", actor_id="bob", hash="h2")
        )
        store.append(
            _make_event(event_id="evt-003", event_type="type.b", actor_id="alice", hash="h3")
        )
        result = store.query(QueryFilters(event_type="type.a", actor_id="alice"))
        assert len(result.events) == 1
        assert result.events[0].event_id == "evt-001"

    def test_no_matching_filter_returns_empty(self) -> None:
        store = MemoryStore()
        store.append(_make_event(event_id="evt-001", hash="h1"))
        result = store.query(QueryFilters(event_type="nonexistent"))
        assert result.events == []
        assert result.next_cursor is None


class TestMemoryStoreQueryTimeRange:
    """Query with time range filters."""

    def test_from_time_filter(self) -> None:
        store = MemoryStore()
        store.append(_make_event(event_id="evt-001", timestamp="2025-01-01T00:00:00Z", hash="h1"))
        store.append(_make_event(event_id="evt-002", timestamp="2025-06-01T00:00:00Z", hash="h2"))
        store.append(_make_event(event_id="evt-003", timestamp="2025-12-01T00:00:00Z", hash="h3"))
        result = store.query(QueryFilters(from_time="2025-06-01T00:00:00Z"))
        assert len(result.events) == 2

    def test_to_time_filter(self) -> None:
        store = MemoryStore()
        store.append(_make_event(event_id="evt-001", timestamp="2025-01-01T00:00:00Z", hash="h1"))
        store.append(_make_event(event_id="evt-002", timestamp="2025-06-01T00:00:00Z", hash="h2"))
        store.append(_make_event(event_id="evt-003", timestamp="2025-12-01T00:00:00Z", hash="h3"))
        result = store.query(QueryFilters(to_time="2025-06-01T00:00:00Z"))
        assert len(result.events) == 2

    def test_time_range_filter(self) -> None:
        store = MemoryStore()
        store.append(_make_event(event_id="evt-001", timestamp="2025-01-01T00:00:00Z", hash="h1"))
        store.append(_make_event(event_id="evt-002", timestamp="2025-06-01T00:00:00Z", hash="h2"))
        store.append(_make_event(event_id="evt-003", timestamp="2025-12-01T00:00:00Z", hash="h3"))
        result = store.query(
            QueryFilters(from_time="2025-03-01T00:00:00Z", to_time="2025-09-01T00:00:00Z")
        )
        assert len(result.events) == 1
        assert result.events[0].event_id == "evt-002"


class TestMemoryStoreQueryCursorPagination:
    """Query with cursor-based pagination."""

    def test_cursor_skips_to_after_event(self) -> None:
        store = MemoryStore()
        for i in range(5):
            store.append(_make_event(event_id=f"evt-{i:03d}", hash=f"hash-{i}"))
        result = store.query(QueryFilters(cursor="evt-002"))
        assert len(result.events) == 2
        assert result.events[0].event_id == "evt-003"
        assert result.events[1].event_id == "evt-004"

    def test_cursor_with_limit(self) -> None:
        store = MemoryStore()
        for i in range(10):
            store.append(_make_event(event_id=f"evt-{i:03d}", hash=f"hash-{i}"))
        result = store.query(QueryFilters(cursor="evt-002", limit=3))
        assert len(result.events) == 3
        assert result.events[0].event_id == "evt-003"
        assert result.next_cursor == "evt-005"

    def test_cursor_nonexistent_returns_empty(self) -> None:
        store = MemoryStore()
        store.append(_make_event(event_id="evt-001", hash="h1"))
        result = store.query(QueryFilters(cursor="nonexistent"))
        assert result.events == []
        assert result.next_cursor is None

    def test_cursor_at_last_event_returns_empty(self) -> None:
        store = MemoryStore()
        store.append(_make_event(event_id="evt-001", hash="h1"))
        store.append(_make_event(event_id="evt-002", hash="h2"))
        result = store.query(QueryFilters(cursor="evt-002"))
        assert result.events == []
        assert result.next_cursor is None

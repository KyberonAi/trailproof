"""Tests for Trailproof query() and get_trace()."""

from trailproof.trailproof import Trailproof


def _populated_tp() -> Trailproof:
    """Create a Trailproof instance with 6 diverse events."""
    tp = Trailproof(default_tenant_id="acme")
    tp.emit(
        event_type="type.a",
        actor_id="alice",
        payload={"n": 1},
        trace_id="trace-1",
        session_id="sess-1",
    )
    tp.emit(
        event_type="type.b",
        actor_id="bob",
        payload={"n": 2},
        trace_id="trace-1",
        session_id="sess-2",
    )
    tp.emit(
        event_type="type.a",
        actor_id="alice",
        payload={"n": 3},
        trace_id="trace-2",
        session_id="sess-1",
    )
    tp.emit(
        event_type="type.b",
        actor_id="bob",
        payload={"n": 4},
        trace_id="trace-2",
        session_id="sess-2",
    )
    tp.emit(
        event_type="type.a",
        actor_id="carol",
        payload={"n": 5},
        trace_id="trace-1",
    )
    tp.emit(
        event_type="type.c",
        actor_id="alice",
        payload={"n": 6},
    )
    return tp


class TestQueryNoFilters:
    """query() with no filters returns all events."""

    def test_returns_all_events(self) -> None:
        tp = _populated_tp()
        result = tp.query()
        assert len(result.events) == 6

    def test_no_next_cursor_when_all_fit(self) -> None:
        tp = _populated_tp()
        result = tp.query()
        assert result.next_cursor is None

    def test_empty_store_returns_empty(self) -> None:
        tp = Trailproof()
        result = tp.query()
        assert result.events == []
        assert result.next_cursor is None


class TestQuerySingleFilter:
    """query() with a single filter."""

    def test_filter_by_event_type(self) -> None:
        tp = _populated_tp()
        result = tp.query(event_type="type.a")
        assert len(result.events) == 3
        assert all(e.event_type == "type.a" for e in result.events)

    def test_filter_by_actor_id(self) -> None:
        tp = _populated_tp()
        result = tp.query(actor_id="alice")
        assert len(result.events) == 3
        assert all(e.actor_id == "alice" for e in result.events)

    def test_filter_by_tenant_id(self) -> None:
        tp = _populated_tp()
        result = tp.query(tenant_id="acme")
        assert len(result.events) == 6

    def test_filter_by_trace_id(self) -> None:
        tp = _populated_tp()
        result = tp.query(trace_id="trace-1")
        assert len(result.events) == 3
        assert all(e.trace_id == "trace-1" for e in result.events)

    def test_filter_by_session_id(self) -> None:
        tp = _populated_tp()
        result = tp.query(session_id="sess-1")
        assert len(result.events) == 2
        assert all(e.session_id == "sess-1" for e in result.events)

    def test_no_match_returns_empty(self) -> None:
        tp = _populated_tp()
        result = tp.query(event_type="nonexistent")
        assert result.events == []


class TestQueryMultipleFilters:
    """query() with combined filters."""

    def test_event_type_and_actor_id(self) -> None:
        tp = _populated_tp()
        result = tp.query(event_type="type.a", actor_id="alice")
        assert len(result.events) == 2

    def test_trace_id_and_session_id(self) -> None:
        tp = _populated_tp()
        result = tp.query(trace_id="trace-1", session_id="sess-1")
        assert len(result.events) == 1


class TestQueryTimeRange:
    """query() with from_time / to_time filters."""

    def test_from_time(self) -> None:
        tp = Trailproof(default_tenant_id="t")
        events = []
        for i in range(3):
            events.append(tp.emit(event_type="test", actor_id="a", payload={"n": i}))
        # from_time >= second event's timestamp
        result = tp.query(from_time=events[1].timestamp)
        assert len(result.events) >= 2

    def test_to_time(self) -> None:
        tp = Trailproof(default_tenant_id="t")
        events = []
        for i in range(3):
            events.append(tp.emit(event_type="test", actor_id="a", payload={"n": i}))
        # to_time <= first event's timestamp
        result = tp.query(to_time=events[0].timestamp)
        assert len(result.events) >= 1


class TestQueryPagination:
    """query() with limit and cursor pagination."""

    def test_limit_restricts_results(self) -> None:
        tp = _populated_tp()
        result = tp.query(limit=2)
        assert len(result.events) == 2
        assert result.next_cursor is not None

    def test_cursor_resumes_from_event(self) -> None:
        tp = _populated_tp()
        page1 = tp.query(limit=2)
        assert page1.next_cursor is not None
        page2 = tp.query(limit=2, cursor=page1.next_cursor)
        assert len(page2.events) == 2
        # No overlap
        page1_ids = {e.event_id for e in page1.events}
        page2_ids = {e.event_id for e in page2.events}
        assert page1_ids.isdisjoint(page2_ids)

    def test_paginate_through_all(self) -> None:
        tp = _populated_tp()
        all_ids: set[str] = set()
        cursor = None
        while True:
            result = tp.query(limit=2, cursor=cursor)
            for e in result.events:
                all_ids.add(e.event_id)
            if result.next_cursor is None:
                break
            cursor = result.next_cursor
        assert len(all_ids) == 6

    def test_nonexistent_cursor_returns_empty(self) -> None:
        tp = _populated_tp()
        result = tp.query(cursor="nonexistent-id")
        assert result.events == []
        assert result.next_cursor is None


class TestGetTrace:
    """get_trace() returns events for a specific trace_id."""

    def test_returns_matching_events(self) -> None:
        tp = _populated_tp()
        events = tp.get_trace("trace-1")
        assert len(events) == 3
        assert all(e.trace_id == "trace-1" for e in events)

    def test_ordered_by_timestamp(self) -> None:
        tp = _populated_tp()
        events = tp.get_trace("trace-1")
        timestamps = [e.timestamp for e in events]
        assert timestamps == sorted(timestamps)

    def test_no_matching_trace_returns_empty(self) -> None:
        tp = _populated_tp()
        events = tp.get_trace("nonexistent")
        assert events == []

    def test_single_event_trace(self) -> None:
        tp = Trailproof(default_tenant_id="t")
        tp.emit(event_type="test", actor_id="a", payload={}, trace_id="solo")
        tp.emit(event_type="test", actor_id="a", payload={})
        events = tp.get_trace("solo")
        assert len(events) == 1
        assert events[0].trace_id == "solo"

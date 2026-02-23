"""In-memory trail event store."""

from trailproof.chain import GENESIS_HASH
from trailproof.stores.base import TrailStore
from trailproof.types import QueryFilters, QueryResult, TrailEvent


class MemoryStore(TrailStore):
    """In-memory store that keeps events in a list.

    Events are lost when the process exits. Useful for testing
    and short-lived applications.
    """

    def __init__(self) -> None:
        self._events: list[TrailEvent] = []

    def append(self, event: TrailEvent) -> None:
        """Append a single event to the in-memory list."""
        self._events.append(event)

    def read_all(self) -> list[TrailEvent]:
        """Return all events in insertion order."""
        return list(self._events)

    def query(self, filters: QueryFilters) -> QueryResult:
        """Query events with optional filters and cursor pagination."""
        events = self._events

        # Apply cursor: skip events up to and including the cursor event_id
        if filters.cursor is not None:
            cursor_index = -1
            for i, event in enumerate(events):
                if event.event_id == filters.cursor:
                    cursor_index = i
                    break
            if cursor_index == -1:
                return QueryResult(events=[], next_cursor=None)
            events = events[cursor_index + 1 :]

        # Apply filters
        if filters.event_type is not None:
            events = [e for e in events if e.event_type == filters.event_type]
        if filters.actor_id is not None:
            events = [e for e in events if e.actor_id == filters.actor_id]
        if filters.tenant_id is not None:
            events = [e for e in events if e.tenant_id == filters.tenant_id]
        if filters.trace_id is not None:
            events = [e for e in events if e.trace_id == filters.trace_id]
        if filters.session_id is not None:
            events = [e for e in events if e.session_id == filters.session_id]
        if filters.from_time is not None:
            events = [e for e in events if e.timestamp >= filters.from_time]
        if filters.to_time is not None:
            events = [e for e in events if e.timestamp <= filters.to_time]

        # Apply limit and determine next_cursor
        limit = filters.limit
        if len(events) > limit:
            next_cursor = events[limit - 1].event_id
            events = events[:limit]
        else:
            next_cursor = None

        return QueryResult(events=events, next_cursor=next_cursor)

    def last_hash(self) -> str:
        """Return hash of the last event, or genesis hash if empty."""
        if not self._events:
            return GENESIS_HASH
        return self._events[-1].hash

    def count(self) -> int:
        """Return total number of stored events."""
        return len(self._events)

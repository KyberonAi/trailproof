"""Append-only JSONL file store for trail events."""

import json
import logging
import os
from dataclasses import asdict

from trailproof.chain import GENESIS_HASH
from trailproof.errors import StoreError
from trailproof.stores.base import TrailStore
from trailproof.types import QueryFilters, QueryResult, TrailEvent

logger = logging.getLogger(__name__)

_FILE_PERMISSIONS = 0o600


class JsonlStore(TrailStore):
    """Persistent store that writes one JSON object per line to a JSONL file.

    Append-only. File is created with 0o600 permissions on first write.
    On init, reads any existing file to recover last_hash and count.
    Corrupt lines are skipped with a warning.

    Args:
        path: File path for the JSONL file.
    """

    def __init__(self, path: str) -> None:
        self._path = path
        self._events: list[TrailEvent] = []
        self._corrupt_lines: list[int] = []
        self._load_existing()

    def append(self, event: TrailEvent) -> None:
        """Append a single event to the JSONL file."""
        line = json.dumps(asdict(event), separators=(",", ":"), ensure_ascii=False)
        try:
            if not os.path.exists(self._path):
                fd = os.open(self._path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, _FILE_PERMISSIONS)
                with os.fdopen(fd, "w", encoding="utf-8") as f:
                    f.write(line + "\n")
            else:
                with open(self._path, "a", encoding="utf-8") as f:
                    f.write(line + "\n")
        except OSError as exc:
            raise StoreError(f"Trailproof: write failed — {exc}") from exc
        self._events.append(event)

    def read_all(self) -> list[TrailEvent]:
        """Return all events in insertion order."""
        return list(self._events)

    def query(self, filters: QueryFilters) -> QueryResult:
        """Query events with optional filters and cursor pagination."""
        events: list[TrailEvent] = self._events

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

    @property
    def corrupt_lines(self) -> list[int]:
        """Return indices of corrupt lines found during file load."""
        return list(self._corrupt_lines)

    def _load_existing(self) -> None:
        """Load events from an existing JSONL file.

        Skips corrupt lines with a warning. Tracks corrupt line indices.
        """
        if not os.path.exists(self._path):
            return

        try:
            with open(self._path, encoding="utf-8") as f:
                for line_num, line in enumerate(f):
                    stripped = line.strip()
                    if not stripped:
                        continue
                    try:
                        data = json.loads(stripped)
                        event = TrailEvent(**data)
                        self._events.append(event)
                    except (json.JSONDecodeError, TypeError) as exc:
                        self._corrupt_lines.append(line_num)
                        logger.warning(
                            "Trailproof: corrupt line %d in %s — %s",
                            line_num,
                            self._path,
                            exc,
                        )
        except OSError as exc:
            raise StoreError(f"Trailproof: read failed — {exc}") from exc

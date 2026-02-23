"""Trailproof core data types."""

from dataclasses import dataclass, field


@dataclass(frozen=True)
class TrailEvent:
    """A single event in the audit trail.

    Contains the 10-field event envelope. Domain-specific data
    goes in the payload field, which Trailproof stores opaquely.
    """

    event_id: str
    event_type: str
    timestamp: str
    actor_id: str
    tenant_id: str
    payload: dict[str, object]
    prev_hash: str
    hash: str
    trace_id: str | None = None
    session_id: str | None = None
    signature: str | None = None


@dataclass(frozen=True)
class QueryFilters:
    """Filters for querying events from a store.

    All fields are optional. No filters returns all events up to limit.
    """

    event_type: str | None = None
    actor_id: str | None = None
    tenant_id: str | None = None
    trace_id: str | None = None
    session_id: str | None = None
    from_time: str | None = None
    to_time: str | None = None
    limit: int = 100
    cursor: str | None = None


@dataclass(frozen=True)
class QueryResult:
    """Result of a query operation.

    Contains the matching events and an optional cursor for pagination.
    """

    events: list[TrailEvent] = field(default_factory=list)
    next_cursor: str | None = None


@dataclass(frozen=True)
class VerifyResult:
    """Result of a chain verification operation.

    intact is True when the entire chain is valid.
    broken contains the indices of events with invalid hashes.
    """

    intact: bool
    total: int
    broken: list[int] = field(default_factory=list)

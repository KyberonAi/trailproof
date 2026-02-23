"""Trailproof facade class — the main public API."""

import uuid
from datetime import UTC, datetime

from trailproof.chain import GENESIS_HASH, compute_hash
from trailproof.errors import SignatureError, ValidationError
from trailproof.signer import sign_event, verify_signature
from trailproof.stores.base import TrailStore
from trailproof.stores.memory import MemoryStore
from trailproof.types import QueryFilters, QueryResult, TrailEvent, VerifyResult


class Trailproof:
    """Tamper-evident audit trail using hash chains and optional HMAC signing.

    The main entry point for recording, querying, and verifying events.

    Args:
        store: Store type — "memory" (default) or "jsonl".
        path: File path for JSONL store. Required when store="jsonl".
        signing_key: Optional HMAC-SHA256 key for event signing.
        default_tenant_id: Default tenant_id used when emit() is called without one.
    """

    def __init__(
        self,
        *,
        store: str = "memory",
        path: str | None = None,
        signing_key: str | None = None,
        default_tenant_id: str | None = None,
    ) -> None:
        self._signing_key = signing_key
        self._default_tenant_id = default_tenant_id

        if store == "memory":
            self._store: TrailStore = MemoryStore()
        elif store == "jsonl":
            if path is None:
                raise ValidationError(
                    "Trailproof: missing required parameter — path is required for jsonl store"
                )
            # Lazy import — JsonlStore is implemented in Task 8
            try:
                from trailproof.stores.jsonl import JsonlStore  # type: ignore[import-untyped]
            except ImportError as exc:
                raise ValidationError(
                    "Trailproof: jsonl store not available — install or check your build"
                ) from exc
            self._store = JsonlStore(path)
        else:
            raise ValidationError(f"Trailproof: invalid store type — '{store}' is not supported")

    def emit(
        self,
        *,
        event_type: str,
        actor_id: str,
        payload: dict[str, object],
        tenant_id: str | None = None,
        trace_id: str | None = None,
        session_id: str | None = None,
    ) -> TrailEvent:
        """Record a new event in the audit trail.

        Validates required fields, generates event_id and timestamp,
        computes the hash chain link, and appends to the store.

        Args:
            event_type: Namespaced event type (e.g., "memproof.memory.write").
            actor_id: Who performed the action.
            payload: Domain-specific data (stored opaquely).
            tenant_id: Tenant/org isolation key. Falls back to default_tenant_id.
            trace_id: Optional cross-system correlation ID.
            session_id: Optional session grouping ID.

        Returns:
            The created TrailEvent with computed hash.

        Raises:
            ValidationError: If required fields are missing or empty.
        """
        # Resolve tenant_id
        resolved_tenant_id = tenant_id or self._default_tenant_id

        # Validate required fields
        self._validate_required("event_type", event_type)
        self._validate_required("actor_id", actor_id)
        self._validate_required("tenant_id", resolved_tenant_id)
        if payload is None:
            raise ValidationError("Trailproof: missing required field — payload is required")

        # Generate auto fields
        event_id = str(uuid.uuid4())
        timestamp = datetime.now(UTC).strftime("%Y-%m-%dT%H:%M:%S.%f")[:-3] + "Z"

        # Get previous hash for chain linking
        prev_hash = self._store.last_hash()

        # Build event without hash first (hash field is placeholder)
        event = TrailEvent(
            event_id=event_id,
            event_type=event_type,
            timestamp=timestamp,
            actor_id=actor_id,
            tenant_id=resolved_tenant_id,  # type: ignore[arg-type]
            payload=payload,
            prev_hash=prev_hash,
            hash="",
        )

        # Compute hash
        event_hash = compute_hash(prev_hash, event)

        # Rebuild with real hash and optional fields
        event = TrailEvent(
            event_id=event_id,
            event_type=event_type,
            timestamp=timestamp,
            actor_id=actor_id,
            tenant_id=resolved_tenant_id,  # type: ignore[arg-type]
            payload=payload,
            prev_hash=prev_hash,
            hash=event_hash,
            trace_id=trace_id,
            session_id=session_id,
        )

        # Sign if signing key is configured
        if self._signing_key is not None:
            signature = sign_event(self._signing_key, event)
            event = TrailEvent(
                event_id=event.event_id,
                event_type=event.event_type,
                timestamp=event.timestamp,
                actor_id=event.actor_id,
                tenant_id=event.tenant_id,
                payload=event.payload,
                prev_hash=event.prev_hash,
                hash=event.hash,
                trace_id=event.trace_id,
                session_id=event.session_id,
                signature=signature,
            )

        # Append to store
        self._store.append(event)

        return event

    def query(
        self,
        *,
        event_type: str | None = None,
        actor_id: str | None = None,
        tenant_id: str | None = None,
        trace_id: str | None = None,
        session_id: str | None = None,
        from_time: str | None = None,
        to_time: str | None = None,
        limit: int = 100,
        cursor: str | None = None,
    ) -> QueryResult:
        """Query events with optional filters and cursor pagination.

        All filter parameters are optional. No filters returns all events
        up to the limit.

        Args:
            event_type: Filter by exact event type match.
            actor_id: Filter by exact actor ID match.
            tenant_id: Filter by exact tenant ID match.
            trace_id: Filter by exact trace ID match.
            session_id: Filter by exact session ID match.
            from_time: Include events at or after this ISO-8601 timestamp.
            to_time: Include events at or before this ISO-8601 timestamp.
            limit: Maximum number of events to return (default 100).
            cursor: Resume pagination from this event_id.

        Returns:
            QueryResult with matching events and optional next_cursor.
        """
        filters = QueryFilters(
            event_type=event_type,
            actor_id=actor_id,
            tenant_id=tenant_id,
            trace_id=trace_id,
            session_id=session_id,
            from_time=from_time,
            to_time=to_time,
            limit=limit,
            cursor=cursor,
        )
        return self._store.query(filters)

    def get_trace(self, trace_id: str) -> list[TrailEvent]:
        """Return all events with the given trace_id, ordered by timestamp.

        Args:
            trace_id: The trace ID to filter by.

        Returns:
            List of matching events sorted by timestamp.
        """
        result = self._store.query(QueryFilters(trace_id=trace_id, limit=10_000))
        return sorted(result.events, key=lambda e: e.timestamp)

    def verify(self) -> VerifyResult:
        """Verify the integrity of the entire hash chain and signatures.

        Walks every event and recomputes its hash. If any event's hash
        does not match, that index and all subsequent indices are reported
        as broken (cascading breaks).

        If a signing key is configured, also verifies each event's signature.
        If an event has a signature but no key is configured, raises SignatureError.

        Returns:
            VerifyResult with intact=True if chain is valid, or
            intact=False with the list of broken indices.

        Raises:
            SignatureError: If an event has a signature but no signing key is configured.
        """
        events = self._store.read_all()
        total = len(events)

        if total == 0:
            return VerifyResult(intact=True, total=0)

        broken: list[int] = []
        prev_hash = GENESIS_HASH
        chain_broken = False

        for i, event in enumerate(events):
            if chain_broken:
                broken.append(i)
                continue

            # Check for signature without key
            if event.signature is not None and self._signing_key is None:
                raise SignatureError(
                    "Trailproof: signature found but no signing key configured "
                    "— cannot verify signature"
                )

            # Recompute hash using event with hash="" (as during emit)
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
            expected_hash = compute_hash(prev_hash, event_for_hash)

            if event.hash != expected_hash or event.prev_hash != prev_hash:
                broken.append(i)
                chain_broken = True
                continue

            # Verify signature if signing key is configured
            if self._signing_key is not None and event.signature is not None:
                try:
                    verify_signature(self._signing_key, event)
                except SignatureError:
                    broken.append(i)
                    chain_broken = True
                    continue

            prev_hash = event.hash

        intact = len(broken) == 0
        return VerifyResult(intact=intact, total=total, broken=broken)

    def flush(self) -> None:
        """Flush any buffered data to the underlying store.

        For MemoryStore this is a no-op. For persistent stores (e.g. JSONL),
        this ensures all data is written to disk.
        """
        # MemoryStore has no buffering; JSONL store will override if needed

    @staticmethod
    def _validate_required(field_name: str, value: str | None) -> None:
        """Validate that a required field is present and non-empty.

        Args:
            field_name: Name of the field for the error message.
            value: The field value to validate.

        Raises:
            ValidationError: If the value is None or empty string.
        """
        if value is None or value == "":
            raise ValidationError(f"Trailproof: missing required field — {field_name} is required")

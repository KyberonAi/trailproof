"""Tests for Trailproof verify() and flush()."""

from dataclasses import replace

from trailproof.trailproof import Trailproof
from trailproof.types import VerifyResult


class TestVerifyEmptyChain:
    """verify() on an empty chain."""

    def test_empty_chain_is_intact(self) -> None:
        tp = Trailproof()
        result = tp.verify()
        assert result.intact is True
        assert result.total == 0
        assert result.broken == []

    def test_empty_chain_returns_verify_result(self) -> None:
        tp = Trailproof()
        result = tp.verify()
        assert isinstance(result, VerifyResult)


class TestVerifyIntactChain:
    """verify() on an untampered chain."""

    def test_single_event_intact(self) -> None:
        tp = Trailproof(default_tenant_id="t")
        tp.emit(event_type="test", actor_id="a", payload={})
        result = tp.verify()
        assert result.intact is True
        assert result.total == 1
        assert result.broken == []

    def test_multiple_events_intact(self) -> None:
        tp = Trailproof(default_tenant_id="t")
        for i in range(5):
            tp.emit(event_type="test", actor_id="a", payload={"n": i})
        result = tp.verify()
        assert result.intact is True
        assert result.total == 5
        assert result.broken == []

    def test_ten_events_intact(self) -> None:
        tp = Trailproof(default_tenant_id="t")
        for i in range(10):
            tp.emit(event_type="test", actor_id="a", payload={"n": i})
        result = tp.verify()
        assert result.intact is True
        assert result.total == 10


class TestVerifyTamperedChain:
    """verify() detects tampered events."""

    def test_tampered_first_event(self) -> None:
        tp = Trailproof(default_tenant_id="t")
        tp.emit(event_type="test", actor_id="a", payload={"n": 1})
        tp.emit(event_type="test", actor_id="a", payload={"n": 2})
        tp.emit(event_type="test", actor_id="a", payload={"n": 3})

        # Tamper with the first event's payload
        events = tp._store.read_all()
        tampered = replace(events[0], payload={"n": 999})
        tp._store._events[0] = tampered  # type: ignore[attr-defined]

        result = tp.verify()
        assert result.intact is False
        assert result.total == 3
        assert 0 in result.broken

    def test_tampered_middle_event(self) -> None:
        tp = Trailproof(default_tenant_id="t")
        for i in range(5):
            tp.emit(event_type="test", actor_id="a", payload={"n": i})

        # Tamper with the third event
        events = tp._store.read_all()
        tampered = replace(events[2], payload={"n": 999})
        tp._store._events[2] = tampered  # type: ignore[attr-defined]

        result = tp.verify()
        assert result.intact is False
        assert 2 in result.broken

    def test_tampered_last_event(self) -> None:
        tp = Trailproof(default_tenant_id="t")
        for i in range(3):
            tp.emit(event_type="test", actor_id="a", payload={"n": i})

        # Tamper with the last event
        events = tp._store.read_all()
        tampered = replace(events[2], payload={"n": 999})
        tp._store._events[2] = tampered  # type: ignore[attr-defined]

        result = tp.verify()
        assert result.intact is False
        assert 2 in result.broken


class TestVerifyCascadingBreaks:
    """Tampering event N causes N through end to show as broken."""

    def test_cascading_from_first(self) -> None:
        tp = Trailproof(default_tenant_id="t")
        for i in range(5):
            tp.emit(event_type="test", actor_id="a", payload={"n": i})

        # Tamper event 0
        events = tp._store.read_all()
        tampered = replace(events[0], payload={"n": 999})
        tp._store._events[0] = tampered  # type: ignore[attr-defined]

        result = tp.verify()
        assert result.intact is False
        assert result.broken == [0, 1, 2, 3, 4]

    def test_cascading_from_middle(self) -> None:
        tp = Trailproof(default_tenant_id="t")
        for i in range(5):
            tp.emit(event_type="test", actor_id="a", payload={"n": i})

        # Tamper event 2
        events = tp._store.read_all()
        tampered = replace(events[2], payload={"n": 999})
        tp._store._events[2] = tampered  # type: ignore[attr-defined]

        result = tp.verify()
        assert result.intact is False
        assert result.broken == [2, 3, 4]

    def test_cascading_from_second_to_last(self) -> None:
        tp = Trailproof(default_tenant_id="t")
        for i in range(4):
            tp.emit(event_type="test", actor_id="a", payload={"n": i})

        # Tamper event 2
        events = tp._store.read_all()
        tampered = replace(events[2], payload={"n": 999})
        tp._store._events[2] = tampered  # type: ignore[attr-defined]

        result = tp.verify()
        assert result.broken == [2, 3]


class TestVerifyTamperedHash:
    """verify() detects directly modified hash fields."""

    def test_modified_hash_detected(self) -> None:
        tp = Trailproof(default_tenant_id="t")
        tp.emit(event_type="test", actor_id="a", payload={})
        tp.emit(event_type="test", actor_id="a", payload={})

        # Directly change the hash of event 0
        events = tp._store.read_all()
        tampered = replace(events[0], hash="deadbeef" * 8)
        tp._store._events[0] = tampered  # type: ignore[attr-defined]

        result = tp.verify()
        assert result.intact is False
        assert 0 in result.broken


class TestFlush:
    """flush() is a no-op for memory store."""

    def test_flush_does_not_raise(self) -> None:
        tp = Trailproof(default_tenant_id="t")
        tp.emit(event_type="test", actor_id="a", payload={})
        tp.flush()  # Should not raise

    def test_flush_preserves_events(self) -> None:
        tp = Trailproof(default_tenant_id="t")
        tp.emit(event_type="test", actor_id="a", payload={})
        tp.flush()
        assert tp._store.count() == 1

    def test_flush_on_empty_store(self) -> None:
        tp = Trailproof()
        tp.flush()  # Should not raise

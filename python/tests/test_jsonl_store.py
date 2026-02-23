"""Tests for JSONL file store."""

import json
import os
import stat
from dataclasses import asdict

import pytest

from trailproof.chain import GENESIS_HASH
from trailproof.errors import StoreError
from trailproof.stores.jsonl import JsonlStore
from trailproof.types import QueryFilters, TrailEvent


def _make_event(**overrides: object) -> TrailEvent:
    defaults: dict[str, object] = {
        "event_id": "evt-001",
        "event_type": "test.event",
        "timestamp": "2025-01-01T00:00:00.000Z",
        "actor_id": "actor-1",
        "tenant_id": "tenant-1",
        "payload": {"key": "value"},
        "prev_hash": GENESIS_HASH,
        "hash": "abc123",
    }
    defaults.update(overrides)
    return TrailEvent(**defaults)  # type: ignore[arg-type]


class TestJsonlStoreCreation:
    """JsonlStore creates files with correct permissions."""

    def test_creates_file_on_first_append(self, tmp_path: object) -> None:
        path = str(tmp_path) + "/events.jsonl"  # type: ignore[operator]
        store = JsonlStore(path)
        assert not os.path.exists(path)
        store.append(_make_event())
        assert os.path.exists(path)

    def test_file_has_0o600_permissions(self, tmp_path: object) -> None:
        path = str(tmp_path) + "/events.jsonl"  # type: ignore[operator]
        store = JsonlStore(path)
        store.append(_make_event())
        mode = stat.S_IMODE(os.stat(path).st_mode)
        assert mode == 0o600

    def test_empty_store_no_file(self, tmp_path: object) -> None:
        path = str(tmp_path) + "/events.jsonl"  # type: ignore[operator]
        store = JsonlStore(path)
        assert store.count() == 0
        assert store.read_all() == []


class TestJsonlStoreAppendAndRead:
    """JsonlStore append and read operations."""

    def test_append_one_event(self, tmp_path: object) -> None:
        path = str(tmp_path) + "/events.jsonl"  # type: ignore[operator]
        store = JsonlStore(path)
        event = _make_event()
        store.append(event)
        assert store.count() == 1
        assert store.read_all() == [event]

    def test_append_multiple_events(self, tmp_path: object) -> None:
        path = str(tmp_path) + "/events.jsonl"  # type: ignore[operator]
        store = JsonlStore(path)
        events = [
            _make_event(event_id="evt-001", hash="hash-1"),
            _make_event(event_id="evt-002", hash="hash-2"),
            _make_event(event_id="evt-003", hash="hash-3"),
        ]
        for event in events:
            store.append(event)
        assert store.count() == 3
        assert store.read_all() == events

    def test_file_contains_one_json_per_line(self, tmp_path: object) -> None:
        path = str(tmp_path) + "/events.jsonl"  # type: ignore[operator]
        store = JsonlStore(path)
        store.append(_make_event(event_id="evt-001"))
        store.append(_make_event(event_id="evt-002"))
        with open(path, encoding="utf-8") as f:
            lines = f.readlines()
        assert len(lines) == 2
        for line in lines:
            data = json.loads(line)
            assert isinstance(data, dict)

    def test_read_all_returns_copy(self, tmp_path: object) -> None:
        path = str(tmp_path) + "/events.jsonl"  # type: ignore[operator]
        store = JsonlStore(path)
        store.append(_make_event())
        result1 = store.read_all()
        result2 = store.read_all()
        assert result1 == result2
        assert result1 is not result2


class TestJsonlStoreLastHash:
    """JsonlStore last_hash returns correct values."""

    def test_empty_store_returns_genesis(self, tmp_path: object) -> None:
        path = str(tmp_path) + "/events.jsonl"  # type: ignore[operator]
        store = JsonlStore(path)
        assert store.last_hash() == GENESIS_HASH

    def test_returns_hash_of_last_event(self, tmp_path: object) -> None:
        path = str(tmp_path) + "/events.jsonl"  # type: ignore[operator]
        store = JsonlStore(path)
        store.append(_make_event(event_id="evt-001", hash="hash-1"))
        store.append(_make_event(event_id="evt-002", hash="hash-2"))
        assert store.last_hash() == "hash-2"


class TestJsonlStoreRecovery:
    """JsonlStore recovers state from existing file on init."""

    def test_recovers_events_on_init(self, tmp_path: object) -> None:
        path = str(tmp_path) + "/events.jsonl"  # type: ignore[operator]
        event = _make_event()
        # Write a JSONL file manually
        with open(path, "w", encoding="utf-8") as f:
            f.write(json.dumps(asdict(event)) + "\n")
        store = JsonlStore(path)
        assert store.count() == 1
        assert store.read_all()[0].event_id == "evt-001"

    def test_recovers_last_hash_on_init(self, tmp_path: object) -> None:
        path = str(tmp_path) + "/events.jsonl"  # type: ignore[operator]
        event = _make_event(hash="recovered-hash")
        with open(path, "w", encoding="utf-8") as f:
            f.write(json.dumps(asdict(event)) + "\n")
        store = JsonlStore(path)
        assert store.last_hash() == "recovered-hash"

    def test_recovers_count_on_init(self, tmp_path: object) -> None:
        path = str(tmp_path) + "/events.jsonl"  # type: ignore[operator]
        with open(path, "w", encoding="utf-8") as f:
            for i in range(5):
                event = _make_event(event_id=f"evt-{i}", hash=f"hash-{i}")
                f.write(json.dumps(asdict(event)) + "\n")
        store = JsonlStore(path)
        assert store.count() == 5

    def test_append_after_recovery_continues_chain(self, tmp_path: object) -> None:
        path = str(tmp_path) + "/events.jsonl"  # type: ignore[operator]
        event1 = _make_event(event_id="evt-001", hash="hash-1")
        with open(path, "w", encoding="utf-8") as f:
            f.write(json.dumps(asdict(event1)) + "\n")
        store = JsonlStore(path)
        event2 = _make_event(event_id="evt-002", hash="hash-2")
        store.append(event2)
        assert store.count() == 2
        assert store.last_hash() == "hash-2"
        # Verify file has both lines
        with open(path, encoding="utf-8") as f:
            lines = f.readlines()
        assert len(lines) == 2


class TestJsonlStoreCorruptLines:
    """JsonlStore handles corrupt lines gracefully."""

    def test_skips_corrupt_line(self, tmp_path: object) -> None:
        path = str(tmp_path) + "/events.jsonl"  # type: ignore[operator]
        event = _make_event(event_id="evt-001")
        with open(path, "w", encoding="utf-8") as f:
            f.write(json.dumps(asdict(event)) + "\n")
            f.write("this is not valid json\n")
            event2 = _make_event(event_id="evt-002", hash="hash-2")
            f.write(json.dumps(asdict(event2)) + "\n")
        store = JsonlStore(path)
        assert store.count() == 2

    def test_tracks_corrupt_line_indices(self, tmp_path: object) -> None:
        path = str(tmp_path) + "/events.jsonl"  # type: ignore[operator]
        event = _make_event()
        with open(path, "w", encoding="utf-8") as f:
            f.write(json.dumps(asdict(event)) + "\n")
            f.write("corrupt line one\n")
            f.write("corrupt line two\n")
            event2 = _make_event(event_id="evt-002", hash="hash-2")
            f.write(json.dumps(asdict(event2)) + "\n")
        store = JsonlStore(path)
        assert store.corrupt_lines == [1, 2]

    def test_no_corrupt_lines_in_clean_file(self, tmp_path: object) -> None:
        path = str(tmp_path) + "/events.jsonl"  # type: ignore[operator]
        event = _make_event()
        with open(path, "w", encoding="utf-8") as f:
            f.write(json.dumps(asdict(event)) + "\n")
        store = JsonlStore(path)
        assert store.corrupt_lines == []

    def test_skips_empty_lines(self, tmp_path: object) -> None:
        path = str(tmp_path) + "/events.jsonl"  # type: ignore[operator]
        event = _make_event()
        with open(path, "w", encoding="utf-8") as f:
            f.write(json.dumps(asdict(event)) + "\n")
            f.write("\n")
            f.write("\n")
        store = JsonlStore(path)
        assert store.count() == 1
        assert store.corrupt_lines == []

    def test_corrupt_json_with_valid_structure(self, tmp_path: object) -> None:
        path = str(tmp_path) + "/events.jsonl"  # type: ignore[operator]
        with open(path, "w", encoding="utf-8") as f:
            # Valid JSON but missing required fields
            f.write('{"not_a_field": "value"}\n')
        store = JsonlStore(path)
        assert store.count() == 0
        assert store.corrupt_lines == [0]

    def test_logs_warning_on_corrupt_line(
        self, tmp_path: object, caplog: pytest.LogCaptureFixture
    ) -> None:
        path = str(tmp_path) + "/events.jsonl"  # type: ignore[operator]
        with open(path, "w", encoding="utf-8") as f:
            f.write("not json\n")
        with caplog.at_level("WARNING"):
            JsonlStore(path)
        assert "corrupt line 0" in caplog.text


class TestJsonlStoreQuery:
    """JsonlStore query delegates filtering correctly."""

    def test_query_all(self, tmp_path: object) -> None:
        path = str(tmp_path) + "/events.jsonl"  # type: ignore[operator]
        store = JsonlStore(path)
        store.append(_make_event(event_id="evt-001", hash="h1"))
        store.append(_make_event(event_id="evt-002", hash="h2"))
        result = store.query(QueryFilters())
        assert len(result.events) == 2

    def test_query_with_filter(self, tmp_path: object) -> None:
        path = str(tmp_path) + "/events.jsonl"  # type: ignore[operator]
        store = JsonlStore(path)
        store.append(_make_event(event_id="evt-001", event_type="a", hash="h1"))
        store.append(_make_event(event_id="evt-002", event_type="b", hash="h2"))
        result = store.query(QueryFilters(event_type="a"))
        assert len(result.events) == 1
        assert result.events[0].event_id == "evt-001"

    def test_query_with_cursor(self, tmp_path: object) -> None:
        path = str(tmp_path) + "/events.jsonl"  # type: ignore[operator]
        store = JsonlStore(path)
        store.append(_make_event(event_id="evt-001", hash="h1"))
        store.append(_make_event(event_id="evt-002", hash="h2"))
        store.append(_make_event(event_id="evt-003", hash="h3"))
        result = store.query(QueryFilters(cursor="evt-001"))
        assert len(result.events) == 2
        assert result.events[0].event_id == "evt-002"

    def test_query_with_limit(self, tmp_path: object) -> None:
        path = str(tmp_path) + "/events.jsonl"  # type: ignore[operator]
        store = JsonlStore(path)
        for i in range(5):
            store.append(_make_event(event_id=f"evt-{i}", hash=f"h{i}"))
        result = store.query(QueryFilters(limit=2))
        assert len(result.events) == 2
        assert result.next_cursor == "evt-1"


class TestJsonlStoreWithTrailproof:
    """End-to-end tests: Trailproof with JSONL store."""

    def test_emit_and_verify(self, tmp_path: object) -> None:
        from trailproof.trailproof import Trailproof

        path = str(tmp_path) + "/events.jsonl"  # type: ignore[operator]
        tp = Trailproof(store="jsonl", path=path, default_tenant_id="t")
        for i in range(3):
            tp.emit(event_type="test", actor_id="a", payload={"n": i})
        result = tp.verify()
        assert result.intact is True
        assert result.total == 3

    def test_persist_and_reload(self, tmp_path: object) -> None:
        from trailproof.trailproof import Trailproof

        path = str(tmp_path) + "/events.jsonl"  # type: ignore[operator]
        tp1 = Trailproof(store="jsonl", path=path, default_tenant_id="t")
        tp1.emit(event_type="test", actor_id="a", payload={"n": 1})
        tp1.emit(event_type="test", actor_id="a", payload={"n": 2})

        # Create a new instance pointing at the same file
        tp2 = Trailproof(store="jsonl", path=path, default_tenant_id="t")
        assert tp2._store.count() == 2
        result = tp2.verify()
        assert result.intact is True

    def test_continue_chain_after_reload(self, tmp_path: object) -> None:
        from trailproof.trailproof import Trailproof

        path = str(tmp_path) + "/events.jsonl"  # type: ignore[operator]
        tp1 = Trailproof(store="jsonl", path=path, default_tenant_id="t")
        tp1.emit(event_type="test", actor_id="a", payload={"n": 1})

        tp2 = Trailproof(store="jsonl", path=path, default_tenant_id="t")
        tp2.emit(event_type="test", actor_id="a", payload={"n": 2})

        # Verify the full chain across both sessions
        tp3 = Trailproof(store="jsonl", path=path, default_tenant_id="t")
        result = tp3.verify()
        assert result.intact is True
        assert result.total == 2


class TestJsonlStoreErrorHandling:
    """JsonlStore raises StoreError on I/O failures."""

    def test_write_to_bad_path_raises(self) -> None:
        store = JsonlStore("/nonexistent/dir/events.jsonl")
        with pytest.raises(StoreError, match="write failed"):
            store.append(_make_event())

    def test_read_from_unreadable_file_raises(self, tmp_path: object) -> None:
        path = str(tmp_path) + "/events.jsonl"  # type: ignore[operator]
        with open(path, "w", encoding="utf-8") as f:
            f.write("data\n")
        os.chmod(path, 0o000)
        try:
            with pytest.raises(StoreError, match="read failed"):
                JsonlStore(path)
        finally:
            os.chmod(path, 0o600)  # Restore for cleanup

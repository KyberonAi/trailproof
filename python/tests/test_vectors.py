"""Cross-SDK test vectors — verify Python produces identical results to shared fixtures."""

import json
from pathlib import Path

from trailproof.chain import GENESIS_HASH, canonical_json, compute_hash
from trailproof.signer import sign_event
from trailproof.types import TrailEvent

VECTORS_PATH = Path(__file__).resolve().parent.parent.parent / "fixtures" / "test-vectors.json"


def _load_vectors() -> dict[str, object]:
    with open(VECTORS_PATH, encoding="utf-8") as f:
        return json.load(f)  # type: ignore[no-any-return]


def _event_from_dict(data: dict[str, object]) -> TrailEvent:
    return TrailEvent(**data)  # type: ignore[arg-type]


class TestGenesisHashVector:
    """Genesis hash matches shared test vector."""

    def test_genesis_hash(self) -> None:
        vectors = _load_vectors()
        assert GENESIS_HASH == vectors["genesis_hash"]


class TestCanonicalJsonVectors:
    """Canonical JSON output matches shared test vectors."""

    def test_all_canonical_json_vectors(self) -> None:
        vectors = _load_vectors()
        for vector in vectors["canonical_json"]:  # type: ignore[union-attr]
            event = _event_from_dict(vector["event"])
            result = canonical_json(event)
            assert result == vector["expected"], (
                f"Failed: {vector['description']}\n"
                f"  got:      {result}\n"
                f"  expected: {vector['expected']}"
            )

    def test_basic_event(self) -> None:
        vectors = _load_vectors()
        vector = vectors["canonical_json"][0]  # type: ignore[index]
        event = _event_from_dict(vector["event"])
        assert canonical_json(event) == vector["expected"]

    def test_nested_payload(self) -> None:
        vectors = _load_vectors()
        vector = vectors["canonical_json"][1]  # type: ignore[index]
        event = _event_from_dict(vector["event"])
        assert canonical_json(event) == vector["expected"]

    def test_optional_fields(self) -> None:
        vectors = _load_vectors()
        vector = vectors["canonical_json"][2]  # type: ignore[index]
        event = _event_from_dict(vector["event"])
        assert canonical_json(event) == vector["expected"]

    def test_unicode_and_emoji(self) -> None:
        vectors = _load_vectors()
        vector = vectors["canonical_json"][3]  # type: ignore[index]
        event = _event_from_dict(vector["event"])
        assert canonical_json(event) == vector["expected"]


class TestHashChainVectors:
    """Hash chain computation matches shared test vectors."""

    def test_all_hash_chain_vectors(self) -> None:
        vectors = _load_vectors()
        for vector in vectors["hash_chain"]:  # type: ignore[union-attr]
            event = _event_from_dict(vector["event"])
            result = compute_hash(vector["prev_hash"], event)
            assert result == vector["expected_hash"], (
                f"Failed: {vector['description']}\n"
                f"  got:      {result}\n"
                f"  expected: {vector['expected_hash']}"
            )

    def test_genesis_event_hash(self) -> None:
        vectors = _load_vectors()
        vector = vectors["hash_chain"][0]  # type: ignore[index]
        event = _event_from_dict(vector["event"])
        assert compute_hash(vector["prev_hash"], event) == vector["expected_hash"]

    def test_chained_event_hash(self) -> None:
        vectors = _load_vectors()
        vector = vectors["hash_chain"][1]  # type: ignore[index]
        event = _event_from_dict(vector["event"])
        assert compute_hash(vector["prev_hash"], event) == vector["expected_hash"]


class TestHmacVectors:
    """HMAC signature matches shared test vectors."""

    def test_all_hmac_vectors(self) -> None:
        vectors = _load_vectors()
        for vector in vectors["hmac"]:  # type: ignore[union-attr]
            event = _event_from_dict(vector["event"])
            result = sign_event(vector["key"], event)
            assert result == vector["expected_signature"], (
                f"Failed: {vector['description']}\n"
                f"  got:      {result}\n"
                f"  expected: {vector['expected_signature']}"
            )

    def test_basic_hmac(self) -> None:
        vectors = _load_vectors()
        vector = vectors["hmac"][0]  # type: ignore[index]
        event = _event_from_dict(vector["event"])
        assert sign_event(vector["key"], event) == vector["expected_signature"]

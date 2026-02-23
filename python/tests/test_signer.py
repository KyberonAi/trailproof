"""Tests for HMAC-SHA256 signing and verification."""

import pytest

from trailproof.chain import GENESIS_HASH
from trailproof.errors import SignatureError
from trailproof.signer import SIGNATURE_PREFIX, sign_event, verify_signature
from trailproof.trailproof import Trailproof
from trailproof.types import TrailEvent


def _make_event(**overrides: object) -> TrailEvent:
    defaults: dict[str, object] = {
        "event_id": "evt-001",
        "event_type": "test.event",
        "timestamp": "2025-01-01T00:00:00Z",
        "actor_id": "actor-1",
        "tenant_id": "tenant-1",
        "payload": {"key": "value"},
        "prev_hash": GENESIS_HASH,
        "hash": "abc123",
    }
    defaults.update(overrides)
    return TrailEvent(**defaults)  # type: ignore[arg-type]


class TestSignEvent:
    """sign_event produces correct HMAC-SHA256 signatures."""

    def test_returns_prefixed_signature(self) -> None:
        event = _make_event()
        sig = sign_event("secret", event)
        assert sig.startswith(SIGNATURE_PREFIX)

    def test_signature_is_deterministic(self) -> None:
        event = _make_event()
        sig1 = sign_event("secret", event)
        sig2 = sign_event("secret", event)
        assert sig1 == sig2

    def test_different_keys_produce_different_signatures(self) -> None:
        event = _make_event()
        sig1 = sign_event("key-a", event)
        sig2 = sign_event("key-b", event)
        assert sig1 != sig2

    def test_different_events_produce_different_signatures(self) -> None:
        event1 = _make_event(event_id="evt-001")
        event2 = _make_event(event_id="evt-002")
        sig1 = sign_event("secret", event1)
        sig2 = sign_event("secret", event2)
        assert sig1 != sig2

    def test_signature_hex_length(self) -> None:
        event = _make_event()
        sig = sign_event("secret", event)
        hex_part = sig[len(SIGNATURE_PREFIX) :]
        assert len(hex_part) == 64  # SHA-256 hex


class TestVerifySignature:
    """verify_signature checks HMAC with timing-safe comparison."""

    def test_valid_signature_passes(self) -> None:
        event = _make_event()
        sig = sign_event("secret", event)
        signed_event = _make_event(signature=sig)
        verify_signature("secret", signed_event)  # Should not raise

    def test_tampered_signature_raises(self) -> None:
        event = _make_event()
        sig = sign_event("secret", event)
        tampered_sig = sig[:-4] + "dead"
        signed_event = _make_event(signature=tampered_sig)
        with pytest.raises(SignatureError, match="signature mismatch"):
            verify_signature("secret", signed_event)

    def test_wrong_key_raises(self) -> None:
        event = _make_event()
        sig = sign_event("correct-key", event)
        signed_event = _make_event(signature=sig)
        with pytest.raises(SignatureError, match="signature mismatch"):
            verify_signature("wrong-key", signed_event)

    def test_missing_signature_raises(self) -> None:
        event = _make_event(signature=None)
        with pytest.raises(SignatureError, match="missing signature"):
            verify_signature("secret", event)

    def test_invalid_prefix_raises(self) -> None:
        event = _make_event(signature="not-hmac:abcdef")
        with pytest.raises(SignatureError, match="invalid signature format"):
            verify_signature("secret", event)


class TestTrailproofWithSigning:
    """Trailproof emit() signs events when signing_key is configured."""

    def test_emit_with_signing_key_adds_signature(self) -> None:
        tp = Trailproof(signing_key="secret", default_tenant_id="t")
        event = tp.emit(event_type="test", actor_id="a", payload={})
        assert event.signature is not None
        assert event.signature.startswith(SIGNATURE_PREFIX)

    def test_emit_without_signing_key_no_signature(self) -> None:
        tp = Trailproof(default_tenant_id="t")
        event = tp.emit(event_type="test", actor_id="a", payload={})
        assert event.signature is None

    def test_signed_event_verifiable(self) -> None:
        tp = Trailproof(signing_key="secret", default_tenant_id="t")
        event = tp.emit(event_type="test", actor_id="a", payload={})
        verify_signature("secret", event)  # Should not raise

    def test_verify_chain_with_signatures_intact(self) -> None:
        tp = Trailproof(signing_key="secret", default_tenant_id="t")
        for i in range(3):
            tp.emit(event_type="test", actor_id="a", payload={"n": i})
        result = tp.verify()
        assert result.intact is True

    def test_verify_detects_tampered_signature(self) -> None:
        tp = Trailproof(signing_key="secret", default_tenant_id="t")
        for i in range(3):
            tp.emit(event_type="test", actor_id="a", payload={"n": i})

        # Tamper with signature of event 1
        from dataclasses import replace

        events = tp._store.read_all()
        tampered = replace(events[1], signature="hmac-sha256:" + "dead" * 16)
        tp._store._events[1] = tampered  # type: ignore[attr-defined]

        result = tp.verify()
        assert result.intact is False
        assert 1 in result.broken

    def test_signature_without_key_raises_on_verify(self) -> None:
        tp_signed = Trailproof(signing_key="secret", default_tenant_id="t")
        tp_signed.emit(event_type="test", actor_id="a", payload={})

        # Create a new Trailproof without signing key but with the same store
        tp_unsigned = Trailproof(default_tenant_id="t")
        tp_unsigned._store = tp_signed._store

        with pytest.raises(SignatureError, match="no signing key configured"):
            tp_unsigned.verify()

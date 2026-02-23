"""Tests for the Trailproof error hierarchy."""

from trailproof.errors import (
    ChainError,
    SignatureError,
    StoreError,
    TrailproofError,
    ValidationError,
)


class TestErrorHierarchy:
    """All custom errors inherit from TrailproofError."""

    def test_validation_error_is_trailproof_error(self) -> None:
        assert issubclass(ValidationError, TrailproofError)

    def test_store_error_is_trailproof_error(self) -> None:
        assert issubclass(StoreError, TrailproofError)

    def test_chain_error_is_trailproof_error(self) -> None:
        assert issubclass(ChainError, TrailproofError)

    def test_signature_error_is_trailproof_error(self) -> None:
        assert issubclass(SignatureError, TrailproofError)

    def test_trailproof_error_is_exception(self) -> None:
        assert issubclass(TrailproofError, Exception)


class TestErrorInstantiation:
    """Errors can be raised and caught with messages."""

    def test_validation_error_message(self) -> None:
        err = ValidationError("Trailproof: missing required field — actor_id is required")
        assert str(err) == "Trailproof: missing required field — actor_id is required"

    def test_store_error_message(self) -> None:
        err = StoreError("Trailproof: write failed — permission denied")
        assert str(err) == "Trailproof: write failed — permission denied"

    def test_chain_error_message(self) -> None:
        err = ChainError("Trailproof: hash chain broken — event 3 tampered")
        assert str(err) == "Trailproof: hash chain broken — event 3 tampered"

    def test_signature_error_message(self) -> None:
        err = SignatureError("Trailproof: signature mismatch — HMAC verification failed")
        assert str(err) == "Trailproof: signature mismatch — HMAC verification failed"


class TestErrorCatching:
    """Specific errors can be caught by their base class."""

    def test_catch_validation_as_trailproof(self) -> None:
        try:
            raise ValidationError("test")
        except TrailproofError as e:
            assert str(e) == "test"

    def test_catch_store_as_trailproof(self) -> None:
        try:
            raise StoreError("test")
        except TrailproofError as e:
            assert str(e) == "test"

    def test_catch_chain_as_trailproof(self) -> None:
        try:
            raise ChainError("test")
        except TrailproofError as e:
            assert str(e) == "test"

    def test_catch_signature_as_trailproof(self) -> None:
        try:
            raise SignatureError("test")
        except TrailproofError as e:
            assert str(e) == "test"

    def test_specific_error_not_caught_by_sibling(self) -> None:
        try:
            raise ValidationError("test")
        except StoreError:
            assert False, "Should not catch ValidationError as StoreError"
        except ValidationError:
            pass

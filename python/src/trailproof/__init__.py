"""Trailproof — tamper-evident audit trail with hash chains and optional HMAC signing."""

from trailproof.errors import (
    ChainError,
    SignatureError,
    StoreError,
    TrailproofError,
    ValidationError,
)
from trailproof.trailproof import Trailproof
from trailproof.types import QueryResult, TrailEvent, VerifyResult

__all__ = [
    "ChainError",
    "QueryResult",
    "SignatureError",
    "StoreError",
    "TrailEvent",
    "Trailproof",
    "TrailproofError",
    "ValidationError",
    "VerifyResult",
]

"""Trailproof error hierarchy."""


class TrailproofError(Exception):
    """Base error for all Trailproof operations."""


class ValidationError(TrailproofError):
    """Raised when event data is invalid (missing or empty required fields)."""


class StoreError(TrailproofError):
    """Raised when a storage operation fails (disk, permissions, corruption)."""


class ChainError(TrailproofError):
    """Raised when the hash chain is broken."""


class SignatureError(TrailproofError):
    """Raised when HMAC signature verification fails."""

"""Optional HMAC-SHA256 event signing and verification."""

import hashlib
import hmac

from trailproof.chain import canonical_json
from trailproof.errors import SignatureError
from trailproof.types import TrailEvent

SIGNATURE_PREFIX = "hmac-sha256:"


def sign_event(key: str, event: TrailEvent) -> str:
    """Compute an HMAC-SHA256 signature for an event.

    Args:
        key: The HMAC signing key.
        event: The trail event to sign.

    Returns:
        Signature string in format "hmac-sha256:<hex>".
    """
    canonical = canonical_json(event)
    mac = hmac.new(key.encode("utf-8"), canonical.encode("utf-8"), hashlib.sha256)
    return SIGNATURE_PREFIX + mac.hexdigest()


def verify_signature(key: str, event: TrailEvent) -> None:
    """Verify the HMAC-SHA256 signature on an event.

    Uses timing-safe comparison to prevent timing attacks.

    Args:
        key: The HMAC signing key.
        event: The trail event with a signature to verify.

    Raises:
        SignatureError: If the event has no signature or the signature doesn't match.
    """
    if event.signature is None:
        raise SignatureError("Trailproof: missing signature — event has no signature field")

    if not event.signature.startswith(SIGNATURE_PREFIX):
        raise SignatureError(
            "Trailproof: invalid signature format — expected 'hmac-sha256:' prefix"
        )

    expected = sign_event(key, event)
    if not hmac.compare_digest(event.signature, expected):
        raise SignatureError("Trailproof: signature mismatch — HMAC verification failed")

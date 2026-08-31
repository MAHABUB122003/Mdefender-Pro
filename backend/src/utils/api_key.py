"""API key generation utilities."""

import secrets

API_KEY_LENGTH = 64


def generate_api_key() -> str:
    """Generate a cryptographically random URL-safe API key.

    `secrets.token_urlsafe(48)` produces exactly 48 * 4 / 3 = 64
    characters with no padding.
    """
    return secrets.token_urlsafe(48)
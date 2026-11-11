"""API key generation and formatting utilities with enterprise-grade cryptographic security."""

import secrets


def generate_api_key(prefix: str = "") -> str:
    """Generate a cryptographically random 256-bit (64 hex characters) enterprise API key.
    
    Format: 64-character lowercase hexadecimal token generated via secrets.token_hex(32) with 256 bits of true entropy.
    """
    token = secrets.token_hex(32)
    if prefix:
        return f"{prefix}{token}"
    return token


def mask_api_key(api_key: str | None) -> str:
    """Format an API key for secure UI presentation (e.g. a7d2472e••••••••••••••••••••••••cfd2d)."""
    if not api_key or len(api_key) < 16:
        return "••••••••••••••••"
    return f"{api_key[:8]}••••••••••••••••••••••••{api_key[-8:]}"

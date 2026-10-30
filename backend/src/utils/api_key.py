"""API key generation and formatting utilities with enterprise-grade cryptographic security."""

import secrets
import string

API_KEY_PREFIX = "mdf_live_sec_"
API_KEY_ENTROPY_LENGTH = 40
BASE62_ALPHABET = string.ascii_letters + string.digits
API_KEY_LENGTH = len(API_KEY_PREFIX) + API_KEY_ENTROPY_LENGTH  # 53 characters


def generate_api_key(prefix: str = API_KEY_PREFIX) -> str:
    """Generate a cryptographically random, collision-resistant enterprise API key.
    
    Format: mdf_live_sec_<40_base62_chars> (~238 bits of cryptographic entropy).
    Strictly base62 (letters + digits) prevents URL encoding issues and shell escaping bugs.
    """
    token = "".join(secrets.choice(BASE62_ALPHABET) for _ in range(API_KEY_ENTROPY_LENGTH))
    return f"{prefix}{token}"


def mask_api_key(api_key: str | None) -> str:
    """Format an API key for secure UI presentation (e.g. mdf_live_sec_••••••••••••3a9f)."""
    if not api_key or len(api_key) < 12:
        return "••••••••••••"
    if api_key.startswith(API_KEY_PREFIX):
        return f"{API_KEY_PREFIX}••••••••••••{api_key[-4:]}"
    return f"{api_key[:8]}••••••••••••{api_key[-4:]}"

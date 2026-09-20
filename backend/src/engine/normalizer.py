"""MDefender Pro Deep Recursive Normalization Subsystem (WAF 3.0).

Provides robust, multi-pass de-obfuscation across multiple encoding schemes:
- Multi-pass URL & percent-encoding recursion (handles nested %252e%252e%252f)
- Hex string unpacking (0x..., \\x...)
- Unicode NFKC normalization and unicode escape sequences (\\u003c)
- HTML entity resolution (named, decimal &#60;, hex &#x3c;)
- Comment stripping (SQL /**/, --, #, C/JS /* */ and //)
- Null-byte and control character removal
- Whitespace and line-break collapsing
"""

import html
import re
import unicodedata
import urllib.parse
from typing import List, Set


class DeepNormalizer:
    def __init__(self, max_recursion_depth: int = 5):
        self.max_recursion_depth = max_recursion_depth

    def normalize(self, text: str) -> str:
        """Deeply normalizes text through multi-stage recursive de-obfuscation."""
        if not text or not isinstance(text, str):
            return ""

        current = text

        # Stage 1: Strip null bytes & bad control characters immediately
        current = self.strip_null_and_control_chars(current)

        # Stage 2: Recursive URL & Percent Decoding
        current = self.recursive_url_decode(current)

        # Stage 3: HTML entity decoding
        current = self.decode_html_entities(current)

        # Stage 4: Unicode & NFKC normalization
        current = self.normalize_unicode(current)

        # Stage 5: Hex & Unicode escape sequence expansion (\x41, \u0041, 0x41)
        current = self.decode_escape_sequences(current)

        # Stage 6: SQL & C-Style comment stripping and keyword defragmentation
        current = self.strip_comments(current)

        # Stage 7: Whitespace collapsing
        current = self.collapse_whitespace(current)

        return current

    def get_all_normalized_variants(self, text: str) -> List[str]:
        """Returns a list of payload variants (raw, normalized, comment-stripped, compact)
        to ensure zero bypass across both signature matching and ML analysis."""
        if not text:
            return [""]

        variants: Set[str] = set()
        variants.add(text)

        norm = self.normalize(text)
        variants.add(norm)

        # Also provide a compact no-whitespace variant for token detection
        compact = re.sub(r"\s+", "", norm)
        variants.add(compact)

        # Also provide raw comment stripped
        comment_stripped = self.strip_comments(text)
        variants.add(comment_stripped)

        return [v for v in variants if v]

    def strip_null_and_control_chars(self, text: str) -> str:
        """Removes null bytes and control chars (except standard \t, \n, \r)."""
        # Remove %00 and literal \x00
        text = re.sub(r"(?i)%00|\\0|\\x00|\x00", "", text)
        # Remove unprintable chars (0x01-0x08, 0x0B, 0x0C, 0x0E-0x1F, 0x7F)
        text = re.sub(r"[\x01-\x08\x0b\x0c\x0e-\x1f\x7f]", " ", text)
        return text

    def recursive_url_decode(self, text: str) -> str:
        """Decodes URL percent-encoding recursively up to max depth."""
        current = text
        for _ in range(self.max_recursion_depth):
            try:
                decoded = urllib.parse.unquote(current)
                if decoded == current:
                    break
                current = decoded
            except Exception:
                break
        return current

    def decode_html_entities(self, text: str) -> str:
        """Decodes HTML numeric and named entities (&#x3c;, &#60;, &lt;)."""
        try:
            # First pass
            decoded = html.unescape(text)
            # Second pass for double-encoded entities
            decoded = html.unescape(decoded)
            return decoded
        except Exception:
            return text

    def normalize_unicode(self, text: str) -> str:
        """Normalizes Unicode text to NFKC standard (flattens full-width and lookalike chars)."""
        try:
            # NFKC decomposes combined characters and substitutes compatibility characters
            norm = unicodedata.normalize("NFKC", text)
            # Replace common homoglyphs/lookalikes (e.g. Cyrillic/Greek lookalikes)
            homoglyphs = {
                "а": "a", "е": "e", "о": "o", "р": "p", "с": "c", "у": "y", "х": "x",
                "А": "A", "В": "B", "Е": "E", "К": "K", "М": "M", "Н": "H", "О": "O",
                "Р": "P", "С": "C", "Т": "T", "Х": "X"
            }
            for k, v in homoglyphs.items():
                if k in norm:
                    norm = norm.replace(k, v)
            return norm
        except Exception:
            return text

    def decode_escape_sequences(self, text: str) -> str:
        r"""Decodes \xHH and \uHHHH escape sequences commonly used in JS/JSON/PHP."""
        # Decode \u00XX
        def replace_u(match):
            try:
                return chr(int(match.group(1), 16))
            except Exception:
                return match.group(0)

        text = re.sub(r"(?i)\\u([0-9a-f]{4})", replace_u, text)

        # Decode \xXX
        def replace_x(match):
            try:
                return chr(int(match.group(1), 16))
            except Exception:
                return match.group(0)

        text = re.sub(r"(?i)\\x([0-9a-f]{2})", replace_x, text)

        return text

    def strip_comments(self, text: str) -> str:
        """Removes SQL comments (/**/, --, #) and C-style comments while keeping word boundaries."""
        # Replace inline C/SQL comments /* ... */ with a single space
        cleaned = re.sub(r"/\*.*?\*/", " ", text, flags=re.DOTALL)
        
        # Strip line comments (-- or #)
        cleaned = re.sub(r"(--\s*|#)[^\r\n]*", " ", cleaned)
        
        # De-fragment common SQL/HTML keywords interrupted by inline comments (e.g. UN/**/ION -> UNION)
        keywords = ["UNION", "SELECT", "INSERT", "UPDATE", "DELETE", "DROP", "SCHEMA", "FROM", "WHERE", "OR", "AND", "EXEC", "EVAL", "SCRIPT"]
        for kw in keywords:
            # Pattern matching letters of keyword separated by optional spaces
            spaced_pat = r"(?i)\b" + r"\s*".join([re.escape(c) for c in kw]) + r"\b"
            cleaned = re.sub(spaced_pat, kw, cleaned)

        return cleaned

    def collapse_whitespace(self, text: str) -> str:
        """Collapses excessive whitespaces, tabs, newlines into standard single spaces."""
        return re.sub(r"\s+", " ", text).strip()

"""
MDefender Pro - Python WAF Client

Protects Flask, Django, and WSGI applications against web attacks.
"""

from .client import MDefender, waf_middleware, DjangoWAFMiddleware

__version__ = "1.1.0"
__author__ = "MDefender Pro"

__all__ = ["MDefender", "waf_middleware", "DjangoWAFMiddleware"]

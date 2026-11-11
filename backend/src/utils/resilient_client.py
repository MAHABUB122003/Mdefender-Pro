"""Enterprise Resilient HTTP Client for MDefender Pro SaaS Cloud.

Provides high-concurrency connection pooling, automatic retries with exponential backoff,
keep-alive socket reuse, and fail-safe handling to ensure connections never drop
under heavy multi-tenant fleet workloads.
"""

import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
from typing import Optional

_resilient_session: Optional[requests.Session] = None


def get_resilient_session(
    pool_connections: int = 150,
    pool_maxsize: int = 1000,
    max_retries: int = 2
) -> requests.Session:
    """Return a shared singleton requests.Session with connection pooling and retry strategy."""
    global _resilient_session
    if _resilient_session is None:
        session = requests.Session()
        retry_strategy = Retry(
            total=max_retries,
            connect=max_retries,
            read=max_retries,
            backoff_factor=0.25,
            status_forcelist=[500, 502, 503, 504],
            raise_on_status=False
        )
        adapter = HTTPAdapter(
            pool_connections=pool_connections,
            pool_maxsize=pool_maxsize,
            max_retries=retry_strategy,
            pool_block=False
        )
        session.mount("http://", adapter)
        session.mount("https://", adapter)
        session.headers.update({
            "User-Agent": "MDefender-Pro-Cloud/4.5 (Enterprise Fleet Sync Engine; High-Resilience)",
            "Connection": "keep-alive"
        })
        _resilient_session = session
    return _resilient_session


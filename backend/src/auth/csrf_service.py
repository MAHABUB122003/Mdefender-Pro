import secrets
from src.auth.config import AuthConfig


class CSRFService:
    def __init__(self):
        self.config = AuthConfig()

    def generate_token(self) -> str:
        return secrets.token_urlsafe(32)

    def validate_token(self, cookie_token: str, header_token: str) -> bool:
        if not cookie_token or not header_token:
            return False
        return secrets.compare_digest(cookie_token, header_token)

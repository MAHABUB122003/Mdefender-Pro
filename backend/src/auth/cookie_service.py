from typing import Optional
from datetime import datetime, timedelta, timezone
from fastapi import Response, Request
from src.auth.config import AuthConfig


class CookieService:
    def __init__(self):
        self.config = AuthConfig()

    def set_access_token(self, response: Response, token: str, remember_me: bool = False):
        max_age = (7 * 24 * 60 * 60) if remember_me else (self.config.ACCESS_TOKEN_EXPIRE_MINUTES * 60)
        response.set_cookie(
            key=self.config.ACCESS_TOKEN_COOKIE,
            value=token,
            max_age=max_age,
            httponly=True,
            secure=self.config.COOKIE_SECURE,
            samesite=self.config.COOKIE_SAMESITE,
            domain=self.config.COOKIE_DOMAIN or None,
            path='/',
        )

    def set_refresh_token(self, response: Response, token: str, remember_me: bool = False):
        max_age = (30 * 24 * 60 * 60) if remember_me else (self.config.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60)
        response.set_cookie(
            key=self.config.REFRESH_TOKEN_COOKIE,
            value=token,
            max_age=max_age,
            httponly=True,
            secure=self.config.COOKIE_SECURE,
            samesite=self.config.COOKIE_SAMESITE,
            domain=self.config.COOKIE_DOMAIN or None,
            path='/',
        )

    def set_csrf_token(self, response: Response, token: str):
        response.set_cookie(
            key=self.config.CSRF_COOKIE,
            value=token,
            max_age=self.config.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            httponly=False,
            secure=self.config.COOKIE_SECURE,
            samesite=self.config.COOKIE_SAMESITE,
            domain=self.config.COOKIE_DOMAIN or None,
            path='/',
        )

    def set_auth_cookies(self, response: Response, access_token: str,
                         refresh_token: str, csrf_token: str,
                         remember_me: bool = False):
        self.set_access_token(response, access_token, remember_me)
        self.set_refresh_token(response, refresh_token, remember_me)
        self.set_csrf_token(response, csrf_token)

    def clear_auth_cookies(self, response: Response):
        cookie_args = {
            'httponly': True,
            'secure': self.config.COOKIE_SECURE,
            'samesite': self.config.COOKIE_SAMESITE,
            'domain': self.config.COOKIE_DOMAIN or None,
            'path': '/',
        }
        response.delete_cookie(self.config.ACCESS_TOKEN_COOKIE, **cookie_args)
        response.delete_cookie(self.config.REFRESH_TOKEN_COOKIE, **cookie_args)
        response.delete_cookie(self.config.CSRF_COOKIE, **{
            'httponly': False,
            'secure': self.config.COOKIE_SECURE,
            'samesite': self.config.COOKIE_SAMESITE,
            'domain': self.config.COOKIE_DOMAIN or None,
            'path': '/',
        })

    def get_access_token(self, request: Request) -> Optional[str]:
        return request.cookies.get(self.config.ACCESS_TOKEN_COOKIE)

    def get_refresh_token(self, request: Request) -> Optional[str]:
        return request.cookies.get(self.config.REFRESH_TOKEN_COOKIE)

    def get_csrf_token(self, request: Request) -> Optional[str]:
        return request.cookies.get(self.config.CSRF_COOKIE)

    def get_csrf_from_header(self, request: Request) -> Optional[str]:
        return request.headers.get(self.config.CSRF_HEADER)

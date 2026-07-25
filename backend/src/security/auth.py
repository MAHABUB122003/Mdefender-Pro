"""
Admin Authentication — Enterprise-grade bcrypt hashing with brute-force protection.

Migrates from SHA-256 to bcrypt on first successful admin login.
Brute-force protection: 5 attempts, 300-second lockout.
"""

import hashlib
import os
import time
import logging
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger('mdefender.auth')


class Auth:
    def __init__(self):
        self._db = None
        self.admin_username = os.getenv('ADMIN_USERNAME', 'admin')
        self._password_hash = None
        self._attempts = {}
        self.max_attempts = 5
        self.lockout_time = 300

        # Lazy-init PasswordService to avoid circular imports
        self._password_service = None
        self._load_persisted_password()

    def _get_password_service(self):
        if self._password_service is None:
            from src.services.password_service import PasswordService
            self._password_service = PasswordService()
        return self._password_service

    def _get_db(self):
        if self._db is None:
            from src.database.mongodb_connection import MongoDB
            self._db = MongoDB()
        return self._db

    def _load_persisted_password(self):
        """Load admin password from database. Handle both bcrypt and legacy SHA-256."""
        try:
            db = self._get_db()
            doc = db.settings.find_one({'_type': 'admin_password'})
            if doc and 'password_hash' in doc:
                self._password_hash = doc['password_hash']
                return
        except Exception:
            pass

        # No persisted password — hash the .env password with bcrypt
        env_password = os.getenv('ADMIN_PASSWORD', 'admin123')
        ps = self._get_password_service()
        if ps.is_bcrypt_hash(env_password):
            self._password_hash = env_password
        else:
            self._password_hash = ps.hash_password(env_password)
            self._persist_password()

    def _persist_password(self):
        """Save current password hash to database."""
        try:
            db = self._get_db()
            db.settings.update_one(
                {'_type': 'admin_password'},
                {'$set': {'password_hash': self._password_hash}},
                upsert=True
            )
        except Exception:
            pass

    def verify_admin(self, username, password, ip='unknown'):
        """
        Verify admin credentials with brute-force protection.
        Migrates SHA-256 → bcrypt on successful login.
        """
        if username != self.admin_username:
            return False

        # Brute-force check
        if ip in self._attempts:
            attempts, lockout_time = self._attempts[ip]
            if attempts >= self.max_attempts and time.time() - lockout_time < self.lockout_time:
                logger.warning(f"Admin login locked out (brute-force): IP {ip}")
                return False
            if time.time() - lockout_time >= self.lockout_time:
                del self._attempts[ip]

        ps = self._get_password_service()
        authenticated = False

        # --- bcrypt verification ---
        if ps.is_bcrypt_hash(self._password_hash):
            authenticated = ps.verify_password(password, self._password_hash)

        # --- Legacy SHA-256 verification → migrate ---
        elif ps.is_sha256_hash(self._password_hash):
            legacy_hash = hashlib.sha256(password.encode()).hexdigest()
            if legacy_hash == self._password_hash:
                authenticated = True
                # Migrate to bcrypt
                self._password_hash = ps.hash_password(password)
                self._persist_password()
                logger.info("Admin password migrated from SHA-256 to bcrypt")

        # --- Fallback: plain text compare (one-time migration) ---
        else:
            env_password = os.getenv('ADMIN_PASSWORD', 'admin123')
            if password == env_password:
                authenticated = True
                self._password_hash = ps.hash_password(password)
                self._persist_password()
                logger.info("Admin password migrated from plaintext to bcrypt")

        if authenticated:
            self._attempts.pop(ip, None)
            logger.info(f"Admin login successful from {ip}")
            return True

        # Record failed attempt
        if ip not in self._attempts:
            self._attempts[ip] = [0, time.time()]
        self._attempts[ip][0] += 1
        self._attempts[ip][1] = time.time()
        logger.warning(f"Admin login failed from {ip} (attempt {self._attempts[ip][0]})")
        return False

    def update_password(self, username, new_password):
        """Update admin password with bcrypt hashing."""
        if username != self.admin_username:
            return False

        ps = self._get_password_service()
        self._password_hash = ps.hash_password(new_password)
        self._persist_password()
        logger.info("Admin password updated")
        return True

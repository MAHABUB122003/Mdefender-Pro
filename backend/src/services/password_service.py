"""
Password Service — Enterprise password hashing and strength validation.

OWASP-compliant: bcrypt with configurable rounds, salted automatically.
Reusable across admin auth, user auth, and password reset flows.
Unit-testable: no database dependency.
"""

import re
import logging
from typing import Dict, List

from passlib.context import CryptContext

logger = logging.getLogger('mdefender.auth')


class PasswordService:
    """
    Handles password hashing, verification, and enterprise strength validation.

    Follows OWASP Password Storage Cheat Sheet:
    - bcrypt with 12 rounds (adaptive cost factor)
    - Automatic per-hash salt
    - Constant-time comparison via passlib
    """

    MIN_LENGTH = 12
    BCRYPT_ROUNDS = 12

    # OWASP-recommended special characters
    SPECIAL_CHARS = set('!@#$%^&*()_+-=[]{}|;:\'",.<>?/~`')

    # Top 200 most common passwords (block these)
    WEAK_PASSWORDS: set = {
        'password', 'password1', 'password12', 'password123', 'password1234',
        '123456', '12345678', '123456789', '1234567890', '12345678910',
        'qwerty', 'qwerty123', 'qwertyuiop', 'asdfgh', 'asdfghjkl',
        'zxcvbn', 'zxcvbnm', 'abc123', 'abcd1234', 'abcdef',
        'letmein', 'welcome', 'welcome1', 'welcome123', 'admin', 'admin123',
        'master', 'dragon', 'login', 'princess', 'football', 'shadow',
        'sunshine', 'trustno1', 'iloveyou', 'batman', 'access', 'hello',
        'charlie', 'donald', 'login123', 'passw0rd', 'pass@word1',
        'changeme', 'default', 'test', 'test123', 'guest', 'root',
        'toor', 'p@ssw0rd', 'p@ssword', 'p@ssword1', 'p@ssword123',
        'pa$$word', 'pa$$w0rd', 'secret', 'master123', 'admin@123',
        'a', 'aa', 'aaa', 'aaaa', 'aaaaa', 'aaaaaa', 'ab', 'abc',
        'abcdefg', 'abcdefgh', 'abcdefghi', 'password!', 'password!!',
        'passw0rd!', 'qwerty!', 'qwerty1!', 'letmein1', 'letmein12',
        'welcome!', 'hello123', 'hello1234', 'hello!', 'hello1',
        '123456789a', '1234567891', '12345678912', '123456789123',
        'iloveyou1', 'iloveyou12', 'iloveyou123', 'babygirl',
        'monkey123', 'dragon123', 'master123', 'sunshine123',
        'princess1', 'princess123', 'trustno123', 'baseball',
        'soccer', 'hockey', 'batman123', 'michael', 'michael1',
        'ashley', 'jessica', 'charlie1', 'donald123', 'password12345',
        'password123456', 'qwerty1234', '1qaz2wsx', '1q2w3e4r',
        '1q2w3e4r5t', '1qazxsw2', 'abcdef123', 'abcdefg123',
        'abcdefgh123', 'abc123456', '111111', '1111111', '11111111',
        '222222', '333333', '444444', '555555', '666666', '777777',
        '888888', '999999', '000000', '121212', '123123', '12341234',
        'michael123', 'jennifer', 'jordan', 'amanda', 'andrew',
        'joshua', 'joshua123', 'qwerty12', 'qwerty12345', 'abc1234',
        'password12', 'pass123', 'pass1234', 'master12', 'dragon1',
        'monkey', 'qwerty1', '1234qwer', '1234abcd', 'qwertyui',
        'ashley123', 'jessica123', 'charlie123', 'baseball123',
        'soccer123', 'hockey123', '123456789101112', 'abcdefg1',
        'abcde1234', 'abcd123', 'a123456', 'a12345678', 'a123456789',
        'iloveu', 'love', 'love123', 'god', 'god123', 'money',
        'money123', 'freedom', 'whatever', 'nothing', 'killer',
        'hunter', 'hunter2', 'summer', 'winter', 'spring', 'autumn',
        'january', 'february', 'march', 'april', 'may', 'june',
        'july', 'august', 'september', 'october', 'november', 'december',
        'samsung', 'apple', 'google', 'microsoft', 'amazon',
        'computer', 'internet', 'server', 'system', 'security',
        'network', 'firewall', 'hackme', 'hacker', 'root123',
        'admin1', 'admin12', 'administrator', 'superadmin', 'user',
        'user123', 'user1234', 'test1234', 'testing', 'temp123',
    }

    def __init__(self):
        self._pwd_context = CryptContext(
            schemes=["bcrypt"],
            deprecated="auto",
            bcrypt__rounds=self.BCRYPT_ROUNDS,
        )

    def hash_password(self, password: str) -> str:
        """
        Hash a password using bcrypt with automatic salt generation.

        Returns:
            str: bcrypt hash string (60 chars, starts with $2b$)
        """
        hashed = self._pwd_context.hash(password)
        logger.info("Password hashed successfully")
        return hashed

    def verify_password(self, password: str, hashed: str) -> bool:
        """
        Verify a password against a bcrypt hash.
        Uses constant-time comparison (OWASP requirement).

        Returns:
            bool: True if password matches hash
        """
        return self._pwd_context.verify(password, hashed)

    def needs_rehash(self, hashed: str) -> bool:
        """
        Check if a hash needs to be rehashed (e.g., after increasing rounds).

        Returns:
            bool: True if hash should be regenerated
        """
        return self._pwd_context.needs_update(hashed)

    @staticmethod
    def is_bcrypt_hash(hashed: str) -> bool:
        """
        Check if a stored hash is bcrypt format.
        Used for SHA-256 → bcrypt migration detection.
        bcrypt hashes start with $2b$ and are 60 characters.
        """
        if not hashed or not isinstance(hashed, str):
            return False
        return hashed.startswith('$2b$') and len(hashed) == 60

    @staticmethod
    def is_sha256_hash(hashed: str) -> bool:
        """
        Detect legacy SHA-256 hashes (64 hex chars, no prefix).
        Used for migration detection.
        """
        if not hashed or not isinstance(hashed, str):
            return False
        return len(hashed) == 64 and all(c in '0123456789abcdef' for c in hashed)

    def validate_strength(self, password: str) -> Dict[str, object]:
        """
        Validate password against enterprise security policy.

        Policy (OWASP-aligned):
        - Minimum 12 characters
        - At least 1 uppercase letter
        - At least 1 lowercase letter
        - At least 1 digit
        - At least 1 special character
        - Not a known weak/common password
        - No 4+ sequential characters (abc, 123)
        - No 3+ repeated characters (aaa, 111)

        Returns:
            dict: {
                'valid': bool,
                'errors': List[str],
                'strength': 'weak' | 'fair' | 'strong' | 'very_strong'
            }
        """
        errors: List[str] = []

        # Length check
        if len(password) < self.MIN_LENGTH:
            errors.append(
                f"Password must be at least {self.MIN_LENGTH} characters long"
            )

        # Uppercase check
        if not re.search(r'[A-Z]', password):
            errors.append(
                "Password must contain at least one uppercase letter (A-Z)"
            )

        # Lowercase check
        if not re.search(r'[a-z]', password):
            errors.append(
                "Password must contain at least one lowercase letter (a-z)"
            )

        # Digit check
        if not re.search(r'\d', password):
            errors.append(
                "Password must contain at least one number (0-9)"
            )

        # Special character check
        if not any(c in self.SPECIAL_CHARS for c in password):
            errors.append(
                "Password must contain at least one special character (!@#$%^&* etc.)"
            )

        # Common password dictionary check
        if password.lower() in self.WEAK_PASSWORDS:
            errors.append(
                "This password is too common. Please choose a stronger one"
            )

        # Sequential characters check (abc, 123, xyz)
        if self._has_sequential_chars(password):
            errors.append(
                "Password contains sequential characters (e.g., 'abc', '123', 'xyz')"
            )

        # Repeated characters check (aaa, 111)
        if self._has_repeated_chars(password):
            errors.append(
                "Password contains too many repeated characters (e.g., 'aaa', '111')"
            )

        # Calculate strength score
        strength = self._calculate_strength(password, errors)

        return {
            'valid': len(errors) == 0,
            'errors': errors,
            'strength': strength,
        }

    def _has_sequential_chars(self, password: str) -> bool:
        """Detect 4+ sequential ascending or descending characters."""
        lower = password.lower()
        for i in range(len(lower) - 3):
            # Ascending: abc, 123
            if (ord(lower[i]) + 1 == ord(lower[i + 1]) ==
                    ord(lower[i + 2]) - 1 == ord(lower[i + 3]) - 2):
                return True
            # Descending: cba, 321
            if (ord(lower[i]) - 1 == ord(lower[i + 1]) ==
                    ord(lower[i + 2]) + 1 == ord(lower[i + 3]) + 2):
                return True
        return False

    def _has_repeated_chars(self, password: str) -> bool:
        """Detect 3+ consecutive repeated characters."""
        for i in range(len(password) - 2):
            if password[i] == password[i + 1] == password[i + 2]:
                return True
        return False

    @staticmethod
    def _calculate_strength(password: str, errors: List[str]) -> str:
        """
        Calculate password strength based on length and character diversity.
        Returns: 'weak' | 'fair' | 'strong' | 'very_strong'
        """
        if errors:
            return 'weak'

        score = 0
        length = len(password)

        # Length scoring
        if length >= 16:
            score += 3
        elif length >= 14:
            score += 2
        elif length >= 12:
            score += 1

        # Character diversity scoring
        has_upper = bool(re.search(r'[A-Z]', password))
        has_lower = bool(re.search(r'[a-z]', password))
        has_digit = bool(re.search(r'\d', password))
        has_special = any(c in PasswordService.SPECIAL_CHARS for c in password)
        diversity = sum([has_upper, has_lower, has_digit, has_special])
        score += diversity

        # Unique character ratio
        unique_ratio = len(set(password)) / len(password)
        if unique_ratio > 0.8:
            score += 1

        if score >= 7:
            return 'very_strong'
        elif score >= 5:
            return 'strong'
        else:
            return 'fair'

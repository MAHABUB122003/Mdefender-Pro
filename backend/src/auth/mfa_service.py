import secrets
import hashlib
from datetime import datetime, timezone
from typing import Dict, List, Optional, Tuple
from bson import ObjectId
from src.database.mongodb_connection import MongoDB
from src.auth.config import AuthConfig
from src.auth.jwt_service import JWTService
from src.utils.logger import Logger
from src.utils.objectid import to_object_id


class MFAService:
    def __init__(self):
        self.db = MongoDB()
        self.config = AuthConfig()
        self.jwt_service = JWTService()
        self.logger = Logger()

    def generate_secret(self) -> str:
        import pyotp
        return pyotp.random_base32()

    def get_totp_uri(self, secret: str, email: str) -> str:
        import pyotp
        return pyotp.totp.TOTP(secret).provisioning_uri(
            name=email,
            issuer_name=self.config.MFA_ISSUER_NAME
        )

    def generate_qr_code(self, uri: str) -> str:
        try:
            import qrcode
            import io
            import base64
            qr = qrcode.QRCode(version=1, box_size=10, border=5)
            qr.add_data(uri)
            qr.make(fit=True)
            img = qr.make_image(fill_color="black", back_color="white")
            buffer = io.BytesIO()
            img.save(buffer, format='PNG')
            buffer.seek(0)
            return base64.b64encode(buffer.getvalue()).decode('utf-8')
        except ImportError:
            return ''

    def generate_backup_codes(self, count: int = 10) -> List[str]:
        codes = []
        for _ in range(count):
            code = f"{secrets.randbelow(100000):05d}-{secrets.randbelow(100000):05d}"
            codes.append(code)
        return codes

    def hash_backup_code(self, code: str) -> str:
        return hashlib.sha256(code.encode('utf-8')).hexdigest()

    def setup_mfa(self, user_id: str, email: str) -> Dict:
        user_oid = to_object_id(user_id)
        if not user_oid:
            return {'success': False, 'error': 'Invalid user ID'}
        user = self.db.users.find_one({'_id': user_oid})
        if not user:
            return {'success': False, 'error': 'User not found'}

        if user.get('mfa_enabled'):
            return {
                'success': False,
                'error': 'MFA is already enabled. Disable it first.',
            }

        secret = self.generate_secret()
        uri = self.get_totp_uri(secret, email)
        qr_code = self.generate_qr_code(uri)
        backup_codes = self.generate_backup_codes(self.config.MFA_BACKUP_CODES_COUNT)

        self.db.mfa_secrets.update_one(
            {'user_id': user_id},
            {'$set': {
                'user_id': user_id,
                'secret': secret,
                'backup_codes': [self.hash_backup_code(c) for c in backup_codes],
                'created_at': datetime.now(timezone.utc),
                'verified': False,
            }},
            upsert=True
        )

        return {
            'success': True,
            'secret': secret,
            'qr_code': f'data:image/png;base64,{qr_code}' if qr_code else '',
            'qr_code_url': uri,
            'backup_codes': backup_codes,
        }

    def verify_and_enable_mfa(self, user_id: str, code: str) -> Dict:
        mfa_record = self.db.mfa_secrets.find_one({
            'user_id': user_id,
            'verified': False,
        })

        if not mfa_record:
            return {
                'success': False,
                'error': 'MFA setup not initiated. Please start setup again.',
            }

        import pyotp
        totp = pyotp.TOTP(mfa_record['secret'])
        if not totp.verify(code, valid_window=1):
            return {
                'success': False,
                'error': 'Invalid code. Please try again.',
            }

        self.db.mfa_secrets.update_one(
            {'_id': mfa_record['_id']},
            {'$set': {'verified': True, 'enabled_at': datetime.now(timezone.utc)}}
        )

        self.db.users.update_one(
            {'_id': to_object_id(user_id)},
            {'$set': {
                'mfa_enabled': True,
                'mfa_secret': mfa_record['secret'],
                'updated_at': datetime.now(timezone.utc),
            }}
        )

        self.logger.log_info(f"MFA enabled for user: {user_id}")

        return {
            'success': True,
            'message': 'MFA has been enabled successfully.',
        }

    def verify_code(self, user_id: str, code: str) -> bool:
        user_oid = to_object_id(user_id)
        if not user_oid:
            return False
        user = self.db.users.find_one({'_id': user_oid})
        if not user or not user.get('mfa_enabled') or not user.get('mfa_secret'):
            return False

        import pyotp
        totp = pyotp.TOTP(user['mfa_secret'])
        if totp.verify(code, valid_window=1):
            return True

        return self._verify_backup_code(user_id, code)

    def _verify_backup_code(self, user_id: str, code: str) -> bool:
        mfa_record = self.db.mfa_secrets.find_one({'user_id': user_id})
        if not mfa_record:
            return False

        code_hash = self.hash_backup_code(code)
        backup_codes = mfa_record.get('backup_codes', [])

        if code_hash in backup_codes:
            backup_codes.remove(code_hash)
            self.db.mfa_secrets.update_one(
                {'_id': mfa_record['_id']},
                {'$set': {'backup_codes': backup_codes}}
            )
            return True

        return False

    def disable_mfa(self, user_id: str, password: str, code: str) -> Dict:
        user_oid = to_object_id(user_id)
        if not user_oid:
            return {'success': False, 'error': 'Invalid user ID'}
        user = self.db.users.find_one({'_id': user_oid})
        if not user:
            return {'success': False, 'error': 'User not found'}

        if not user.get('mfa_enabled'):
            return {'success': False, 'error': 'MFA is not enabled'}

        from src.services.password_service import PasswordService
        ps = PasswordService()
        if not ps.verify_password(password, user.get('password_hash', '')):
            return {'success': False, 'error': 'Incorrect password'}

        import pyotp
        totp = pyotp.TOTP(user.get('mfa_secret', ''))
        if not totp.verify(code, valid_window=1):
            if not self._verify_backup_code(user_id, code):
                return {'success': False, 'error': 'Invalid MFA code'}

        self.db.users.update_one(
            {'_id': user_oid},
            {'$set': {
                'mfa_enabled': False,
                'mfa_secret': None,
                'updated_at': datetime.now(timezone.utc),
            }}
        )

        self.db.mfa_secrets.delete_one({'user_id': user_id})

        self.logger.log_info(f"MFA disabled for user: {user_id}")

        return {
            'success': True,
            'message': 'MFA has been disabled.',
        }

    def get_mfa_status(self, user_id: str) -> Dict:
        user_oid = to_object_id(user_id)
        if not user_oid:
            return {'enabled': False}
        user = self.db.users.find_one({'_id': user_oid})
        if not user:
            return {'enabled': False}

        return {
            'enabled': user.get('mfa_enabled', False),
        }

    def regenerate_backup_codes(self, user_id: str, password: str) -> Dict:
        user_oid = to_object_id(user_id)
        if not user_oid:
            return {'success': False, 'error': 'Invalid user ID'}
        user = self.db.users.find_one({'_id': user_oid})
        if not user:
            return {'success': False, 'error': 'User not found'}

        if not user.get('mfa_enabled'):
            return {'success': False, 'error': 'MFA is not enabled'}

        from src.services.password_service import PasswordService
        ps = PasswordService()
        if not ps.verify_password(password, user.get('password_hash', '')):
            return {'success': False, 'error': 'Incorrect password'}

        backup_codes = self.generate_backup_codes(self.config.MFA_BACKUP_CODES_COUNT)

        self.db.mfa_secrets.update_one(
            {'user_id': user_id},
            {'$set': {
                'backup_codes': [self.hash_backup_code(c) for c in backup_codes],
            }}
        )

        return {
            'success': True,
            'backup_codes': backup_codes,
        }

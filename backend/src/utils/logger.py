import logging
import os
from datetime import datetime
from src.database.mongodb_connection import MongoDB


class Logger:
    _instance = None
    _initialized = False

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(self):
        if Logger._initialized:
            return
        Logger._initialized = True
        self.db = MongoDB()
        self._setup_file_logger()

    def _setup_file_logger(self):
        log_dir = 'logs'
        if not os.path.exists(log_dir):
            try:
                os.makedirs(log_dir)
            except Exception:
                pass
        self.logger = logging.getLogger('mdefender')
        self.logger.setLevel(logging.INFO)
        if not self.logger.handlers:
            try:
                handler = logging.FileHandler(os.path.join(log_dir, 'mdefender.log'))
                handler.setFormatter(logging.Formatter('%(asctime)s - %(levelname)s - %(message)s'))
                self.logger.addHandler(handler)
            except Exception:
                pass

    def log_attack(self, ip, url, attack_type, status='blocked', confidence=0.0, details=None, user_id=None, domain=None, detection_source=None, website_id=None):
        log_entry = {
            'ip': ip,
            'url': url,
            'attack_type': attack_type,
            'status': status,
            'confidence': confidence,
            'timestamp': datetime.now(),
            'details': details or {},
            'user_id': user_id or '',
            'domain': domain or '',
            'website_id': website_id or '',
            'detection_source': detection_source or 'rule',
        }
        try:
            self.db.attacks.insert_one(log_entry)
            if website_id:
                self.db.waf_events.insert_one(log_entry.copy())
        except Exception:
            pass
        self.logger.warning(f"Attack: {attack_type} | IP: {ip} | URL: {url} | Status: {status}")

    def log_request(self, ip, url, method, status='allowed'):
        log_entry = {
            'ip': ip,
            'url': url,
            'method': method,
            'status': status,
            'timestamp': datetime.now()
        }
        try:
            self.db.requests.insert_one(log_entry)
        except Exception:
            pass
        self.logger.info(f"Request: {method} {url} | IP: {ip} | Status: {status}")

    def log_info(self, message):
        self.logger.info(message)

    def log_error(self, message):
        self.logger.error(message)

    def log_warning(self, message):
        self.logger.warning(message)

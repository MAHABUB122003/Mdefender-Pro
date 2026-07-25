import logging
from datetime import datetime, timedelta

from src.database.mongodb_connection import MongoDB


class DDoSLogger:
    def __init__(self):
        self.logger = logging.getLogger('ddos_protection')
        self.logger.setLevel(logging.INFO)
        if not self.logger.handlers:
            handler = logging.StreamHandler()
            handler.setFormatter(logging.Formatter("%(asctime)s [DDoS] %(levelname)s: %(message)s"))
            self.logger.addHandler(handler)
        try:
            self.db = MongoDB()
            self._db_available = True
        except Exception:
            self._db_available = False

    async def log_blocked(self, ip, path, reason, level, details=None):
        msg = f"BLOCKED {ip} on {path} - {reason} [{level}]"
        if level.upper() == "HIGH":
            self.logger.warning(msg)
        else:
            self.logger.info(msg)
        if self._db_available:
            try:
                await self.db.ddos_blocked.insert_one({
                    "ip": ip,
                    "path": path,
                    "reason": reason,
                    "level": level,
                    "details": details,
                    "timestamp": datetime.utcnow()
                })
            except Exception:
                pass

    async def log_rate_limit(self, ip, limit_type, window, details=None):
        msg = f"RATE LIMITED {ip} - type={limit_type} window={window}"
        self.logger.warning(msg)
        if self._db_available:
            try:
                await self.db.ddos_rate_limits.insert_one({
                    "ip": ip,
                    "limit_type": limit_type,
                    "window": window,
                    "details": details,
                    "timestamp": datetime.utcnow()
                })
            except Exception:
                pass

    async def log_attack(self, ip, attack_type, severity, path, details=None):
        msg = f"ATTACK DETECTED from {ip} - type={attack_type} severity={severity} path={path}"
        self.logger.critical(msg)
        if self._db_available:
            try:
                await self.db.ddos_attacks.insert_one({
                    "ip": ip,
                    "attack_type": attack_type,
                    "severity": severity,
                    "path": path,
                    "details": details,
                    "timestamp": datetime.utcnow()
                })
            except Exception:
                pass

    async def log_reputation_change(self, ip, old_score, new_score, reason):
        msg = f"REPUTATION CHANGE {ip}: {old_score} -> {new_score} ({reason})"
        self.logger.info(msg)
        if self._db_available:
            try:
                await self.db.ddos_reputation_log.insert_one({
                    "ip": ip,
                    "old_score": old_score,
                    "new_score": new_score,
                    "reason": reason,
                    "timestamp": datetime.utcnow()
                })
            except Exception:
                pass

    async def log_challenge(self, ip, challenge_type, result):
        msg = f"CHALLENGE {ip} - type={challenge_type} result={result}"
        if result == "failed":
            self.logger.warning(msg)
        else:
            self.logger.info(msg)
        if self._db_available:
            try:
                await self.db.ddos_challenges.insert_one({
                    "ip": ip,
                    "challenge_type": challenge_type,
                    "result": result,
                    "timestamp": datetime.utcnow()
                })
            except Exception:
                pass

    async def get_blocked_logs(self, limit=100, offset=0) -> list:
        if not self._db_available:
            return []
        try:
            cursor = self.db.ddos_blocked.find().sort("timestamp", -1).skip(offset).limit(limit)
            return await cursor.to_list(length=limit)
        except Exception:
            return []

    async def get_attack_logs(self, limit=100, offset=0) -> list:
        if not self._db_available:
            return []
        try:
            cursor = self.db.ddos_attacks.find().sort("timestamp", -1).skip(offset).limit(limit)
            return await cursor.to_list(length=limit)
        except Exception:
            return []

    async def get_rate_limit_logs(self, limit=100, offset=0) -> list:
        if not self._db_available:
            return []
        try:
            cursor = self.db.ddos_rate_limits.find().sort("timestamp", -1).skip(offset).limit(limit)
            return await cursor.to_list(length=limit)
        except Exception:
            return []

    async def get_stats(self) -> dict:
        if not self._db_available:
            return {
                "blocked_count": 0,
                "attacks_count": 0,
                "rate_limits_count": 0,
                "reputation_changes_count": 0,
                "challenges_count": 0
            }
        try:
            blocked_count = await self.db.ddos_blocked.count_documents({})
            attacks_count = await self.db.ddos_attacks.count_documents({})
            rate_limits_count = await self.db.ddos_rate_limits.count_documents({})
            reputation_count = await self.db.ddos_reputation_log.count_documents({})
            challenges_count = await self.db.ddos_challenges.count_documents({})
            return {
                "blocked_count": blocked_count,
                "attacks_count": attacks_count,
                "rate_limits_count": rate_limits_count,
                "reputation_changes_count": reputation_count,
                "challenges_count": challenges_count
            }
        except Exception:
            return {
                "blocked_count": 0,
                "attacks_count": 0,
                "rate_limits_count": 0,
                "reputation_changes_count": 0,
                "challenges_count": 0
            }

    async def cleanup_old_logs(self, days=30):
        if not self._db_available:
            return
        cutoff = datetime.utcnow() - timedelta(days=days)
        collections = [
            self.db.ddos_blocked,
            self.db.ddos_attacks,
            self.db.ddos_rate_limits,
            self.db.ddos_reputation_log,
            self.db.ddos_challenges
        ]
        for collection in collections:
            try:
                await collection.delete_many({"timestamp": {"$lt": cutoff}})
            except Exception:
                pass

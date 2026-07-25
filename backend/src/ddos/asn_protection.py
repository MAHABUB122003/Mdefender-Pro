from . import redis_service
from . import config


class ASNProtection:

    def __init__(self):
        self.redis = redis_service.RedisService()
        self.config = config.DDoSConfig()

    async def check(self, ip, asn):
        if not self.config.asn.enabled:
            return {'allowed': True, 'reason': '', 'asn': asn}
        asn_str = str(asn or '')
        whitelist = [str(a) for a in self.config.asn.whitelist]
        blacklist = [str(a) for a in self.config.asn.blacklist]
        if whitelist:
            if asn_str not in whitelist:
                return {'allowed': False, 'reason': f'ASN {asn_str} not in whitelist', 'asn': asn_str}
        if blacklist:
            if asn_str in blacklist:
                return {'allowed': False, 'reason': f'ASN {asn_str} is blacklisted', 'asn': asn_str}
        return {'allowed': True, 'reason': '', 'asn': asn_str}

    async def add_to_whitelist(self, asn):
        s = str(asn)
        if s not in [str(a) for a in self.config.asn.whitelist]:
            self.config.asn.whitelist.append(s)
        await self._save()

    async def remove_from_whitelist(self, asn):
        s = str(asn)
        self.config.asn.whitelist = [str(a) for a in self.config.asn.whitelist if str(a) != s]
        await self._save()

    async def add_to_blacklist(self, asn):
        s = str(asn)
        if s not in [str(a) for a in self.config.asn.blacklist]:
            self.config.asn.blacklist.append(s)
        await self._save()

    async def remove_from_blacklist(self, asn):
        s = str(asn)
        self.config.asn.blacklist = [str(a) for a in self.config.asn.blacklist if str(a) != s]
        await self._save()

    async def get_config(self):
        return {
            'enabled': self.config.asn.enabled,
            'whitelist': self.config.asn.whitelist,
            'blacklist': self.config.asn.blacklist,
        }

    async def set_config(self, asn_cfg):
        if 'enabled' in asn_cfg:
            self.config.asn.enabled = asn_cfg['enabled']
        if 'whitelist' in asn_cfg:
            self.config.asn.whitelist = asn_cfg['whitelist']
        if 'blacklist' in asn_cfg:
            self.config.asn.blacklist = asn_cfg['blacklist']
        await self._save()

    async def _save(self):
        try:
            self.config.save()
        except Exception:
            pass

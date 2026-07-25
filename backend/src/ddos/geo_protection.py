import json
from . import redis_service
from . import config


class GeoProtection:

    def __init__(self):
        self.redis = redis_service.RedisService()
        self.config = config.DDoSConfig()

    async def check(self, ip, country_code):
        if not self.config.geo.enabled:
            return {'allowed': True, 'reason': '', 'country': country_code}
        cc = (country_code or '').upper()
        whitelist = self.config.geo.whitelist_countries
        blacklist = self.config.geo.blacklist_countries
        if whitelist:
            allowed = cc in [c.upper() for c in whitelist]
            if not allowed:
                return {'allowed': False, 'reason': f'Country {cc} not in whitelist', 'country': cc}
        if blacklist:
            if cc in [c.upper() for c in blacklist]:
                return {'allowed': False, 'reason': self.config.geo.block_message, 'country': cc}
        return {'allowed': True, 'reason': '', 'country': cc}

    async def add_to_whitelist(self, country_code):
        cc = country_code.upper()
        if cc not in self.config.geo.whitelist_countries:
            self.config.geo.whitelist_countries.append(cc)
        await self._save()

    async def remove_from_whitelist(self, country_code):
        cc = country_code.upper()
        self.config.geo.whitelist_countries = [c for c in self.config.geo.whitelist_countries if c.upper() != cc]
        await self._save()

    async def add_to_blacklist(self, country_code):
        cc = country_code.upper()
        if cc not in self.config.geo.blacklist_countries:
            self.config.geo.blacklist_countries.append(cc)
        await self._save()

    async def remove_from_blacklist(self, country_code):
        cc = country_code.upper()
        self.config.geo.blacklist_countries = [c for c in self.config.geo.blacklist_countries if c.upper() != cc]
        await self._save()

    async def get_config(self):
        return {
            'enabled': self.config.geo.enabled,
            'whitelist_countries': self.config.geo.whitelist_countries,
            'blacklist_countries': self.config.geo.blacklist_countries,
            'block_message': self.config.geo.block_message,
        }

    async def set_config(self, geo_cfg):
        if 'enabled' in geo_cfg:
            self.config.geo.enabled = geo_cfg['enabled']
        if 'whitelist_countries' in geo_cfg:
            self.config.geo.whitelist_countries = geo_cfg['whitelist_countries']
        if 'blacklist_countries' in geo_cfg:
            self.config.geo.blacklist_countries = geo_cfg['blacklist_countries']
        if 'block_message' in geo_cfg:
            self.config.geo.block_message = geo_cfg['block_message']
        await self._save()

    async def _save(self):
        try:
            self.config.save()
        except Exception:
            pass

import asyncio
import time
from typing import Any, Dict, List, Optional, Set, Tuple

try:
    import aioredis
    AIORedis = aioredis.Redis
except ImportError:
    AIORedis = None


class InMemoryStorage:
    def __init__(self) -> None:
        self._store: Dict[str, Any] = {}
        self._ttl: Dict[str, float] = {}
        self._sorted_sets: Dict[str, Dict[str, float]] = {}
        self._lock = asyncio.Lock()
        self._expires: Dict[str, float] = {}

    def _is_expired(self, key: str) -> bool:
        if key in self._expires:
            if time.time() > self._expires[key]:
                del self._store[key]
                del self._expires[key]
                return True
        return False

    async def increment(self, key: str, ttl: Optional[int] = None) -> int:
        async with self._lock:
            self._is_expired(key)
            if key not in self._store:
                self._store[key] = 0
            self._store[key] += 1
            if ttl:
                self._expires[key] = time.time() + ttl
            return self._store[key]

    async def get(self, key: str) -> Optional[Any]:
        async with self._lock:
            self._is_expired(key)
            return self._store.get(key)

    async def set(self, key: str, value: Any, ttl: Optional[int] = None) -> None:
        async with self._lock:
            self._store[key] = value
            if ttl:
                self._expires[key] = time.time() + ttl
            elif key in self._expires:
                del self._expires[key]

    async def delete(self, key: str) -> None:
        async with self._lock:
            self._store.pop(key, None)
            self._expires.pop(key, None)
            self._sorted_sets.pop(key, None)

    async def zadd(self, key: str, score: float, member: str) -> None:
        async with self._lock:
            if key not in self._sorted_sets:
                self._sorted_sets[key] = {}
            self._sorted_sets[key][member] = score

    async def zrangebyscore(
        self, key: str, min_score: float, max_score: float
    ) -> List[str]:
        async with self._lock:
            if key not in self._sorted_sets:
                return []
            return [
                member
                for member, score in self._sorted_sets[key].items()
                if min_score <= score <= max_score
            ]

    async def zrem(self, key: str, member: str) -> None:
        async with self._lock:
            if key in self._sorted_sets:
                self._sorted_sets[key].pop(member, None)

    async def zcount(
        self, key: str, min_score: float, max_score: float
    ) -> int:
        async with self._lock:
            if key not in self._sorted_sets:
                return 0
            return sum(
                1
                for score in self._sorted_sets[key].values()
                if min_score <= score <= max_score
            )

    async def hset(self, key: str, mapping: Dict[str, Any]) -> None:
        async with self._lock:
            if key not in self._store:
                self._store[key] = {}
            self._store[key].update(mapping)

    async def hgetall(self, key: str) -> Dict[str, Any]:
        async with self._lock:
            self._is_expired(key)
            return self._store.get(key, {})

    async def keys(self, pattern: str = "*") -> List[str]:
        async with self._lock:
            import fnmatch
            return [k for k in self._store if fnmatch.fnmatch(k, pattern)]


class RedisService:
    def __init__(
        self, redis_url: str = "redis://localhost:6379", **kwargs: Any
    ) -> None:
        self._redis_url = redis_url
        self._redis: Optional[AIORedis] = None
        self._memory = InMemoryStorage()
        self._connected = False
        self._lock = asyncio.Lock()
        self._kwargs = kwargs

    @property
    def is_connected(self) -> bool:
        return self._connected

    async def connect(self) -> None:
        if AIORedis is None:
            return
        try:
            self._redis = aioredis.from_url(
                self._redis_url,
                decode_responses=True,
                **self._kwargs,
            )
            await self._redis.ping()
            self._connected = True
        except Exception:
            self._connected = False
            self._redis = None

    async def disconnect(self) -> None:
        if self._redis:
            try:
                await self._redis.close()
            except Exception:
                pass
        self._connected = False
        self._redis = None

    async def increment_counter(
        self, key: str, ttl: Optional[int] = None
    ) -> int:
        if not self._connected:
            return await self._memory.increment(key, ttl)
        try:
            async with self._lock:
                val = await self._redis.incr(key)
                if ttl:
                    await self._redis.expire(key, ttl)
                return val
        except Exception:
            self._connected = False
            return await self._memory.increment(key, ttl)

    async def get_counter(self, key: str) -> int:
        if not self._connected:
            val = await self._memory.get(key)
            return int(val) if val is not None else 0
        try:
            val = await self._redis.get(key)
            return int(val) if val is not None else 0
        except Exception:
            self._connected = False
            val = await self._memory.get(key)
            return int(val) if val is not None else 0

    async def set_with_ttl(
        self, key: str, value: Any, ttl: Optional[int] = None
    ) -> None:
        if not self._connected:
            await self._memory.set(key, value, ttl)
            return
        try:
            if ttl:
                await self._redis.setex(key, ttl, value)
            else:
                await self._redis.set(key, value)
        except Exception:
            self._connected = False
            await self._memory.set(key, value, ttl)

    async def get_value(self, key: str) -> Optional[Any]:
        if not self._connected:
            return await self._memory.get(key)
        try:
            return await self._redis.get(key)
        except Exception:
            self._connected = False
            return await self._memory.get(key)

    async def delete_key(self, key: str) -> None:
        if not self._connected:
            await self._memory.delete(key)
            return
        try:
            await self._redis.delete(key)
        except Exception:
            self._connected = False
            await self._memory.delete(key)

    async def add_to_sorted_set(
        self, key: str, score: float, member: str
    ) -> None:
        if not self._connected:
            await self._memory.zadd(key, score, member)
            return
        try:
            await self._redis.zadd(key, {member: score})
        except Exception:
            self._connected = False
            await self._memory.zadd(key, score, member)

    async def get_sorted_set_range(
        self, key: str, min_score: float, max_score: float
    ) -> List[str]:
        if not self._connected:
            return await self._memory.zrangebyscore(key, min_score, max_score)
        try:
            result = await self._redis.zrangebyscore(key, min_score, max_score)
            return [str(r) for r in result]
        except Exception:
            self._connected = False
            return await self._memory.zrangebyscore(key, min_score, max_score)

    async def remove_from_sorted_set(
        self, key: str, member: str
    ) -> None:
        if not self._connected:
            await self._memory.zrem(key, member)
            return
        try:
            await self._redis.zrem(key, member)
        except Exception:
            self._connected = False
            await self._memory.zrem(key, member)

    async def get_sorted_set_count(
        self, key: str, min_score: float, max_score: float
    ) -> int:
        if not self._connected:
            return await self._memory.zcount(key, min_score, max_score)
        try:
            return await self._redis.zcount(key, min_score, max_score)
        except Exception:
            self._connected = False
            return await self._memory.zcount(key, min_score, max_score)

    async def set_hash(
        self, key: str, mapping: Dict[str, Any]
    ) -> None:
        if not self._connected:
            await self._memory.hset(key, mapping)
            return
        try:
            await self._redis.hset(key, mapping=mapping)
        except Exception:
            self._connected = False
            await self._memory.hset(key, mapping)

    async def get_hash(self, key: str) -> Dict[str, Any]:
        if not self._connected:
            return await self._memory.hgetall(key)
        try:
            result = await self._redis.hgetall(key)
            return {k: v for k, v in result.items()}
        except Exception:
            self._connected = False
            return await self._memory.hgetall(key)

    async def pipeline_execute(
        self, operations: List[Tuple[str, ...]]
    ) -> List[Any]:
        if not self._connected:
            results = []
            for op in operations:
                method = op[0]
                args = op[1:]
                if method == "increment_counter":
                    results.append(await self.increment_counter(*args))
                elif method == "get_counter":
                    results.append(await self.get_counter(*args))
                elif method == "set_with_ttl":
                    await self.set_with_ttl(*args)
                    results.append(None)
                elif method == "get_value":
                    results.append(await self.get_value(*args))
                elif method == "delete_key":
                    await self.delete_key(*args)
                    results.append(None)
                else:
                    results.append(None)
            return results
        try:
            pipe = self._redis.pipeline(transaction=False)
            for op in operations:
                method = op[0]
                args = op[1:]
                if method == "increment_counter":
                    pipe.incr(args[0])
                elif method == "get_counter":
                    pipe.get(args[0])
                elif method == "set_with_ttl":
                    if len(args) > 2 and args[2] is not None:
                        pipe.setex(args[0], args[2], args[1])
                    else:
                        pipe.set(args[0], args[1])
                elif method == "get_value":
                    pipe.get(args[0])
                elif method == "delete_key":
                    pipe.delete(args[0])
            results = await pipe.execute()
            return results
        except Exception:
            self._connected = False
            return await self.pipeline_execute(operations)

    async def get_keys(self, pattern: str = "*") -> List[str]:
        if not self._connected:
            return await self._memory.keys(pattern)
        try:
            keys = []
            async for key in self._redis.scan_iter(match=pattern):
                keys.append(str(key))
            return keys
        except Exception:
            self._connected = False
            return await self._memory.keys(pattern)

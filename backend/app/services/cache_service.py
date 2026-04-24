import logging
import hashlib
import json
from typing import Optional, Any
import redis.asyncio as redis
import os

logger = logging.getLogger(__name__)


def get_redis_url() -> str:
    """Get Redis URL from environment."""
    return os.getenv("REDIS_URL", "redis://localhost:6379")


class CacheService:
    """Redis-based caching for LLM responses with in-memory fallback."""

    def __init__(self):
        self.client: Optional[redis.Redis] = None
        self._memory_cache: dict = {}  # Fallback when Redis unavailable

    async def connect(self):
        """Initialize Redis connection."""
        try:
            redis_url = get_redis_url()
            if redis_url:
                self.client = redis.from_url(redis_url)
                await self.client.ping()
                logger.info("Redis cache connected")
        except Exception as e:
            logger.warning(f"Redis unavailable, using in-memory cache: {e}")
            self.client = None

    def _hash_key(self, data: Any) -> str:
        """Generate cache key from data."""
        serialized = json.dumps(data, sort_keys=True)
        return hashlib.sha256(serialized.encode()).hexdigest()[:64]

    async def get(self, key: str) -> Optional[str]:
        """Get cached value."""
        if self.client:
            try:
                value = await self.client.get(f"ai:{key}")
                if value:
                    return value.decode() if isinstance(value, bytes) else value
            except Exception as e:
                logger.warning(f"Cache get error: {e}")

        # Fallback to memory
        return self._memory_cache.get(f"ai:{key}")

    async def set(self, key: str, value: str, ttl_seconds: int = 3600):
        """Set cached value with TTL."""
        cache_key = f"ai:{key}"

        if self.client:
            try:
                await self.client.setex(cache_key, ttl_seconds, value)
                return
            except Exception as e:
                logger.warning(f"Cache set error: {e}")

        # Fallback to memory
        self._memory_cache[cache_key] = value

    async def invalidate(self, pattern: str = ""):
        """Invalidate cache entries matching pattern."""
        if self.client:
            try:
                if pattern:
                    keys = []
                    async for key in self.client.scan_iter(f"ai:{pattern}*"):
                        keys.append(key)
                    if keys:
                        await self.client.delete(*keys)
                else:
                    # Clear all ai:* keys
                    keys = []
                    async for key in self.client.scan_iter("ai:*"):
                        keys.append(key)
                    if keys:
                        await self.client.delete(*keys)
            except Exception as e:
                logger.warning(f"Cache invalidate error: {e}")

        # Fallback - clear memory
        if pattern:
            self._memory_cache = {
                k: v
                for k, v in self._memory_cache.items()
                if not k.startswith(f"ai:{pattern}")
            }
        else:
            self._memory_cache = {}

    async def close(self):
        """Close Redis connection."""
        if self.client:
            await self.client.close()
            self.client = None


cache_service = CacheService()

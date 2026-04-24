import logging
from typing import Optional
import redis.asyncio as redis
import os
from fastapi import HTTPException

logger = logging.getLogger(__name__)


def get_redis_url() -> str:
    """Get Redis URL from environment."""
    return os.getenv("REDIS_URL", "redis://localhost:6379")


class RateLimiter:
    """Redis-based rate limiter with sliding window and in-memory fallback."""

    def __init__(self):
        self.client: Optional[redis.Redis] = None
        self._memory: dict = {}  # Fallback when Redis unavailable

    async def connect(self):
        """Initialize Redis connection."""
        try:
            redis_url = get_redis_url()
            if redis_url:
                self.client = redis.from_url(redis_url)
                await self.client.ping()
                logger.info("Rate limiter Redis connected")
        except Exception as e:
            logger.warning(f"Rate limiter Redis unavailable: {e}")
            self.client = None

    async def check_limit(
        self,
        user_id: str,
        limit: int = 100,
        window_seconds: int = 86400,
    ) -> bool:
        """
        Check if user is within rate limit.
        Returns True if allowed, raises HTTPException if exceeded.
        """
        key = f"ratelimit:{user_id}"

        if self.client:
            try:
                count = await self.client.get(key)
                if count and int(count) >= limit:
                    raise HTTPException(
                        status_code=429,
                        detail=f"Rate limit exceeded. Limit: {limit}/day",
                    )

                pipe = self.client.pipeline()
                pipe.incr(key)
                pipe.expire(key, window_seconds)
                await pipe.execute()
                return True
            except HTTPException:
                raise
            except Exception as e:
                logger.warning(f"Rate limiter error: {e}")

        # Fallback to in-memory
        current = self._memory.get(key, 0)
        if current >= limit:
            raise HTTPException(
                status_code=429, detail=f"Rate limit exceeded. Limit: {limit}/day"
            )
        self._memory[key] = current + 1
        return True

    async def reset(self, user_id: str):
        """Reset rate limit for user."""
        key = f"ratelimit:{user_id}"

        if self.client:
            try:
                await self.client.delete(key)
            except Exception as e:
                logger.warning(f"Rate limiter reset error: {e}")

        self._memory.pop(key, None)

    async def get_usage(self, user_id: str) -> int:
        """Get current usage count for user."""
        key = f"ratelimit:{user_id}"

        if self.client:
            try:
                count = await self.client.get(key)
                return int(count) if count else 0
            except Exception as e:
                logger.warning(f"Rate limiter get_usage error: {e}")

        return self._memory.get(key, 0)

    async def close(self):
        """Close Redis connection."""
        if self.client:
            await self.client.close()
            self.client = None


rate_limiter = RateLimiter()

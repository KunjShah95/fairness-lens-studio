import redis
import os
import time
import logging
from typing import Optional

logger = logging.getLogger(__name__)

class RateLimiter:
    """
    Redis-based rate limiter for AI queries.
    """
    def __init__(self, redis_url: str = None):
        self.redis_url = redis_url or os.getenv("REDIS_URL", "redis://localhost:6379/0")
        try:
            self.redis = redis.from_url(self.redis_url)
            self.redis.ping()
            logger.info("RateLimiter connected to Redis")
        except Exception as e:
            logger.warning(f"RateLimiter Redis connection failed: {e}. Rate limiting will be disabled.")
            self.redis = None

    def is_allowed(self, user_id: str, limit: int = 100, period: int = 86400) -> bool:
        """
        Checks if the user has exceeded their quota (default 100 msg/day).
        """
        if not self.redis:
            return True

        key = f"rate_limit:ai:{user_id}"
        try:
            current = self.redis.get(key)
            if current and int(current) >= limit:
                return False
            
            pipe = self.redis.pipeline()
            pipe.incr(key)
            if not current:
                pipe.expire(key, period)
            pipe.execute()
            return True
        except Exception as e:
            logger.error(f"Rate Limiter Error: {e}")
            return True

rate_limiter = RateLimiter()

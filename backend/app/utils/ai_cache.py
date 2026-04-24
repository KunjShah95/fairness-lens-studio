import redis
import os
import hashlib
import json
import logging
from typing import Optional, Any

logger = logging.getLogger(__name__)

class AICache:
    """
    Caches LLM responses by hash of the query and context.
    """
    def __init__(self, redis_url: str = None):
        self.redis_url = redis_url or os.getenv("REDIS_URL", "redis://localhost:6379/0")
        try:
            self.redis = redis.from_url(self.redis_url)
            logger.info("AICache connected to Redis")
        except Exception:
            self.redis = None

    def _generate_key(self, query: str, context: Any) -> str:
        data = f"{query}:{json.dumps(context, sort_keys=True)}"
        return f"ai_cache:{hashlib.md5(data.encode()).hexdigest()}"

    def get(self, query: str, context: Any) -> Optional[str]:
        if not self.redis:
            return None
        key = self._generate_key(query, context)
        try:
            val = self.redis.get(key)
            return val.decode() if val else None
        except Exception:
            return None

    def set(self, query: str, context: Any, response: str, ttl: int = 3600):
        if not self.redis:
            return
        key = self._generate_key(query, context)
        try:
            self.redis.setex(key, ttl, response)
        except Exception:
            pass

ai_cache = AICache()

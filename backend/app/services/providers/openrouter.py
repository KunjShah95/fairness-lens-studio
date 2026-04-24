import logging
from typing import List, Dict, Any
import os

logger = logging.getLogger(__name__)


class OpenRouterAdapter:
    BASE_URL = "https://openrouter.ai/api/v1"

    def __init__(self):
        self.api_key = os.getenv("OPENROUTER_API_KEY", "")
        self.client = None
        self._init_client()

    def _init_client(self):
        if not self.api_key:
            logger.warning("OpenRouter API key not set")
            return
        try:
            import httpx

            self.client = httpx.AsyncClient(
                base_url=self.BASE_URL,
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json",
                },
                timeout=60.0,
            )
        except Exception as e:
            logger.warning(f"OpenRouter client init failed: {e}")

    async def chat_completion(
        self, messages: List[Dict], model: str = "openai/gpt-4o", **kwargs
    ) -> str:
        if not self.client:
            raise RuntimeError("OpenRouter not configured")
        response = await self.client.post(
            "/chat/completions", json={"model": model, "messages": messages, **kwargs}
        )
        response.raise_for_status()
        return response.json()["choices"][0]["message"]["content"]

    def is_available(self) -> bool:
        return bool(self.api_key and self.client)


openrouter_adapter = OpenRouterAdapter()

import logging
from typing import List, Dict, Any
import os

logger = logging.getLogger(__name__)


class AnthropicAdapter:
    def __init__(self):
        self.api_key = os.getenv("ANTHROPIC_API_KEY", "")
        self.client = None
        self._init_client()

    def _init_client(self):
        if not self.api_key:
            logger.warning("Anthropic API key not set")
            return
        try:
            from anthropic import AsyncAnthropic

            self.client = AsyncAnthropic(api_key=self.api_key)
        except ImportError:
            logger.warning("anthropic not installed")
        except Exception as e:
            logger.warning(f"Anthropic init failed: {e}")

    async def chat_completion(
        self,
        messages: List[Dict],
        model: str = "claude-3-sonnet-20240229",
        max_tokens: int = 1024,
        **kwargs,
    ) -> str:
        if not self.client:
            raise RuntimeError("Anthropic not configured")
        system = ""
        claude_messages = []
        for msg in messages:
            if msg["role"] == "system":
                system = msg["content"]
            else:
                claude_messages.append(msg)
        response = await self.client.messages.create(
            model=model,
            max_tokens=max_tokens,
            system=system,
            messages=claude_messages,
            **kwargs,
        )
        return response.content[0].text

    def is_available(self) -> bool:
        return bool(self.api_key and self.client)


anthropic_adapter = AnthropicAdapter()

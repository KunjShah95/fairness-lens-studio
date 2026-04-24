import logging
from typing import List, Dict, Any, AsyncIterator
from openai import AsyncOpenAI
import os

logger = logging.getLogger(__name__)


def get_settings():
    """Get settings from config - import dynamically."""
    try:
        from app.config import settings

        return settings
    except ImportError:

        class DummySettings:
            openai_api_key = os.getenv("OPENAI_API_KEY", "")
            openai_model = os.getenv("OPENAI_MODEL", "gpt-4o")

        return DummySettings()


class OpenAIAdapter:
    """Adapter for OpenAI API with streaming support."""

    def __init__(self):
        self.client = None
        self.model = "gpt-4o"
        settings = get_settings()
        api_key = getattr(settings, "openai_api_key", None) or os.getenv(
            "OPENAI_API_KEY", ""
        )
        if api_key:
            self.client = AsyncOpenAI(api_key=api_key)
            self.model = getattr(settings, "openai_model", None) or os.getenv(
                "OPENAI_MODEL", "gpt-4o"
            )
            logger.info(f"OpenAI adapter initialized with model: {self.model}")
        else:
            logger.warning("OpenAI API key not configured - adapter will use fallback")

    async def chat_completion(
        self,
        messages: List[Dict[str, Any]],
        temperature: float = 0.7,
        max_tokens: int = 1000,
    ) -> str:
        """Get a chat completion response."""
        if not self.client:
            raise RuntimeError("OpenAI not configured")

        response = await self.client.chat.completions.create(
            model=self.model,
            messages=messages,  # type: ignore
            temperature=temperature,
            max_tokens=max_tokens,
        )
        content = response.choices[0].message.content
        return content if content else ""

    async def chat_completion_stream(
        self,
        messages: List[Dict[str, Any]],
        temperature: float = 0.7,
    ) -> AsyncIterator[str]:
        """Get a streaming chat completion response."""
        if not self.client:
            raise RuntimeError("OpenAI not configured")

        stream = await self.client.chat.completions.create(
            model=self.model,
            messages=messages,  # type: ignore
            temperature=temperature,
            stream=True,
        )

        async for chunk in stream:
            if chunk.choices and chunk.choices[0].delta.content:
                yield chunk.choices[0].delta.content

    async def close(self):
        """Close the client connection."""
        if self.client:
            await self.client.close()

    def is_available(self) -> bool:
        """Check if OpenAI is configured."""
        return self.client is not None


openai_adapter = OpenAIAdapter()

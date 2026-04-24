import os
from typing import List, Dict, Any, AsyncGenerator
from openai import AsyncOpenAI
import logging

logger = logging.getLogger(__name__)

class OpenAIAdapter:
    """
    Wrapper for OpenAI API, specifically GPT-4o for fairness analysis.
    """
    def __init__(self, api_key: str = None):
        self.api_key = api_key or os.getenv("OPENAI_API_KEY")
        if not self.api_key:
            logger.warning("OPENAI_API_KEY not found. OpenAIAdapter will be unavailable.")
            self.client = None
        else:
            self.client = AsyncOpenAI(api_key=self.api_key)

    async def get_streaming_chat_response(
        self, 
        messages: List[Dict[str, str]], 
        model: str = "gpt-4o"
    ) -> AsyncGenerator[str, None]:
        """
        Yields chunks of the chat response.
        """
        if not self.client:
            yield "Error: OpenAI client not configured. Falling back to local engine..."
            return

        try:
            stream = await self.client.chat.completions.create(
                model=model,
                messages=messages,
                stream=True,
            )
            async for chunk in stream:
                if chunk.choices[0].delta.content is not None:
                    yield chunk.choices[0].delta.content
        except Exception as e:
            logger.error(f"OpenAI Streaming Error: {e}")
            yield f"Error: {str(e)}"

    async def get_chat_response(
        self, 
        messages: List[Dict[str, str]], 
        model: str = "gpt-4o"
    ) -> str:
        """
        Returns a single complete chat response.
        """
        if not self.client:
            return "Error: OpenAI client not configured."

        try:
            response = await self.client.chat.completions.create(
                model=model,
                messages=messages,
            )
            return response.choices[0].message.content
        except Exception as e:
            logger.error(f"OpenAI Response Error: {e}")
            return f"Error: {str(e)}"

openai_adapter = OpenAIAdapter()

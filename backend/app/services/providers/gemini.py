import logging
from typing import List, Dict, Any
import os

logger = logging.getLogger(__name__)


class GeminiAdapter:
    def __init__(self):
        self.api_key = os.getenv("GEMINI_API_KEY", "")
        self.client = None
        self._init_client()

    def _init_client(self):
        if not self.api_key:
            logger.warning("Gemini API key not set")
            return
        try:
            import google.genai as genai

            genai.configure(api_key=self.api_key)
            self.client = genai
        except ImportError:
            logger.warning("google-genai not installed")
        except Exception as e:
            logger.warning(f"Gemini init failed: {e}")

    async def chat_completion(
        self, messages: List[Dict], model: str = "gemini-1.5-pro", **kwargs
    ) -> str:
        if not self.client:
            raise RuntimeError("Gemini not configured")
        contents = [msg["content"] for msg in messages if msg["role"] != "system"]
        response = self.client.models.generate_content(model=model, contents=contents)
        return response.text

    async def vision_analyze(
        self, image_bytes: bytes, prompt: str, model: str = "gemini-1.5-pro"
    ) -> str:
        if not self.client:
            raise RuntimeError("Gemini not configured")
        import google.genai as genai

        image = genai.Image(image_bytes)
        response = self.client.models.generate_content(
            model=model, contents=[image, prompt]
        )
        return response.text

    def is_available(self) -> bool:
        return bool(self.api_key and self.client)


gemini_adapter = GeminiAdapter()

import logging
from typing import List, Dict, Any
from app.services.model_registry import model_registry

logger = logging.getLogger(__name__)


class UnifiedAIGateway:
    PROVIDER_MAP = {
        "openai": None,
        "openrouter": None,
        "google": None,
        "anthropic": None,
    }

    def __init__(self):
        self.registry = model_registry
        self._load_adapters()

    def _load_adapters(self):
        try:
            from app.services.openai_adapter import openai_adapter

            self.PROVIDER_MAP["openai"] = openai_adapter
        except:
            pass
        try:
            from app.services.providers.openrouter import openrouter_adapter

            self.PROVIDER_MAP["openrouter"] = openrouter_adapter
        except:
            pass
        try:
            from app.services.providers.gemini import gemini_adapter

            self.PROVIDER_MAP["google"] = gemini_adapter
        except:
            pass
        try:
            from app.services.providers.anthropic import anthropic_adapter

            self.PROVIDER_MAP["anthropic"] = anthropic_adapter
        except:
            pass

    async def chat(
        self,
        messages: List[Dict],
        model: str = "gpt-4o",
        provider: str = "auto",
        **kwargs,
    ) -> str:
        if provider == "auto":
            provider = self.registry.get_provider(model) or "openai"

        adapter = self.PROVIDER_MAP.get(provider)

        if adapter and hasattr(adapter, "is_available") and adapter.is_available():
            try:
                return await adapter.chat_completion(messages, model, **kwargs)
            except Exception as e:
                logger.warning(f"{provider} failed: {e}")

        for prov, adap in self.PROVIDER_MAP.items():
            if adap and hasattr(adap, "is_available") and adap.is_available():
                try:
                    return await adap.chat_completion(messages, model, **kwargs)
                except:
                    continue

        raise RuntimeError("No AI provider available")

    def get_available_models(self) -> list:
        available = []
        for prov, adap in self.PROVIDER_MAP.items():
            if adap and hasattr(adap, "is_available") and adap.is_available():
                available.append(prov)
        return available


unified_gateway = UnifiedAIGateway()

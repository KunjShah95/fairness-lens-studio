import yaml
import os
from typing import Dict, Any, List, Optional


class ModelRegistry:
    """Manages model configurations and provider mappings."""

    MODELS_YAML = """
models:
  gpt-4o:
    provider: openai
    cost_per_1k: 0.01
    capabilities: [text]
    context_window: 128000
  
  gpt-4v:
    provider: openai
    cost_per_1k: 0.02
    capabilities: [text, vision]
  
  claude-3-opus:
    provider: anthropic
    cost_per_1k: 0.015
    capabilities: [text, vision]
  
  claude-3-sonnet:
    provider: anthropic
    cost_per_1k: 0.003
    capabilities: [text, vision]
  
  gemini-pro-vision:
    provider: google
    cost_per_1k: 0.002
    capabilities: [text, vision]
  
  gemini-1.5-pro:
    provider: google
    cost_per_1k: 0.001
    capabilities: [text, vision]
  
  llama-3-70b:
    provider: openrouter
    cost_per_1k: 0.0008
    capabilities: [text]
  
  mixtral-8x7b:
    provider: openrouter
    cost_per_1k: 0.0005
    capabilities: [text]
  
  mistral-7b:
    provider: openrouter
    cost_per_1k: 0.0002
    capabilities: [text]
"""

    def __init__(self):
        self.models: Dict[str, Any] = {}
        self._load_models()

    def _load_models(self):
        try:
            self.models = yaml.safe_load(self.MODELS_YAML).get("models", {})
        except:
            self.models = {}

    def get_model_config(self, model_id: str) -> Optional[Dict]:
        return self.models.get(model_id)

    def get_provider(self, model_id: str) -> Optional[str]:
        config = self.get_model_config(model_id)
        return config.get("provider") if config else None

    def get_capabilities(self, model_id: str) -> List[str]:
        config = self.get_model_config(model_id)
        return config.get("capabilities", []) if config else []

    def supports_vision(self, model_id: str) -> bool:
        return "vision" in self.get_capabilities(model_id)


model_registry = ModelRegistry()

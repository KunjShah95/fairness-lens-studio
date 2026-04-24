# Multi-Model Hub Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create unified AI gateway supporting OpenRouter, OpenAI, Gemini, Anthropic, HuggingFace with text and image capabilities.

**Architecture:** Unified gateway with provider adapters, model registry, automatic fallback.

**Tech Stack:** Python FastAPI, openai, anthropic, google-genai, huggingface-hub

---

## File Structure

```
backend/
├── app/
│   ├── services/
│   │   ├── unified_gateway.py     (NEW - main gateway)
│   │   ├── model_registry.py   (NEW - model config)
│   │   └── providers/
│   │       ├── openrouter.py  (NEW)
│   │       ├── anthropic.py   (NEW)
│   │       ├── huggingface.py (NEW)
│   │       └── gemini.py     (NEW)
│   └── config.py              (MODIFY)
```

---

### Task 1: Model Registry

**Files:**
- Create: `backend/app/services/model_registry.py`
- Test: No test yet

- [ ] **Step 1: Create model registry**

```python
# backend/app/services/model_registry.py
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
        """Load model configurations."""
        try:
            import yaml
            self.models = yaml.safe_load(self.MODELS_YAML).get('models', {})
        except:
            self.models = {}
    
    def get_model_config(self, model_id: str) -> Optional[Dict]:
        """Get config for a model."""
        return self.models.get(model_id)
    
    def get_provider(self, model_id: str) -> Optional[str]:
        """Get provider for model."""
        config = self.get_model_config(model_id)
        return config.get('provider') if config else None
    
    def get_capabilities(self, model_id: str) -> List[str]:
        """Get model capabilities."""
        config = self.get_model_config(model_id)
        return config.get('capabilities', []) if config else []
    
    def supports_vision(self, model_id: str) -> bool:
        """Check if model supports vision."""
        return 'vision' in self.get_capabilities(model_id)


model_registry = ModelRegistry()
```

- [ ] **Step 2: Verify it loads**

Run: `python -c "from app.services.model_registry import model_registry; print(model_registry.get_provider('gpt-4o'))"`

- [ ] **Step 3: Commit**

```bash
git add backend/app/services/model_registry.py
git commit -m "feat: add model registry"
```

---

### Task 2: OpenRouter Adapter

**Files:**
- Create: `backend/app/services/providers/openrouter.py`
- Test: No test

- [ ] **Step 1: Create OpenRouter adapter**

```python
# backend/app/services/providers/openrouter.py
import logging
from typing import List, Dict, Any, Optional
import os

logger = logging.getLogger(__name__)

class OpenRouterAdapter:
    """Adapter for OpenRouter API (70+ models)."""
    
    BASE_URL = "https://openrouter.ai/api/v1"
    
    def __init__(self):
        self.api_key = os.getenv("OPENROUTER_API_KEY", "")
        self.client = None
        self._init_client()
    
    def _init_client(self):
        """Initialize HTTP client."""
        if not self.api_key:
            logger.warning("OpenRouter API key not set")
            return
        
        try:
            import httpx
            self.client = httpx.AsyncClient(
                base_url=self.BASE_URL,
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json"
                },
                timeout=60.0
            )
        except Exception as e:
            logger.warning(f"OpenRouter client init failed: {e}")
    
    async def chat_completion(
        self,
        messages: List[Dict[str, str]],
        model: str = "openai/gpt-4o",
        **kwargs
    ) -> str:
        """Get chat completion."""
        if not self.client:
            raise RuntimeError("OpenRouter not configured")
        
        response = await self.client.post(
            "/chat/completions",
            json={
                "model": model,
                "messages": messages,
                **kwargs
            }
        )
        response.raise_for_status()
        data = response.json()
        return data["choices"][0]["message"]["content"]
    
    async def chat_completion_stream(
        self,
        messages: List[Dict[str, str]],
        model: str = "openai/gpt-4o",
        **kwargs
    ):
        """Streaming completion."""
        if not self.client:
            raise RuntimeError("OpenRouter not configured")
        
        async with self.client.stream(
            "POST",
            "/chat/completions",
            json={
                "model": model,
                "messages": messages,
                "stream": True,
                **kwargs
            }
        ) as response:
            async for line in response.aiter_lines():
                if line.startswith("data: "):
                    yield line[6:]
    
    async def close(self):
        """Close client."""
        if self.client:
            await self.client.aclose()
    
    def is_available(self) -> bool:
        """Check if OpenRouter is configured."""
        return bool(self.api_key and self.client)


openrouter_adapter = OpenRouterAdapter()
```

- [ ] **Step 2: Add pyyaml dependency**

Run: `pip install pyyaml httpx`

- [ ] **Step 3: Commit**

```bash
git add backend/app/services/providers/openrouter.py
git commit -m "feat: add OpenRouter adapter"
```

---

### Task 3: Gemini Adapter

**Files:**
- Create: `backend/app/services/providers/gemini.py`

- [ ] **Step 1: Create Gemini adapter**

```python
# backend/app/services/providers/gemini.py
import logging
from typing import List, Dict, Any, Optional
import os

logger = logging.getLogger(__name__)

class GeminiAdapter:
    """Adapter for Google Gemini API."""
    
    def __init__(self):
        self.api_key = os.getenv("GEMINI_API_KEY", "")
        self.client = None
        self._init_client()
    
    def _init_client(self):
        """Initialize Gemini client."""
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
            logger.warning(f"Gemini client init failed: {e}")
    
    async def chat_completion(
        self,
        messages: List[Dict[str, str]],
        model: str = "gemini-1.5-pro",
        **kwargs
    ) -> str:
        """Get chat completion."""
        if not self.client:
            raise RuntimeError("Gemini not configured")
        
        # Convert messages to Gemini format
        contents = []
        for msg in messages:
            if msg["role"] == "system":
                continue
            contents.append(msg["content"])
        
        response = self.client.models.generate_content(
            model=model,
            contents=contents
        )
        return response.text
    
    async def vision_analyze(
        self,
        image_bytes: bytes,
        prompt: str,
        model: str = "gemini-1.5-pro"
    ) -> str:
        """Analyze image."""
        if not self.client:
            raise RuntimeError("Gemini not configured")
        
        import google.genai as genai
        image = genai.Image(image_bytes)
        response = self.client.models.generate_content(
            model=model,
            contents=[image, prompt]
        )
        return response.text
    
    def is_available(self) -> bool:
        """Check if Gemini is configured."""
        return bool(self.api_key and self.client)


gemini_adapter = GeminiAdapter()
```

- [ ] **Step 2: Commit**

```bash
git add backend/app/services/providers/gemini.py
git commit -m "feat: add Gemini adapter"
```

---

### Task 4: Anthropic Adapter

**Files:**
- Create: `backend/app/services/providers/anthropic.py`

- [ ] **Step 1: Create Anthropic adapter**

```python
# backend/app/services/providers/anthropic.py
import logging
from typing import List, Dict, Any, Optional, AsyncIterator
import os

logger = logging.getLogger(__name__)

class AnthropicAdapter:
    """Adapter for Anthropic Claude API."""
    
    def __init__(self):
        self.api_key = os.getenv("ANTHROPIC_API_KEY", "")
        self.client = None
        self._init_client()
    
    def _init_client(self):
        """Initialize Anthropic client."""
        if not self.api_key:
            logger.warning("Anthropic API key not set")
            return
        
        try:
            from anthropic import AsyncAnthropic
            self.client = AsyncAnthropic(api_key=self.api_key)
        except ImportError:
            logger.warning("anthropic not installed")
        except Exception as e:
            logger.warning(f"Anthropic client init failed: {e}")
    
    async def chat_completion(
        self,
        messages: List[Dict[str, str]],
        model: str = "claude-3-sonnet-20240229",
        max_tokens: int = 1024,
        **kwargs
    ) -> str:
        """Get chat completion."""
        if not self.client:
            raise RuntimeError("Anthropic not configured")
        
        # Convert messages to Anthropic format
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
            **kwargs
        )
        return response.content[0].text
    
    async def chat_completion_stream(
        self,
        messages: List[Dict[str, str]],
        model: str = "claude-3-sonnet-20240229",
        **kwargs
    ) -> AsyncIterator[str]:
        """Streaming completion."""
        if not self.client:
            raise RuntimeError("Anthropic not configured")
        
        async with self.client.messages.stream(
            model=model,
            messages=messages,
            **kwargs
        ) as stream:
            async for text in stream.text_stream:
                yield text
    
    def is_available(self) -> bool:
        """Check if Anthropic is configured."""
        return bool(self.api_key and self.client)


anthropic_adapter = AnthropicAdapter()
```

- [ ] **Step 2: Commit**

```bash
git add backend/app/services/providers/anthropic.py
git commit -m "feat: add Anthropic adapter"
```

---

### Task 5: Unified Gateway

**Files:**
- Create: `backend/app/services/unified_gateway.py`

- [ ] **Step 1: Create unified gateway**

```python
# backend/app/services/unified_gateway.py
import logging
from typing import List, Dict, Any, Optional, AsyncIterator
from app.services.model_registry import model_registry
from app.services.openai_adapter import openai_adapter
from app.services.providers.openrouter import openrouter_adapter
from app.services.providers.gemini import gemini_adapter
from app.services.providers.anthropic import anthropic_adapter

logger = logging.getLogger(__name__)

class UnifiedAIGateway:
    """Unified gateway for all AI providers with automatic fallback."""
    
    PROVIDER_MAP = {
        "openai": openai_adapter,
        "openrouter": openrouter_adapter,
        "google": gemini_adapter,
        "anthropic": anthropic_adapter,
    }
    
    def __init__(self):
        self.registry = model_registry
    
    async def chat(
        self,
        messages: List[Dict[str, str]],
        model: str = "gpt-4o",
        provider: str = "auto",
        **kwargs
    ) -> str:
        """Chat completion with automatic fallback."""
        # Auto-select provider
        if provider == "auto":
            provider = self.registry.get_provider(model) or "openai"
        
        adapter = self.PROVIDER_MAP.get(provider)
        
        if adapter and hasattr(adapter, 'is_available') and adapter.is_available():
            try:
                return await adapter.chat_completion(messages, model, **kwargs)
            except Exception as e:
                logger.warning(f"{provider} failed, falling back: {e}")
        
        # Fallback chain
        for prov, adap in self.PROVIDER_MAP.items():
            if adap and hasattr(adap, 'is_available') and adap.is_available():
                try:
                    return await adap.chat_completion(messages, model, **kwargs)
                except:
                    continue
        
        raise RuntimeError("No AI provider available")
    
    async def vision_analyze(
        self,
        image_bytes: bytes,
        prompt: str,
        model: str = "gpt-4v"
    ) -> str:
        """Analyze image with vision model."""
        if self.registry.supports_vision(model):
            provider = self.registry.get_provider(model)
            adapter = self.PROVIDER_MAP.get(provider)
            
            if adapter and hasattr(adapter, 'vision_analyze'):
                return await adapter.vision_analyze(image_bytes, prompt, model)
        
        # Fallback to Gemini vision
        if gemini_adapter.is_available():
            return await gemini_adapter.vision_analyze(image_bytes, prompt)
        
        raise RuntimeError("No vision model available")
    
    def get_available_models(self) -> List[str]:
        """Get list of available models."""
        available = []
        for prov, adap in self.PROVIDER_MAP.items():
            if adap and hasattr(adap, 'is_available') and adap.is_available():
                available.append(prov)
        return available


unified_gateway = UnifiedAIGateway()
```

- [ ] **Step 2: Commit**

```bash
git add backend/app/services/unified_gateway.py
git commit -m "feat: add unified AI gateway"
```

---

### Task 6: Update Config

**Files:**
- Modify: `backend/app/config.py`

- [ ] **Step 1: Add provider config**

```python
# Add to Settings class
self.openrouter_api_key = os.getenv("OPENROUTER_API_KEY", "")
self.gemini_api_key = os.getenv("GEMINI_API_KEY", "")
self.anthropic_api_key = os.getenv("ANTHROPIC_API_KEY", "")
self.huggingface_api_key = os.getenv("HF_API_KEY", "")
```

- [ ] **Step 2: Commit**

```bash
git add backend/app/config.py
git commit -m "feat: add multi-provider config"
```

---

## Summary

| Task | Component | Status |
|------|-----------|--------|
| 1 | Model Registry | Pending |
| 2 | OpenRouter Adapter | Pending |
| 3 | Gemini Adapter | Pending |
| 4 | Anthropic Adapter | Pending |
| 5 | Unified Gateway | Pending |
| 6 | Config Update | Pending |

---

**Plan complete.** Ready for subagent execution.
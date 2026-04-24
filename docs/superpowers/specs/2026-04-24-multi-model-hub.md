# Multi-Model AI Hub Specification

**Date:** 2026-04-24  
**Status:** Approved  
**Phase:** Base Layer (All providers)

---

## Overview

Unified AI gateway supporting multiple providers: OpenRouter, OpenAI, Gemini, Anthropic, HuggingFace. Supports text and image (vision + generation).

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                  UnifiedAIGateway                    │
│        (Single interface for all providers)        │
└──────────────────────┬──────────────────────────────┘
                       │
    ┌───────────────────┼───────────────────┐
    │                   │                   │
┌───┴──────┐      ┌────┴─────┐        ┌───┴──────┐
│OpenRouter│      │OpenAI    │        │Provider │
│ Adapter │      │ Adapter │        │Adapters │
│(70+models)     │(GPT-4)  │        │(Gemini) │
└─────────┘      └─────────┘        └─────────┘
    │                   │              │
┌─────────────────────────────────────┐
│         ModelRegistry                │
│   (config: model→provider, cost)     │
└─────────────────────────────────────┘
```

---

## Supported Providers

| Provider | API Key Env | Models | Capabilities |
|----------|------------|--------|-------------|
| OpenRouter | OPENROUTER_API_KEY | 70+ models | text, vision |
| OpenAI | OPENAI_API_KEY | GPT-4o, 4V | text, vision |
| Gemini | GEMINI_API_KEY | Gemini Pro/Ultra | text, vision |
| Anthropic | ANTHROPIC_API_KEY | Claude 3 | text, vision |
| HuggingFace | HF_API_KEY | 100K+ models | text, vision, custom |

---

## Image Capabilities

- **Vision Analysis**: Analyze charts, upload fairness visualizations
- **Generation**: Create reports, charts (via DALL-E/Stable Diffusion)

---

## Unified Interface

```python
class UnifiedAIGateway:
    async def chat(
        self,
        messages: List[Dict],
        model: str = "gpt-4o",
        provider: str = "auto",  # auto-select best available
        **kwargs
    ) -> str:
        """Chat completion with automatic provider fallback"""
    
    async def vision_analyze(
        self,
        image: bytes,
        prompt: str,
        model: str = "gpt-4v"
    ) -> str:
        """Analyze image with vision model"""
    
    async def generate_image(
        self,
        prompt: str,
        model: str = "dall-e-3"
    ) -> str:
        """Generate image"""
```

---

## Model Registry (config.yaml)

```yaml
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
  
  gemini-pro-vision:
    provider: google
    cost_per_1k: 0.002
    capabilities: [text, vision]
  
  llama-3-70b:
    provider: openrouter
    cost_per_1k: 0.0008
    capabilities: [text]
  
  mixtral-8x7b:
    provider: openrouter
    cost_per_1k: 0.0005
    capabilities: [text]
```

---

## Environment Variables

```env
# Primary
OPENAI_API_KEY=sk-...

# Aggregator  
OPENROUTER_API_KEY=sk-...

# Provider natives
GEMINI_API_KEY=AIza...
ANTHROPIC_API_KEY=sk-ant...
HF_API_KEY=hf_...

# Default model
DEFAULT_MODEL=gpt-4o
DEFAULT_PROVIDER=auto
```

---

## Files to Create

| File | Purpose |
|------|---------|
| `app/services/unified_gateway.py` | Main gateway class |
| `app/services/providers/openrouter.py` | OpenRouter adapter |
| `app/services/providers/anthropic.py` | Anthropic adapter |
| `app/services/providers/huggingface.py` | HuggingFace adapter |
| `app/services/providers/gemini.py` | Gemini adapter |
| `app/services/model_registry.py` | Model config registry |
| `app/config/models.yaml` | Model catalog |
| `app/routers/ai_models.py` | /ai/model-select endpoint |

---

## Priority

- **P0**: Unified gateway with OpenAI + OpenRouter
- **P1**: Gemini, Anthropic adapters
- **P2**: HuggingFace, image generation
- **P3**: Vision analysis
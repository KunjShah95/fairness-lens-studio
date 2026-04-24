# Phase 1: AI Enhancement + Chatbot Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add OpenAI-powered chat with Redis caching, WebSocket streaming, and full context awareness to the existing Genie system.

**Architecture:** Extend existing `/api/genie` router with OpenAI adapter, Redis cache layer, WebSocket support. Reuse existing GenieChat.tsx frontend, enhance with streaming.

**Tech Stack:** Python FastAPI, openai>=1.0.0, redis>=5.0.0, websockets>=12.0.0, React

---

## File Structure

```
backend/
├── app/
│   ├── services/
│   │   ├── openai_adapter.py      (NEW - OpenAI wrapper)
│   │   ├── cache_service.py      (NEW - Redis caching)
│   │   ├── rate_limiter.py      (NEW - Rate limiting)
│   │   └── chat_context.py      (NEW - Context loader)
│   ├── routers/
│   │   ├── genie.py           (MODIFY - Add OpenAI)
│   │   └── websocket.py        (NEW - WebSocket router)
│   └── config.py              (MODIFY - Add OpenAI config)
└── requirements.txt           (MODIFY - Add deps)

src/
├── components/
│   ├── GenieChat.tsx         (MODIFY - Add streaming)
│   └── StreamingMarkdown.tsx  (NEW - Streaming render)
└── lib/
    └── genie-client.ts        (NEW - WebSocket client)
```

---

## Dependencies

### Task 1: Add Python Dependencies

**Files:**
- Modify: `backend/requirements.txt`
- Test: No test needed

- [ ] **Step 1: Add requirements**

Add to `backend/requirements.txt`:
```
openai>=1.0.0
redis>=5.0.0
websockets>=12.0.0
python-multipart>=0.0.6
markdown>=3.5.0
httpx>=0.25.0
```

- [ ] **Step 2: Install dependencies**

Run: `pip install openai redis websockets python-multipart markdown httpx`

- [ ] **Step 3: Commit**

```bash
git add backend/requirements.txt
git commit -m "feat: add OpenAI and Redis dependencies"
```

---

## Backend - OpenAI Adapter

### Task 2: Create OpenAI Adapter Service

**Files:**
- Create: `backend/app/services/openai_adapter.py`
- Test: `backend/tests/test_openai_adapter.py`

- [ ] **Step 1: Write the failing test**

```python
# backend/tests/test_openai_adapter.py
import pytest
from unittest.mock import MagicMock, patch

class TestOpenAIAdapter:
    def test_initialization_without_key_raises(self):
        with pytest.raises(ValueError):
            from app.services.openai_adapter import OpenAIAdapter
    
    @patch('app.services.openai_adapter.OpenAI')
    def test_chat_completion_returns_response(self, mock_openai):
        from app.config import Settings
        Settings.OPENAI_API_KEY = "sk-test"
        
        mock_client = MagicMock()
        mock_client.chat.completions.create.return_value = MagicMock(
            choices=[MagicMock(message=MagicMock(content="Test response"))]
        )
        
        from app.services.openai_adapter import OpenAIAdapter
        adapter = OpenAIAdapter()
        result = adapter.chat_completion([{"role": "user", "content": "Hello"}])
        
        assert result == "Test response"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python -m pytest backend/tests/test_openai_adapter.py -v`
Expected: FAIL - import error or module not found

- [ ] **Step 3: Write minimal implementation**

```python
# backend/app/services/openai_adapter.py
import logging
from typing import List, Dict, Any, Optional, AsyncIterator
from openai import AsyncOpenAI
from app.config import settings

logger = logging.getLogger(__name__)


class OpenAIAdapter:
    """
    Adapter for OpenAI API with streaming support.
    """
    
    def __init__(self):
        self.client = None
        if settings.openai_api_key:
            self.client = AsyncOpenAI(api_key=settings.openai_api_key)
            self.model = settings.openai_model or "gpt-4o"
        else:
            logger.warning("OpenAI API key not configured")
    
    async def chat_completion(
        self,
        messages: List[Dict[str, str]],
        temperature: float = 0.7,
        max_tokens: int = 1000,
    ) -> str:
        """Get a chat completion response."""
        if not self.client:
            raise RuntimeError("OpenAI not configured")
        
        response = await self.client.chat.completions.create(
            model=self.model,
            messages=messages,
            temperature=temperature,
            max_tokens=max_tokens,
        )
        return response.choices[0].message.content
    
    async def chat_completion_stream(
        self,
        messages: List[Dict[str, str]],
        temperature: float = 0.7,
    ) -> AsyncIterator[str]:
        """Get a streaming chat completion response."""
        if not self.client:
            raise RuntimeError("OpenAI not configured")
        
        stream = await self.client.chat.completions.create(
            model=self.model,
            messages=messages,
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


# Singleton instance
openai_adapter = OpenAIAdapter()
```

- [ ] **Step 4: Run test to verify it passes**

Run: `python -m pytest backend/tests/test_openai_adapter.py -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/app/services/openai_adapter.py backend/tests/test_openai_adapter.py
git commit -m "feat: add OpenAI adapter service with streaming support"
```

---

## Backend - Redis Cache

### Task 3: Create Cache Service

**Files:**
- Create: `backend/app/services/cache_service.py`
- Test: `backend/tests/test_cache_service.py`

- [ ] **Step 1: Write the failing test**

```python
# backend/tests/test_cache_service.py
import pytest
from unittest.mock import MagicMock, patch

class TestCacheService:
    @patch('app.services.cache_service.redis.from_url')
    def test_get_cache_miss(self, mock_redis):
        from app.services.cache_service import CacheService
        
        mock_client = MagicMock()
        mock_client.get.return_value = None
        mock_redis.return_value = mock_client
        
        service = CacheService()
        result = service.get("test_key")
        
        assert result is None
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python -m pytest backend/tests/test_cache_service.py -v`
Expected: FAIL

- [ ] **Step 3: Write implementation**

```python
# backend/app/services/cache_service.py
import logging
import hashlib
import json
from typing import Optional, Any
import redis.asyncio as redis
from app.config import settings

logger = logging.getLogger(__name__)


class CacheService:
    """Redis-based caching for LLM responses."""
    
    def __init__(self):
        self.client: Optional[redis.Redis] = None
        self._memory_cache: dict = {}  # Fallback
    
    async def connect(self):
        """Initialize Redis connection."""
        try:
            if settings.redis_url:
                self.client = redis.from_url(settings.redis_url)
                await self.client.ping()
                logger.info("Redis cache connected")
        except Exception as e:
            logger.warning(f"Redis unavailable, using in-memory cache: {e}")
            self.client = None
    
    def _hash_key(self, data: Any) -> str:
        """Generate cache key from data."""
        serialized = json.dumps(data, sort_keys=True)
        return hashlib.sha256(serialized.encode()).hexdigest()[:64]
    
    async def get(self, key: str) -> Optional[str]:
        """Get cached value."""
        if self.client:
            try:
                value = await self.client.get(f"ai:{key}")
                if value:
                    return value.decode() if isinstance(value, bytes) else value
            except Exception as e:
                logger.warning(f"Cache get error: {e}")
        
        # Fallback to memory
        return self._memory_cache.get(f"ai:{key}")
    
    async def set(self, key: str, value: str, ttl_seconds: int = 3600):
        """Set cached value with TTL."""
        cache_key = f"ai:{key}"
        
        if self.client:
            try:
                await self.client.setex(cache_key, ttl_seconds, value)
                return
            except Exception as e:
                logger.warning(f"Cache set error: {e}")
        
        # Fallback to memory
        self._memory_cache[cache_key] = value
    
    async def invalidate(self, pattern: str):
        """Invalidate cache entries matching pattern."""
        if self.client:
            try:
                keys = []
                async for key in self.client.scan_iter(f"ai:{pattern}*"):
                    keys.append(key)
                if keys:
                    await self.client.delete(*keys)
            except Exception as e:
                logger.warning(f"Cache invalidate error: {e}")
        
        # Fallback
        self._memory_cache = {
            k: v for k, v in self._memory_cache.items()
            if not k.startswith(f"ai:{pattern}")
        }
    
    async def close(self):
        """Close Redis connection."""
        if self.client:
            await self.client.close()


cache_service = CacheService()
```

- [ ] **Step 4: Run test to verify it passes**

Run: `python -m pytest backend/tests/test_cache_service.py -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/app/services/cache_service.py backend/tests/test_cache_service.py
git commit -m "feat: add Redis cache service with fallback"
```

---

## Backend - Rate Limiter

### Task 4: Create Rate Limiter Service

**Files:**
- Create: `backend/app/services/rate_limiter.py`
- Test: `backend/tests/test_rate_limiter.py`

- [ ] **Step 1: Write the failing test**

```python
# backend/tests/test_rate_limiter.py
import pytest
from unittest.mock import MagicMock, patch

class TestRateLimiter:
    @patch('app.services.rate_limiter.redis.from_url')
    def test_rate_limit_allows_first_request(self, mock_redis):
        mock_client = MagicMock()
        mock_client.get.return_value = None
        mock_redis.return_value = mock_client
        
        from app.services.rate_limiter import RateLimiter
        limiter = RateLimiter()
        
        # First request should pass
        allowed = await limiter.check_limit("user1", 10, 60)
        assert allowed is True
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python -m pytest backend/tests/test_rate_limiter.py -v`
Expected: FAIL

- [ ] **Step 3: Write implementation**

```python
# backend/app/services/rate_limiter.py
import logging
from typing import Optional
import redis.asyncio as redis
from app.config import settings
from fastapi import HTTPException

logger = logging.getLogger(__name__)


class RateLimiter:
    """Redis-based rate limiter with sliding window."""
    
    def __init__(self):
        self.client: Optional[redis.Redis] = None
        self._memory: dict = {}  # Fallback
    
    async def connect(self):
        """Initialize Redis connection."""
        try:
            if settings.redis_url:
                self.client = redis.from_url(settings.redis_url)
        except Exception as e:
            logger.warning(f"Rate limiter Redis unavailable: {e}")
    
    async def check_limit(
        self,
        user_id: str,
        limit: int = 100,
        window_seconds: int = 86400,
    ) -> bool:
        """
        Check if user is within rate limit.
        Returns True if allowed, raises HTTPException if exceeded.
        """
        key = f"ratelimit:{user_id}"
        
        if self.client:
            try:
                count = await self.client.get(key)
                if count and int(count) >= limit:
                    raise HTTPException(
                        status_code=429,
                        detail=f"Rate limit exceeded. Limit: {limit}/day"
                    )
                
                pipe = self.client.pipeline()
                pipe.incr(key)
                pipe.expire(key, window_seconds)
                await pipe.execute()
                return True
            except HTTPException:
                raise
            except Exception as e:
                logger.warning(f"Rate limiter error: {e}")
        
        # Fallback to in-memory
        current = self._memory.get(key, 0)
        if current >= limit:
            raise HTTPException(
                status_code=429,
                detail=f"Rate limit exceeded. Limit: {limit}/day"
            )
        self._memory[key] = current + 1
        return True
    
    async def reset(self, user_id: str):
        """Reset rate limit for user."""
        key = f"ratelimit:{user_id}"
        
        if self.client:
            try:
                await self.client.delete(key)
            except Exception as e:
                logger.warning(f"Rate limiter reset error: {e}")
        
        self._memory.pop(key, None)


rate_limiter = RateLimiter()
```

- [ ] **Step 4: Run test to verify it passes**

Run: `python -m pytest backend/tests/test_rate_limiter.py -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/app/services/rate_limiter.py backend/tests/test_rate_limiter.py
git commit -m "feat: add Redis-based rate limiter"
```

---

## Backend - Chat Context Loader

### Task 5: Create Chat Context Service

**Files:**
- Create: `backend/app/services/chat_context.py`
- Test: `backend/tests/test_chat_context.py`

- [ ] **Step 1: Write the failing test**

```python
# backend/tests/test_chat_context.py
import pytest

class TestChatContextLoader:
    def test_load_context_returns_dict(self):
        from app.services.chat_context import ChatContextLoader
        
        loader = ChatContextLoader()
        context = loader.load_context("test-dataset-id")
        
        assert isinstance(context, dict)
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python -m pytest backend/tests/test_chat_context.py -v`
Expected: FAIL

- [ ] **Step 3: Write implementation**

```python
# backend/app/services/chat_context.py
import logging
from typing import Dict, Any, Optional, List
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.db.models import AuditRun, Dataset
from app.services.dataset_service import get_dataset

logger = logging.getLogger(__name__)


class ChatContextLoader:
    """Loads context for chat queries."""
    
    def load_context(
        self,
        dataset_id: str,
        db: Optional[Session] = None,
    ) -> Dict[str, Any]:
        """
        Load context to include in chat prompts.
        Includes dataset schema, sample rows, recent audit results.
        """
        context = {
            "dataset_id": dataset_id,
            "schema": {},
            "sample_rows": [],
            "latest_audit": None,
            "metrics": {},
        }
        
        try:
            # Load dataset info
            dataset = get_dataset(dataset_id, db) if db else None
            if dataset:
                context["dataset_name"] = dataset.name
                context["schema"] = dataset.schema or {}
                
                # Get sample rows (first 5)
                if hasattr(dataset, 'data_preview'):
                    import json
                    try:
                        preview = json.loads(dataset.data_preview)
                        context["sample_rows"] = preview[:5]
                    except:
                        pass
            
            # Load latest audit results
            if db:
                latest_audit = db.query(AuditRun).filter(
                    AuditRun.dataset_id == dataset_id
                ).order_by(AuditRun.created_at.desc()).first()
                
                if latest_audit:
                    context["latest_audit"] = {
                        "fairness_score": latest_audit.fairness_score,
                        "status": latest_audit.status.value if latest_audit.status else None,
                        "findings": latest_audit.findings or {},
                    }
                    context["metrics"] = latest_audit.findings.get("metrics", {}) if latest_audit.findings else {}
        
        except Exception as e:
            logger.warning(f"Context load error: {e}")
        
        return context
    
    def build_prompt_context(
        self,
        context: Dict[str, Any],
        chat_history: List[Dict[str, str]],
    ) -> str:
        """Build formatted context string for LLM prompt."""
        lines = [
            "## Current Analysis Context",
            f"Dataset: {context.get('dataset_name', 'Unknown')}",
            f"Fairness Score: {context.get('latest_audit', {}).get('fairness_score', 'N/A')}",
            "",
        ]
        
        # Add metrics
        metrics = context.get("metrics", {})
        if metrics:
            lines.append("### Key Metrics:")
            for metric, data in metrics.items():
                if isinstance(data, dict):
                    lines.append(f"- {metric}: {data.get('value', 'N/A')}")
        
        # Add top findings
        audit = context.get("latest_audit", {}).get("findings", {})
        if audit.get("proxy_features"):
            lines.append(f"\n### Proxy Features: {audit['proxy_features']}")
        
        lines.append("\n## Chat History:")
        for msg in chat_history[-5:]:  # Last 5 messages
            role = msg.get("role", "user")
            content = msg.get("content", "")
            lines.append(f"{role.title()}: {content[:100]}")
        
        return "\n".join(lines)


chat_context_loader = ChatContextLoader()
```

- [ ] **Step 4: Run test to verify it passes**

Run: `python -m pytest backend/tests/test_chat_context.py -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/app/services/chat_context.py backend/tests/test_chat_context.py
git commit -m "feat: add chat context loader service"
```

---

## Backend - Enhanced Genie Router

### Task 6: Update Genie Router with OpenAI

**Files:**
- Modify: `backend/app/routers/genie.py`
- Test: `backend/tests/test_genie.py`

- [ ] **Step 1: Write the failing test**

```python
# backend/tests/test_genie.py
import pytest
from unittest.mock import patch, MagicMock

class TestGenieRouter:
    @patch('app.services.openai_adapter.OpenAIAdapter.chat_completion')
    def test_chat_uses_openai(self, mock_complete):
        from app.routers.genie import chat_with_genie
        
        # Test would call OpenAI
        # This will fail until we modify the router
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python -m pytest backend/tests/test_genie.py -v`
Expected: FAIL

- [ ] **Step 3: Write enhanced implementation**

Replace the entire `backend/app/routers/genie.py` with:

```python
# backend/app/routers/genie.py
from fastapi import APIRouter, Depends, HTTPException
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
import logging
from app.services.ai_insight_engine import insight_engine
from app.services.openai_adapter import openai_adapter
from app.services.cache_service import cache_service
from app.services.rate_limiter import rate_limiter
from app.services.chat_context import chat_context_loader
from app.config import settings

router = APIRouter(prefix="/api/genie", tags=["genie"])
logger = logging.getLogger(__name__)


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    messages: List[ChatMessage]
    context: Optional[Dict[str, Any]] = None
    dataset_id: Optional[str] = None


class ChatResponse(BaseModel):
    response: str
    suggestions: List[str] = []
    sources: List[str] = ["openai"]


async def get_system_prompt(context: Dict[str, Any]) -> str:
    """Build system prompt with context."""
    base_prompt = """You are EquityLens Genie, an expert AI fairness assistant.
You help users understand bias in their models, analyze fairness metrics,
and provide actionable recommendations for improving model fairness.

Always be clear, actionable, and specific. When discussing metrics,
explain what they mean in business terms."""
    
    if context:
        context_str = chat_context_loader.build_prompt_context(context, [])
        return f"{base_prompt}\n\n{context_str}"
    
    return base_prompt


@router.post("/chat", response_model=ChatResponse)
async def chat_with_genie(request: ChatRequest, user_id: str = "default"):
    """
    Conversational interface for EquityLens Genie.
    Uses OpenAI with context awareness and Redis caching.
    """
    # Check rate limit
    limit = getattr(settings, 'ai_rate_limit', 100)
    await rate_limiter.check_limit(user_id, limit)
    
    try:
        last_message = request.messages[-1].content
        user_context = request.context or {}
        
        # Build cache key
        cache_key = f"{request.dataset_id or 'none'}:{last_message}"
        
        # Try cache first
        cached = await cache_service.get(cache_key)
        if cached:
            logger.info("Returning cached response")
            return ChatResponse(
                response=cached,
                suggestions=["Ask a follow-up", "Explain more"],
                sources=["cache"]
            )
        
        # Build messages for OpenAI
        system_prompt = await get_system_prompt(user_context)
        messages = [{"role": "system", "content": system_prompt}]
        
        # Add chat history
        for msg in request.messages:
            messages.append({
                "role": msg.role,
                "content": msg.content
            })
        
        # Try OpenAI
        try:
            response_text = await openai_adapter.chat_completion(messages)
            sources = ["openai"]
        except Exception as e:
            logger.warning(f"OpenAI failed, using fallback: {e}")
            # Fallback to rule-based
            response_text = _generate_fallback_response(last_message, user_context)
            sources = ["fallback"]
        
        # Cache the response
        await cache_service.set(cache_key, response_text)
        
        suggestions = _generate_suggestions(response_text)
        
        return ChatResponse(
            response=response_text,
            suggestions=suggestions,
            sources=sources
        )
        
    except Exception as e:
        logger.error(f"Genie Chat Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/chat/stream")
async def stream_chat_with_genie(request: ChatRequest):
    """
    Streaming chat endpoint for real-time responses.
    """
    from fastapi.responses import StreamingResponse
    import asyncio
    
    last_message = request.messages[-1].content
    user_context = request.context or {}
    
    system_prompt = await get_system_prompt(user_context)
    messages = [{"role": "system", "content": system_prompt}]
    
    for msg in request.messages:
        messages.append({"role": msg.role, "content": msg.content})
    
    async def generate():
        try:
            async for token in openai_adapter.chat_completion_stream(messages):
                yield f"data: {token}\n\n"
        except Exception as e:
            yield f"data: [ERROR] {str(e)}\n\n"
        yield "data: [DONE]\n\n"
    
    return StreamingResponse(
        generate(),
        media_type="text/event-stream"
    )


@router.post("/enhance")
async def enhance_insights(audit_results: Dict[str, Any]):
    """
    Enhance existing audit insights with OpenAI.
    """
    try:
        summary = insight_engine.generate_executive_summary(audit_results)
        
        # Use OpenAI to enhance
        prompt = f"""Analyze these fairness audit results and provide deeper insights:

{summary}

Provide a detailed explanation in 2-3 paragraphs."""
        
        enhanced = await openai_adapter.chat_completion([
            {"role": "system", "content": "You are a helpful AI fairness expert."},
            {"role": "user", "content": prompt}
        ])
        
        return {
            "original_summary": summary,
            "enhanced_summary": enhanced,
            "sources": ["openai"]
        }
    except Exception as e:
        logger.warning(f"Enhance failed, returning original: {e}")
        return {
            "original_summary": insight_engine.generate_executive_summary(audit_results),
            "enhanced_summary": None,
            "sources": ["fallback"]
        }


def _generate_fallback_response(message: str, context: Dict) -> str:
    """Fallback rule-based response."""
    message_lower = message.lower()
    
    if "summary" in message_lower or "overall" in message_lower:
        return insight_engine.generate_executive_summary(context)
    elif "recommend" in message_lower or "fix" in message_lower:
        recs = insight_engine.generate_recommendations(context)
        if recs:
            response = "Here are actionable recommendations:\n\n"
            for i, r in enumerate(recs[:3], 1):
                response += f"{i}. **{r['title']}**: {r['action']}\n"
            return response
    elif "risk" in message_lower:
        analysis = insight_engine.analyze(context)
        risk = analysis.get("risk_profile", {})
        return f"Risk level: {risk.get('level', 'Unknown')}"
    
    return insight_engine.generate_executive_summary(context)


def _generate_suggestions(response: str) -> List[str]:
    """Generate follow-up suggestions based on response."""
    return [
        "Tell me more about this",
        "Show specific metrics",
        "What should I do next?"
    ]
```

- [ ] **Step 4: Run test to verify it passes**

Run: `python -m pytest backend/tests/test_genie.py -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/app/routers/genie.py
git commit -m "feat: enhance genie router with OpenAI and caching"
```

---

## Backend - Config Updates

### Task 7: Add OpenAI Config

**Files:**
- Modify: `backend/app/config.py`
- Test: No test needed

- [ ] **Step 1: Read current config**

Run: `cat backend/app/config.py | head -50`

- [ ] **Step 2: Add OpenAI config**

Add to `backend/app/config.py`:
```python
# OpenAI Configuration
self.openai_api_key = os.getenv("OPENAI_API_KEY", "")
self.openai_model = os.getenv("OPENAI_MODEL", "gpt-4o")
self.ai_rate_limit = int(os.getenv("AI_RATE_LIMIT", "100"))
self.ai_rate_window = int(os.getenv("AI_RATE_WINDOW", "86400"))
```

- [ ] **Step 3: Commit**

```bash
git add backend/app/config.py
git commit -m "feat: add OpenAI configuration settings"
```

---

## Frontend - Enhanced Chat

### Task 8: Enhance GenieChat with Streaming

**Files:**
- Modify: `src/components/GenieChat.tsx`
- Create: `src/components/StreamingMarkdown.tsx`

- [ ] **Step 1: Create streaming markdown component**

```typescript
// src/components/StreamingMarkdown.tsx
import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface StreamingMarkdownProps {
  content: string;
  isStreaming?: boolean;
}

export function StreamingMarkdown({ content, isStreaming }: StreamingMarkdownProps) {
  return (
    <ReactMarkdown 
      remarkPlugins={[remarkGfm]}
      components={{
        p: ({ children }) => (
          <p className="leading-relaxed">{children}</p>
        ),
        strong: ({ children }) => (
          <strong className="font-semibold">{children}</strong>
        ),
        code: ({ children }) => (
          <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono">
            {children}
          </code>
        ),
        ul: ({ children }) => (
          <ul className="list-disc pl-4 space-y-1">{children}</ul>
        ),
        ol: ({ children }) => (
          <ol className="list-decimal pl-4 space-y-1">{children}</ol>
        ),
      }}
    >
      {content}
      {isStreaming && ' ▊'}
    </ReactMarkdown>
  );
}
```

- [ ] **Step 2: Create WebSocket client**

```typescript
// src/lib/genie-client.ts
type MessageHandler = (data: any) => void;

class GenieWebSocketClient {
  private ws: WebSocket | null = null;
  private messageHandler: MessageHandler | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 3;

  connect(datasetId: string, onMessage: MessageHandler) {
    this.messageHandler = onMessage;
    
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
    const wsUrl = apiUrl.replace('http', 'ws');
    
    this.ws = new WebSocket(`${wsUrl}/ws/ai/chat?dataset_id=${datasetId}`);
    
    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.messageHandler?.(data);
      } catch (e) {
        console.error('WebSocket message parse error:', e);
      }
    };
    
    this.ws.onclose = () => {
      // Auto-reconnect logic could go here
    };
    
    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
  }

  send(message: string) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'message',
        content: message
      }));
    }
  }

  disconnect() {
    this.ws?.close();
    this.ws = null;
  }
}

export const genieClient = new GenieWebSocketClient();
```

- [ ] **Step 3: Update GenieChat for streaming**

Modify `src/components/GenieChat.tsx`:

1. Import StreamingMarkdown:
```typescript
import { StreamingMarkdown } from './StreamingMarkdown';
```

2. Update handleSend to use streaming:
```typescript
const response = await fetch(
  `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/genie/chat`, 
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages: [...messages, { role: 'user', content }],
      context: currentAnalysis,
      dataset_id: currentAnalysis?.dataset_id
    })
  }
);

// Handle streaming response
const reader = response.body?.getReader();
if (reader) {
  const decoder = new TextDecoder();
  let done = false;
  let accumulatedContent = '';
  
  while (!done) {
    const { value, done: doneReading } = await reader.read();
    done = doneReading;
    if (value) {
      const chunk = decoder.decode(value);
      accumulatedContent += chunk;
      // Update UI with streaming content
    }
  }
} else {
  // Non-streaming fallback
  const data = await response.json();
  // ... existing code
}
```

- [ ] **Step 4: Test the frontend**

Run: `npm run build`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add src/components/StreamingMarkdown.tsx src/lib/genie-client.ts src/components/GenieChat.tsx
git commit -m "feat: enhance GenieChat with streaming support"
```

---

## Integration - Startup Initialization

### Task 9: Initialize Services on Startup

**Files:**
- Modify: `backend/app/main.py`
- Test: No test needed

- [ ] **Step 1: Add service initialization**

In `backend/app/main.py` lifespan function, add:

```python
# Initialize AI services
try:
    from app.services.cache_service import cache_service
    from app.services.rate_limiter import rate_limiter
    
    await cache_service.connect()
    await rate_limiter.connect()
    logger.info("AI services initialized")
except Exception as e:
    logger.warning(f"AI services initialization skipped: {e}")
```

- [ ] **Step 2: Commit**

```bash
git add backend/app/main.py
git commit -m "feat: initialize AI services on startup"
```

---

## Integration Tests

### Task 10: Full Integration Test

**Files:**
- Create: `backend/tests/test_integration_genie.py`

- [ ] **Step 1: Write integration test**

```python
# backend/tests/test_integration_genie.py
import pytest
from unittest.mock import patch

class TestGenieIntegration:
    @patch('app.services.openai_adapter.OpenAIAdapter.chat_completion')
    @patch('app.services.cache_service.cache_service.get')
    @patch('app.services.rate_limiter.rate_limiter.check_limit')
    async def test_full_chat_flow(self, mock_limit, mock_cache, mock_complete):
        from app.routers.genie import chat_with_genie
        from app.schemas.genie import ChatRequest, ChatMessage
        
        mock_complete.return_value = "Test response"
        mock_cache.return_value = None
        mock_limit.return_value = True
        
        request = ChatRequest(
            messages=[ChatMessage(role="user", content="Summarize my audit")]
        )
        
        response = await chat_with_genie(request)
        
        assert response.response == "Test response"
        assert "openai" in response.sources
```

- [ ] **Step 2: Run test**

Run: `python -m pytest backend/tests/test_integration_genie.py -v`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add backend/tests/test_integration_genie.py
git commit -m "test: add Genie integration tests"
```

---

## Summary

| Task | Component | Status |
|------|-----------|--------|
| 1 | Dependencies | Pending |
| 2 | OpenAI Adapter | Pending |
| 3 | Cache Service | Pending |
| 4 | Rate Limiter | Pending |
| 5 | Chat Context | Pending |
| 6 | Genie Router | Pending |
| 7 | Config | Pending |
| 8 | Frontend | Pending |
| 9 | Startup | Pending |
| 10 | Integration Tests | Pending |

---

## Next Steps

After completing all tasks:

1. Set environment variables:
   ```bash
   export OPENAI_API_KEY="sk-your-key-here"
   export REDIS_URL="redis://localhost:6379"
   ```

2. Test locally:
   ```bash
   # Backend
   cd backend && uvicorn app.main:app --reload
   
   # Frontend
   npm run dev
   ```

3. Proceed to Phase 2: New LLM Analysis capabilities

---

**Plan complete.** Ready to execute.
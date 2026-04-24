# Phase 1: AI Enhancement + Chatbot Design

**Date:** 2026-04-24  
**Status:** Approved  
**User:** Fairness Lens Studio

---

## Overview

Enhance the MVP's rule-based AI Insight Engine with OpenAI (GPT-4o) for richer, more natural language insights, and add a context-aware chatbot UI. Uses Redis for caching, WebSocket for streaming, and falls back to the existing rule-based engine if OpenAI fails.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (React)                        │
│  • Floating chat widget (every page)                      │
│  • Insight panel with AI enhancement                      │
│  • Streaming markdown display                             │
└─────────────────┬───────────────────────────────┬─────────┘
              WebSocket                    HTTP
                  │                          │
┌─────────────────┴───────────────────┐  │
│          FastAPI Gateway               │  │
│  • /ws/ai/chat — streaming          │  │
│  • /ai/enhance — enhance insights  │  │
│  • /ai/query — context-aware      │  │
└───────────────┬───────────────────────┘  │
                │                         │
        ┌───────┴───────┐          ┌────┴────┐
        │  WebSocket    │          │ HTTP    │
        │  Manager     │          │ Auth   │
        └───────┬───────┘          └────┬────┘
                │                    │
┌────────────────┴────────────────────┐  │
│     AI Service Layer            │  │
│  ┌─────────────────┐       │  │
│  │ OpenAI Adapter   │◄──────┤  │
│  │ (GPT-4o)        │       │  │
│  └─────────────────┘       │  │
│  ┌─────────────────┐       │  │
│  │ Fallback Engine │◄──┐   │  │
│  │ (rule-based)    │   │   │  │
│  └─────────────────┘   │   │  │
│  ┌─────────────────┐   │   │  │
│  │ Redis Cache      │◄──┼───┘  │
│  └─────────────────┘   │     │
│  ┌─────────────────┐   │     │
│  │ Rate Limiter    │◄──┘     │
│  └─────────────────┘         │
└────────────────────────────────┘
```

---

## Chat Context Flow

1. User asks question in chat
2. ChatContextLoader fetches:
   - Current dataset schema + sample rows
   - Latest fairness audit results
   - Metrics (demographic parity, equalized odds, etc.)
   - Previous chat history (last 5 turns)
3. GPT-4o receives context + question
4. Streaming response to frontend

---

## Components

### Backend

| Component | Path | Responsibility |
|-----------|------|---------------|
| `OpenAIAdapter` | `app/services/openai_adapter.py` | Wraps OpenAI API, streaming |
| `FallbackEngine` | `app/services/ai_insight_engine.py` | Existing rule-based (no changes needed) |
| `RedisCache` | `app/services/cache_service.py` | LLM response cache |
| `ChatContextLoader` | `app/services/chat_context.py` | Loads dataset/audit context |
| `RateLimiter` | `app/services/rate_limiter.py` | Per-user quotas |
| `WebSocketManager` | `app/websocket/manager.py` | Connection management |
| `ChatRouter` | `app/routers/chat.py` | /ws/ai/chat, /ai/enhance, /ai/query |

### Frontend

| Component | Path | Responsibility |
|-----------|------|---------------|
| `ChatWidget` | `src/components/ChatWidget.tsx` | Floating chat button + panel |
| `ChatPanel` | `src/components/ChatPanel.tsx` | Message list + input |
| `StreamingMarkdown` | `src/components/StreamingMarkdown.tsx` | Renders streaming markdown |
| `InsightEnhancer` | `src/components/InsightEnhancer.tsx` | AI-enhanced insight card |

---

## API Endpoints

### WebSocket: `/ws/ai/chat`

**Connect:** Cookie-based auth, dataset_id in query param  
**Send:** `{"type": "message", "content": "Why is group A treated worse?"}`  
**Receive:** Streamed tokens `{"type": "delta", "content": "..."}` + final `{"type": "done"}`

### POST `/ai/enhance`

Request:
```json
{
  "audit_results": {...}
}
```
Response:
```json
{
  "enhanced_summary": "...",
  "insights": [...],
  "sources": ["openai" | "fallback"]
}
```

### POST `/ai/query`

Request:
```json
{
  "question": "What features are proxies for gender?",
  "dataset_id": "uuid"
}
```
Response:
```json
{
  "answer": "...",
  "context_used": {...},
  "sources": ["openai"]
}
```

---

## Caching Strategy

- **Cache key:** SHA256(dataset_schema + question + user_id)
- **TTL:** 1 hour
- **Invalidation:** On new dataset upload or re-analysis
- **Fallback:** If Redis unavailable, use in-memory dict

---

## Rate Limiting

- **Free tier:** 100 messages/day, 10/minute
- **Pro tier:** Unlimited
- **Implementation:** Redis-based sliding window

---

## Frontend Chat Widget

- Floating button: bottom-right, `z-index: 9999`
- Collapsed: Just chat icon (unread badge if pending)
- Expanded: 400x500px panel, slide-up animation
- Dark/light theme support
- Markdown rendering (bold, code, lists)

---

## Fallback Behavior

1. OpenAI call fails → Log error, return 503
2. Rate limited → Return 429 with retry-after
3. Redis down → Use in-memory fallback
4. All fail → Use existing `ai_insight_engine.py`

---

## Environment Variables

```env
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o
REDIS_URL=redis://localhost:6379
AI_RATE_LIMIT=100
AI_RATE_WINDOW=86400
```

---

## Testing

- Unit: OpenAIAdapter, ChatContextLoader, RateLimiter
- Integration: WebSocket chat flow
- E2E: Full chat with dataset context

---

## Dependencies

```python
# backend/requirements.txt
openai>=1.0.0
redis>=5.0.0
websockets>=12.0.0
python-multipart>=0.0.6
markdown>=3.5.0
```

```json
// frontend/package.json
{
  "react-markdown": "^9.0.0",
  "remark-gfm": "^4.0.0"
}
```

---

## Timeline

- **Week 1:** Backend service layer + Redis + endpoints
- **Week 2:** Frontend chat widget + streaming
- **Week 3:** Integration + testing + polish

---

## Open Questions

- [ ] Exact rate limits for free tier?
- [ ] Max chat history length?
- [ ] Support file uploads in chat?
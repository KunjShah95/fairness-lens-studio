from fastapi import APIRouter, Depends, HTTPException
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
import logging

from app.services.ai_insight_engine import insight_engine

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


class EnhanceRequest(BaseModel):
    audit_results: Dict[str, Any]


async def get_system_prompt(context: Dict[str, Any]) -> str:
    """Build system prompt with context."""
    base_prompt = """You are EquityLens Genie, an expert AI fairness assistant.
You help users understand bias in their models, analyze fairness metrics,
and provide actionable recommendations for improving model fairness.

Always be clear, actionable, and specific. When discussing metrics,
explain what they mean in business terms."""

    try:
        from app.services.chat_context import chat_context_loader

        context_str = chat_context_loader.build_prompt_context(context, [])
        return f"{base_prompt}\n\n{context_str}"
    except Exception:
        return base_prompt


async def _get_services():
    """Lazy load services to avoid import errors."""
    services = {}

    try:
        from app.services.openai_adapter import openai_adapter

        services["openai"] = openai_adapter
    except Exception as e:
        logger.warning(f"OpenAI adapter not available: {e}")

    try:
        from app.services.cache_service import cache_service

        services["cache"] = cache_service
    except Exception as e:
        logger.warning(f"Cache service not available: {e}")

    try:
        from app.services.rate_limiter import rate_limiter

        services["rate_limiter"] = rate_limiter
    except Exception as e:
        logger.warning(f"Rate limiter not available: {e}")

    return services


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
        "What should I do next?",
    ]


@router.post("/chat", response_model=ChatResponse)
async def chat_with_genie(request: ChatRequest, user_id: str = "default"):
    """
    Conversational interface for EquityLens Genie.
    Uses OpenAI with context awareness and Redis caching.
    """
    services = await _get_services()
    last_message = request.messages[-1].content
    user_context = request.context or {}

    # Check rate limit
    if "rate_limiter" in services:
        try:
            await services["rate_limiter"].check_limit(user_id, limit=100)
        except HTTPException:
            raise
        except Exception as e:
            logger.warning(f"Rate limit check failed: {e}")

    try:
        # Build cache key
        cache_key = f"{request.dataset_id or 'none'}:{last_message}"

        # Try cache first
        if "cache" in services:
            cached = await services["cache"].get(cache_key)
            if cached:
                logger.info("Returning cached response")
                return ChatResponse(
                    response=cached,
                    suggestions=["Ask a follow-up", "Explain more"],
                    sources=["cache"],
                )

        # Build messages for OpenAI
        system_prompt = await get_system_prompt(user_context)
        messages = [{"role": "system", "content": system_prompt}]

        # Add chat history
        for msg in request.messages:
            messages.append({"role": msg.role, "content": msg.content})

        # Try OpenAI
        response_text = None
        sources = []

        if "openai" in services and services["openai"].is_available():
            try:
                response_text = await services["openai"].chat_completion(messages)
                sources = ["openai"]
            except Exception as e:
                logger.warning(f"OpenAI failed: {e}")

        # Fallback if OpenAI failed
        if not response_text:
            response_text = _generate_fallback_response(last_message, user_context)
            sources = ["fallback"]

        # Cache the response
        if "cache" in services and sources == ["openai"]:
            await services["cache"].set(cache_key, response_text)

        suggestions = _generate_suggestions(response_text)

        return ChatResponse(
            response=response_text, suggestions=suggestions, sources=sources
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Genie Chat Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/enhance")
async def enhance_insights(request: EnhanceRequest):
    """
    Enhance existing audit insights with OpenAI.
    """
    try:
        services = await _get_services()

        summary = insight_engine.generate_executive_summary(request.audit_results)

        # Try to use OpenAI to enhance
        if "openai" in services and services["openai"].is_available():
            prompt = f"""Analyze these fairness audit results and provide deeper insights:

{summary}

Provide a detailed explanation in 2-3 paragraphs."""

            try:
                enhanced = await services["openai"].chat_completion(
                    [
                        {
                            "role": "system",
                            "content": "You are a helpful AI fairness expert.",
                        },
                        {"role": "user", "content": prompt},
                    ]
                )

                return {
                    "original_summary": summary,
                    "enhanced_summary": enhanced,
                    "sources": ["openai"],
                }
            except Exception as e:
                logger.warning(f"Enhance failed: {e}")

        # Fallback
        return {
            "original_summary": summary,
            "enhanced_summary": None,
            "sources": ["fallback"],
        }

    except Exception as e:
        logger.error(f"Enhance Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

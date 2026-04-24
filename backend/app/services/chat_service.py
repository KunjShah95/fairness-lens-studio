from typing import List, Dict, Any, AsyncGenerator
from app.services.openai_adapter import openai_adapter
from app.services.chat_context_loader import context_loader
from app.services.ai_insight_engine import insight_engine
from app.utils.ai_cache import ai_cache
from app.utils.rate_limiter import rate_limiter
import logging

logger = logging.getLogger(__name__)

class ChatService:
    """
    Orchestrates AI chat logic, context loading, and fallback.
    """
    async def get_response_stream(
        self, 
        messages: List[Dict[str, str]], 
        context_data: Dict[str, Any]
    ) -> AsyncGenerator[str, None]:
        
        # 1. Prepare system prompt and context
        system_prompt = context_loader.get_system_prompt()
        audit_context = context_loader.prepare_audit_context(context_data)
        
        # 2. Construct final message list
        full_messages = [
            {"role": "system", "content": f"{system_prompt}\n\n{audit_context}"}
        ]
        
        # Add conversation history
        full_messages.extend(messages)
        
        # 3. Check if OpenAI is available
        if openai_adapter.client:
            async for chunk in openai_adapter.get_streaming_chat_response(full_messages):
                yield chunk
        else:
            # Fallback to rule-based engine
            logger.info("OpenAI unavailable, falling back to local insight engine.")
            last_user_query = messages[-1].content if messages else ""
            
            # Simple heuristic response
            if "summary" in last_user_query.lower():
                yield insight_engine.generate_executive_summary(context_data)
            else:
                yield "I am currently running in Offline Mode. I can provide summaries and basic fairness scores, but complex natural language reasoning requires an active OpenAI connection."

    async def enhance_insight(self, insight_text: str, context_data: Dict[str, Any]) -> str:
        """
        Enhances a basic insight with more technical/regulatory detail.
        """
        # Check cache first
        cached = ai_cache.get(insight_text, context_data)
        if cached:
            return cached

        prompt = f"""Enhance the following fairness insight based on the provided context. 
        Add regulatory context (EU AI Act/NIST) if applicable.
        
        Original Insight: {insight_text}
        
        Context: {context_loader.prepare_audit_context(context_data)}
        
        Enhanced Insight:"""
        
        messages = [
            {"role": "system", "content": context_loader.get_system_prompt()},
            {"role": "user", "content": prompt}
        ]
        
        if openai_adapter.client:
            response = await openai_adapter.get_chat_response(messages)
            ai_cache.set(insight_text, context_data, response)
            return response
        return insight_text  # Return original if LLM unavailable

chat_service = ChatService()

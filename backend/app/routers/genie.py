from fastapi import APIRouter, Depends, HTTPException
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
from app.services.ai_insight_engine import insight_engine
import logging

router = APIRouter(prefix="/api/genie", tags=["genie"])
logger = logging.getLogger(__name__)

class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    messages: List[ChatMessage]
    context: Optional[Dict[str, Any]] = None

class ChatResponse(BaseModel):
    response: str
    suggestions: List[str] = []

@router.post("/chat", response_model=ChatResponse)
async def chat_with_genie(request: ChatRequest):
    """
    Conversational interface for EquityLens Genie.
    Provides insights based on current audit context.
    """
    try:
        # For MVP, we'll use a rule-based response generator 
        # that leverages the AIInsightEngine's knowledge.
        
        last_message = request.messages[-1].content.lower()
        context = request.context or {}
        
        # Basic intent classification
        if any(word in last_message for word in ["summary", "overall", "how is my model"]):
            summary = insight_engine.generate_executive_summary(context)
            response = f"Based on the current audit, {summary}"
            suggestions = ["Show recommendations", "Explain risks", "Check compliance"]
            
        elif any(word in last_message for word in ["recommend", "action", "fix", "improve"]):
            recs = insight_engine.generate_recommendations(context)
            if recs:
                response = "I have identified several actionable steps to improve fairness:\n\n"
                for i, r in enumerate(recs[:3], 1):
                    response += f"{i}. **{r['title']}** ({r['category']}): {r['action']}\n"
                suggestions = ["Tell me more about proxy leakage", "How to apply reweighing?", "Export report"]
            else:
                response = "Your model looks very balanced! I recommend setting up continuous monitoring to track any future drift."
                suggestions = ["Explain monitoring", "Check compliance"]
                
        elif any(word in last_message for word in ["risk", "danger", "problem", "issue"]):
            analysis = insight_engine.analyze(context)
            risk = analysis.get("risk_profile", {})
            response = f"The current risk profile is **{risk.get('level', 'Unknown')}**. "
            factors = risk.get("factors", {})
            response += "\n\nKey risk factors detected:\n"
            for factor, level in factors.items():
                response += f"- {factor.replace('_', ' ').title()}: {level}\n"
            suggestions = ["How to reduce legal risk?", "Show recommendations"]
            
        elif any(word in last_message for word in ["compliance", "legal", "law", "act"]):
            analysis = insight_engine.analyze(context)
            comp = analysis.get("compliance_frameworks", {})
            response = "Compliance Status Overview:\n\n"
            for fw, data in comp.items():
                response += f"**{fw.replace('_', ' ').upper()}**: {data['status']} - {data['finding']}\n"
            suggestions = ["View full compliance report", "What is EU AI Act requirement?"]
            
        else:
            response = "I am the EquityLens Genie, your expert assistant for AI fairness and compliance. I can help you summarize audit results, understand bias risks, and implement mitigation strategies. What would you like to explore?"
            suggestions = ["Give me a summary", "What are the risks?", "Check compliance"]

        return ChatResponse(response=response, suggestions=suggestions)
        
    except Exception as e:
        logger.error(f"Genie Chat Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

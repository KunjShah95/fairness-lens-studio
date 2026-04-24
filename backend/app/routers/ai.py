from fastapi import APIRouter, WebSocket, WebSocketDisconnect, HTTPException, Body
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
from app.services.websocket_manager import ws_manager
from app.services.chat_service import chat_service
from app.utils.rate_limiter import rate_limiter
import json
import logging

router = APIRouter(prefix="/api/ai", tags=["ai"])
logger = logging.getLogger(__name__)

class EnhanceRequest(BaseModel):
    insight: str
    context: Dict[str, Any]

class QueryRequest(BaseModel):
    query: str
    context: Dict[str, Any]

@router.websocket("/chat")
async def websocket_ai_chat(websocket: WebSocket):
    """
    Streaming chat endpoint via WebSocket.
    Expects messages in format: {"messages": [...], "context": {...}}
    """
    await ws_manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            payload = json.loads(data)
            
            messages = payload.get("messages", [])
            context = payload.get("context", {})
            
            # Simple rate limiting (placeholder user ID)
            user_id = "anonymous_user" 
            if not rate_limiter.is_allowed(user_id):
                await websocket.send_text(json.dumps({
                    "type": "error", 
                    "message": "Daily quota exceeded (100 messages/day). Upgrade for unlimited access."
                }))
                continue

            # Send acknowledgement
            await websocket.send_text(json.dumps({"type": "start"}))
            
            # Stream the response
            full_response = ""
            async for chunk in chat_service.get_response_stream(messages, context):
                full_response += chunk
                await websocket.send_text(json.dumps({
                    "type": "chunk",
                    "content": chunk
                }))
            
            # Send completion
            await websocket.send_text(json.dumps({
                "type": "end",
                "full_response": full_response
            }))
            
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
    except Exception as e:
        logger.error(f"WebSocket AI Error: {e}")
        await websocket.send_text(json.dumps({"type": "error", "message": str(e)}))
        ws_manager.disconnect(websocket)

@router.post("/enhance")
async def enhance_insight(request: EnhanceRequest):
    """
    Enhance a specific insight using LLM.
    """
    try:
        enhanced = await chat_service.enhance_insight(request.insight, request.context)
        return {"enhanced": enhanced}
    except Exception as e:
        logger.error(f"Enhance Insight Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/query")
async def context_query(request: QueryRequest):
    """
    Single-turn context-aware question.
    """
    try:
        messages = [{"role": "user", "content": request.query}]
        response = ""
        async for chunk in chat_service.get_response_stream(messages, request.context):
            response += chunk
        return {"response": response}
    except Exception as e:
        logger.error(f"Context Query Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

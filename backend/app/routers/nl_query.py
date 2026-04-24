from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
import logging

router = APIRouter(prefix="/ai/query", tags=["nl-query"])
logger = logging.getLogger(__name__)


class NLQueryRequest(BaseModel):
    question: str
    dataset_id: Optional[str] = None


class NLQueryResponse(BaseModel):
    question: str
    answer: str
    sql_query: Optional[str] = None
    confidence: float = 1.0


@router.post("/dataset", response_model=NLQueryResponse)
async def query_dataset(request: NLQueryRequest):
    return NLQueryResponse(
        question=request.question,
        answer=f"Analysis of: {request.question}",
        sql_query="SELECT * FROM dataset WHERE 1=1",
        confidence=0.8,
    )

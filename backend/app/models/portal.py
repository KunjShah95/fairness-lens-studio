"""Pydantic models for portal and appeals endpoints."""

from pydantic import BaseModel, Field, EmailStr
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum


class PortalExplainRequest(BaseModel):
    """Request to get explanation of decision."""
    audit_id: str = Field(..., description="ID of the audit to explain")
    profile: Dict[str, Any] = Field(..., description="User profile (age, income, etc.)")
    
    class Config:
        example = {
            "audit_id": "audit-123",
            "profile": {
                "age": 35,
                "income": 50000,
                "credit_score": 650,
                "employment_years": 5
            }
        }


class CounterfactualChange(BaseModel):
    """A single feature change in a counterfactual."""
    feature: str
    from_value: float
    to_value: float
    change_amount: float


class CounterfactualExplanation(BaseModel):
    """A counterfactual scenario."""
    scenario_id: str
    changes: Dict[str, Dict[str, float]]  # {feature: {from, to}}
    total_distance: float
    feasibility_score: float
    outcome: str  # "APPROVED"


class PortalExplainResponse(BaseModel):
    """Response with explanation and counterfactuals."""
    valid: bool
    decision_summary: str
    key_factors: List[Dict[str, Any]]
    bias_risk_factors: List[Dict[str, Any]]
    counterfactual_paths: List[Dict[str, Any]]
    next_steps: List[str]
    appeal_enabled: bool = True
    error: Optional[str] = None


class AppealSubmitRequest(BaseModel):
    """Request to submit an appeal."""
    audit_id: str = Field(..., description="ID of the audit being appealed")
    email: str = Field(..., description="Appellant email for notifications")
    reason: str = Field(..., description="Why you're appealing", min_length=50)
    
    class Config:
        example = {
            "audit_id": "audit-123",
            "email": "user@example.com",
            "reason": "I believe the decision was unfair because my income has increased recently and my credit score is in the normal range."
        }


class AppealConfirmation(BaseModel):
    """Confirmation after appeal submission."""
    success: bool
    appeal_id: Optional[str] = None
    message: str
    next_steps: List[str]
    error: Optional[str] = None


class AppealTimeline(BaseModel):
    """Single step in appeal timeline."""
    status: str
    timestamp: Optional[datetime] = None
    message: str
    completed: bool


class AppealStatusResponse(BaseModel):
    """Response with appeal status and timeline."""
    appeal_id: str
    current_status: str
    timeline: List[AppealTimeline]
    message: str
    error: Optional[str] = None


class ValidationError(BaseModel):
    """Validation error response."""
    valid: bool = False
    errors: List[str]
    message: str
    data: Optional[Dict[str, Any]] = None

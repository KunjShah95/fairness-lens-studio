"""Pydantic models for governance endpoints."""

from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime


class AuditTrailEntry(BaseModel):
    """Single audit trail entry."""
    timestamp: str
    actor: str
    action: str
    entity_type: str
    entity_id: str
    details: Dict[str, Any]
    hash: Optional[str] = None
    previous_hash: Optional[str] = None


class AuditTrailResponse(BaseModel):
    """Response with audit trail entries."""
    entity_id: str
    dataset_id: str
    entries: List[AuditTrailEntry]
    total_entries: int
    chain_integrity: str = "verified"


class ComplianceStandardCheck(BaseModel):
    """Check result for single standard."""
    standard: str
    name: str
    compliant: bool
    issues: List[str] = []


class ComplianceReport(BaseModel):
    """Compliance assessment report."""
    jurisdiction: str
    domain: str
    overall_compliant: bool
    risk_level: str  # "low", "medium", "high"
    checks: List[ComplianceStandardCheck]
    recommendations: List[str]


class CommitteeAssignment(BaseModel):
    """Appeal assignment to committee."""
    appeal_id: str
    committee_id: str
    assigned_at: datetime
    committee_members: int
    description: str
    status: str = "assigned"


class CommitteeReviewSubmission(BaseModel):
    """Committee member review submission."""
    appeal_id: str
    reviewer_id: str
    recommendation: str  # approve, reject, defer
    confidence: float
    notes: str = ""


class CommitteeVote(BaseModel):
    """Vote on an appeal."""
    appeal_id: str
    reviewer_id: str
    decision: str  # approve, reject, defer
    voted_at: datetime


class CommitteeVoteTally(BaseModel):
    """Tally of committee votes."""
    appeal_id: str
    final_decision: str
    confidence: float
    vote_breakdown: Dict[str, int]
    tallied_at: datetime


class AppealEscalationEvaluation(BaseModel):
    """Recommendation on whether to escalate appeal to committee."""
    appeal_id: str
    should_escalate_to_committee: bool
    priority: str  # standard, high, critical
    reasons: List[str]
    evaluated_at: datetime

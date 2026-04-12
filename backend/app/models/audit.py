from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum

class DomainEnum(str, Enum):
    """Supported business domains."""
    hiring = "hiring"
    lending = "lending"
    healthcare = "healthcare"
    general = "general"

class AuditRequest(BaseModel):
    """Request model to trigger an audit."""
    dataset_id: str
    label_column: str = Field(..., description="Column name for the binary outcome")
    protected_attributes: List[str] = Field(..., min_items=1)
    domain: DomainEnum = DomainEnum.general

class BiasMetrics(BaseModel):
    """Bias metrics for a single protected attribute."""
    demographic_parity_difference: float
    demographic_parity_ratio: float
    equal_opportunity_difference: float
    flagged: bool

class AuditResponse(BaseModel):
    """Response model for audit status and results."""
    audit_id: str
    status: str  # "queued", "running", "complete", "failed"
    created_at: datetime
    dataset_id: Optional[str] = None
    metrics: Optional[Dict[str, Any]] = None
    fairness_score: Optional[int] = None
    proxy_features: Optional[List[Dict]] = None
    intersectional_results: Optional[List[Dict]] = None
    feature_importance: Optional[List[Dict]] = None  # Phase 3: SHAP features
    causal_analysis: Optional[Dict[str, Any]] = None  # Phase 3: DoWhy analysis
    mitigation_results: Optional[Dict[str, Any]] = None  # Phase 4: Before/after metrics
    mitigation_applied: Optional[str] = None  # Phase 4: Mitigation technique applied
    error_message: Optional[str] = None
    
    class Config:
        from_attributes = True

class AuditHistoryResponse(BaseModel):
    """Response for audit history."""
    audits: List[AuditResponse]
    total_count: int

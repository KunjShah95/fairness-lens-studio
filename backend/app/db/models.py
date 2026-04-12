from sqlalchemy import Column, String, Float, Integer, JSON, DateTime, Enum, ForeignKey, Text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
import uuid
import enum

Base = declarative_base()

class Dataset(Base):
    """Model for uploaded datasets."""
    __tablename__ = "datasets"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, nullable=False, index=True)
    uploaded_by = Column(String, nullable=False)  # User ID
    uploaded_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    file_path = Column(String, nullable=False)
    file_name = Column(String, nullable=False)
    
    # Schema metadata
    row_count = Column(Integer, nullable=True)
    column_count = Column(Integer, nullable=True)
    schema = Column(JSON, nullable=True)  # {"col_name": "int", "col2": "string"}
    detected_protected_attrs = Column(JSON, nullable=True)  # ["gender", "race"]
    
    # Relationships
    audit_runs = relationship("AuditRun", back_populates="dataset")
    
    def __repr__(self):
        return f"<Dataset {self.id} - {self.name}>"

class AuditStatus(str, enum.Enum):
    """Audit run status enumeration."""
    queued = "queued"
    running = "running"
    complete = "complete"
    failed = "failed"

class AuditRun(Base):
    """Model for audit runs."""
    __tablename__ = "audit_runs"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    dataset_id = Column(String, ForeignKey("datasets.id"), nullable=False, index=True)
    created_by = Column(String, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    status = Column(Enum(AuditStatus), default=AuditStatus.queued, index=True)
    
    # Audit configuration
    label_column = Column(String, nullable=False)
    protected_attributes = Column(JSON, nullable=False)  # list of attribute names
    domain = Column(String, nullable=False)  # "hiring", "lending", "healthcare"
    
    # Results
    fairness_score = Column(Integer, nullable=True)
    metrics = Column(JSON, nullable=True)  # Full metric breakdown
    proxy_features = Column(JSON, nullable=True)
    intersectional_results = Column(JSON, nullable=True)
    feature_importance = Column(JSON, nullable=True)  # Phase 3: SHAP feature importance
    causal_analysis = Column(JSON, nullable=True)  # Phase 3: DoWhy causal effects
    mitigation_results = Column(JSON, nullable=True)  # Phase 4: Before/after metrics
    mitigation_applied = Column(String, nullable=True)  # Phase 4: "reweighting", "feature_removal", "adversarial"
    error_message = Column(Text, nullable=True)
    
    # Relationships
    dataset = relationship("Dataset", back_populates="audit_runs")
    appeals = relationship("Appeal", back_populates="audit_run")
    
    def __repr__(self):
        return f"<AuditRun {self.id} - {self.status}>"


class AppealStatus(str, enum.Enum):
    """Appeal status enumeration."""
    submitted = "submitted"
    under_review = "under_review"
    escalated_to_manager = "escalated_to_manager"
    escalated_to_committee = "escalated_to_committee"
    approved = "approved"
    rejected = "rejected"
    resolved = "resolved"


class Appeal(Base):
    """Model for user appeals against decisions."""
    __tablename__ = "appeals"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    audit_id = Column(String, ForeignKey("audit_runs.id"), nullable=False, index=True)
    dataset_id = Column(String, ForeignKey("datasets.id"), nullable=False, index=True)
    
    # Appellant information (privacy: only email, no PII)
    email = Column(String, nullable=False, index=True)
    
    # Appeal details
    reason = Column(Text, nullable=False)  # Why they're appealing
    status = Column(Enum(AppealStatus), default=AppealStatus.submitted, index=True)
    priority = Column(String, default="standard")  # "standard" or "high"
    
    # Timeline tracking
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)
    last_updated = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    resolved_at = Column(DateTime, nullable=True)
    
    # Review workflow
    reviewer_notes = Column(JSON, nullable=True)  # [{reviewer_id, note, timestamp}]
    manager_decision = Column(String, nullable=True)
    committee_decision = Column(String, nullable=True)
    final_resolution = Column(Text, nullable=True)  # Final explanation to appellant
    
    # Relationships
    audit_run = relationship("AuditRun", back_populates="appeals")
    dataset = relationship("Dataset")
    
    def __repr__(self):
        return f"<Appeal {self.id} - {self.status}>"

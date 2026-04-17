from sqlalchemy import String, Float, Integer, JSON, DateTime, Enum, ForeignKey, Text, Boolean
from sqlalchemy.orm import declarative_base, Mapped, mapped_column, relationship
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
import uuid
import enum

Base = declarative_base()

class UserRole(str, enum.Enum):
    """Roles for the RBAC system."""
    admin = "admin"
    auditor = "auditor"
    reviewer = "reviewer"
    standard = "standard"

class User(Base):
    """User model for authentication and authorization."""
    __tablename__ = "users"
    
    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    email: Mapped[str] = mapped_column(String, unique=True, index=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String, nullable=False)
    full_name: Mapped[str] = mapped_column(String, nullable=True)
    role: Mapped[UserRole] = mapped_column(Enum(UserRole), default=UserRole.standard)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))
    
    # Relationships
    datasets: Mapped[List["Dataset"]] = relationship("Dataset", back_populates="uploader")
    audit_runs: Mapped[List["AuditRun"]] = relationship("AuditRun", back_populates="creator")
    
    def __repr__(self) -> str:
        return f"<User {self.email} - {self.role}>"



class Dataset(Base):
    """Model for uploaded datasets."""

    __tablename__ = "datasets"

    id: Mapped[str] = mapped_column(
        String, primary_key=True, default=lambda: str(uuid.uuid4())
    )
    name: Mapped[str] = mapped_column(String, nullable=False, index=True)
    uploaded_by: Mapped[str] = mapped_column(String, ForeignKey("users.id"), nullable=False)
    uploaded_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc)
    )
    file_path: Mapped[str] = mapped_column(String, nullable=False)
    file_name: Mapped[str] = mapped_column(String, nullable=False)

    # Schema metadata
    row_count: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    column_count: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    schema: Mapped[Optional[Dict[str, Any]]] = mapped_column(
        JSON, nullable=True
    )  # {"col_name": "int", "col2": "string"}
    detected_protected_attrs: Mapped[Optional[List[str]]] = mapped_column(
        JSON, nullable=True
    )  # ["gender", "race"]

    # Relationships
    uploader: Mapped["User"] = relationship("User", back_populates="datasets")
    audit_runs: Mapped[List["AuditRun"]] = relationship(
        "AuditRun", back_populates="dataset", cascade="all, delete-orphan"
    )
    mitigated_versions: Mapped[List["MitigatedDataset"]] = relationship(
        "MitigatedDataset", back_populates="original_dataset"
    )

    def __repr__(self) -> str:
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

    id: Mapped[str] = mapped_column(
        String, primary_key=True, default=lambda: str(uuid.uuid4())
    )
    dataset_id: Mapped[str] = mapped_column(
        String, ForeignKey("datasets.id"), nullable=False, index=True
    )
    created_by: Mapped[str] = mapped_column(String, ForeignKey("users.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc)
    )
    status: Mapped[AuditStatus] = mapped_column(
        Enum(AuditStatus), default=AuditStatus.queued, index=True
    )

    # Audit configuration
    label_column: Mapped[str] = mapped_column(String, nullable=False)
    protected_attributes: Mapped[List[str]] = mapped_column(
        JSON, nullable=False
    )  # list of attribute names
    domain: Mapped[str] = mapped_column(
        String, nullable=False
    )  # "hiring", "lending", "healthcare"

    # Results
    fairness_score: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    metrics: Mapped[Optional[Dict[str, Any]]] = mapped_column(
        JSON, nullable=True
    )  # Full metric breakdown
    proxy_features: Mapped[Optional[Dict[str, Any]]] = mapped_column(
        JSON, nullable=True
    )
    intersectional_results: Mapped[Optional[Dict[str, Any]]] = mapped_column(
        JSON, nullable=True
    )
    feature_importance: Mapped[Optional[Dict[str, Any]]] = mapped_column(
        JSON, nullable=True
    )  # Phase 3: SHAP feature importance
    causal_analysis: Mapped[Optional[Dict[str, Any]]] = mapped_column(
        JSON, nullable=True
    )  # Phase 3: DoWhy causal effects
    mitigation_results: Mapped[Optional[Dict[str, Any]]] = mapped_column(
        JSON, nullable=True
    )  # Phase 4: Before/after metrics
    mitigation_applied: Mapped[Optional[str]] = mapped_column(
        String, nullable=True
    )  # Phase 4: "reweighting", "feature_removal", "adversarial"
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Relationships
    dataset: Mapped["Dataset"] = relationship("Dataset", back_populates="audit_runs")
    creator: Mapped["User"] = relationship("User", back_populates="audit_runs")
    appeals: Mapped[List["Appeal"]] = relationship(
        "Appeal", back_populates="audit_run", cascade="all, delete-orphan"
    )
    mitigated_datasets: Mapped[List["MitigatedDataset"]] = relationship(
        "MitigatedDataset", back_populates="audit_run", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
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

    id: Mapped[str] = mapped_column(
        String, primary_key=True, default=lambda: str(uuid.uuid4())
    )
    audit_id: Mapped[str] = mapped_column(
        String, ForeignKey("audit_runs.id"), nullable=False, index=True
    )
    dataset_id: Mapped[str] = mapped_column(
        String, ForeignKey("datasets.id"), nullable=False, index=True
    )

    # Appellant information (privacy: only email, no PII)
    email: Mapped[str] = mapped_column(String, nullable=False, index=True)

    # Appeal details
    reason: Mapped[str] = mapped_column(Text, nullable=False)  # Why they're appealing
    status: Mapped[AppealStatus] = mapped_column(
        Enum(AppealStatus), default=AppealStatus.submitted, index=True
    )
    priority: Mapped[str] = mapped_column(
        String, default="standard"
    )  # "standard" or "high"

    # Timeline tracking
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc), index=True
    )
    last_updated: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc)
    )
    resolved_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    # Review workflow
    reviewer_notes: Mapped[Optional[List[Dict[str, Any]]]] = mapped_column(
        JSON, nullable=True
    )  # [{reviewer_id, note, timestamp}]
    manager_decision: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    committee_decision: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    final_resolution: Mapped[Optional[str]] = mapped_column(
        Text, nullable=True
    )  # Final explanation to appellant

    # Relationships
    audit_run: Mapped["AuditRun"] = relationship("AuditRun", back_populates="appeals")
    dataset: Mapped["Dataset"] = relationship("Dataset")

    def __repr__(self) -> str:
        return f"<Appeal {self.id} - {self.status}>"


class MitigatedDataset(Base):
    """Model for datasets that have had bias mitigation applied."""
    __tablename__ = "mitigated_datasets"
    
    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    original_dataset_id: Mapped[str] = mapped_column(String, ForeignKey("datasets.id"), nullable=False)
    audit_run_id: Mapped[str] = mapped_column(String, ForeignKey("audit_runs.id"), nullable=False)
    
    algorithm_used: Mapped[str] = mapped_column(String, nullable=False)  # e.g., 'reweighing', 'adversarial_debiasing'
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))
    file_path: Mapped[str] = mapped_column(String, nullable=False)
    
    # Performance differences
    accuracy_delta: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    fairness_score_delta: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    
    # Relationships
    original_dataset: Mapped["Dataset"] = relationship("Dataset", back_populates="mitigated_versions")
    audit_run: Mapped["AuditRun"] = relationship("AuditRun", back_populates="mitigated_datasets")
    
    def __repr__(self) -> str:
        return f"<MitigatedDataset {self.id} - {self.algorithm_used}>"


class AuditTrailEntry(Base):
    """Immutable audit trail entries for compliance."""

    __tablename__ = "audit_trail_entries"

    id: Mapped[str] = mapped_column(
        String, primary_key=True, default=lambda: str(uuid.uuid4())
    )
    dataset_id: Mapped[str] = mapped_column(
        String, ForeignKey("datasets.id"), nullable=False, index=True
    )
    audit_id: Mapped[Optional[str]] = mapped_column(
        String, ForeignKey("audit_runs.id"), nullable=True, index=True
    )
    appeal_id: Mapped[Optional[str]] = mapped_column(
        String, ForeignKey("appeals.id"), nullable=True, index=True
    )

    # Entry details
    timestamp: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc), index=True
    )
    actor: Mapped[str] = mapped_column(
        String, nullable=False
    )  # "system", "analyst", "manager", "committee", "appellant"
    action: Mapped[str] = mapped_column(
        String, nullable=False
    )  # "audit_run_started", "mitigation_applied", "appeal_filed", etc.
    entity_type: Mapped[str] = mapped_column(
        String, nullable=False
    )  # "audit", "appeal", "decision", "mitigation"
    entity_id: Mapped[str] = mapped_column(String, nullable=False)
    details: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, nullable=True)

    # Hash chain for immutability
    hash: Mapped[str] = mapped_column(
        String, nullable=False
    )  # SHA256 of this entry + previous hash
    previous_hash: Mapped[Optional[str]] = mapped_column(
        String, nullable=True
    )  # Hash of previous entry

    def __repr__(self) -> str:
        return f"<AuditTrailEntry {self.id} - {self.action}>"

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from typing import Optional
import logging
import uuid

from app.db.session import get_db
from app.db.models import AuditRun, AuditStatus
from app.models.audit import AuditRequest, AuditResponse, AuditHistoryResponse
from app.services.dataset_service import load_dataset_from_file, get_dataset
from app.services.bias_engine import run_full_audit_pipeline
from app.services.audit_trail_service import AuditTrailService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/audit", tags=["audit"])


@router.post("/run", response_model=AuditResponse)
async def trigger_audit(
    request: AuditRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    """
    Trigger a new bias audit on a dataset.
    Runs asynchronously via background task.
    """
    try:
        # Validate dataset exists
        dataset = get_dataset(request.dataset_id, db)
        logger.info(f"Starting audit on dataset {request.dataset_id}")

        # Create audit record
        audit_id = str(uuid.uuid4())
        audit_run = AuditRun(
            id=audit_id,
            dataset_id=request.dataset_id,
            created_by="default_user",  # TODO: get from auth context
            status=AuditStatus.queued,
            label_column=request.label_column,
            protected_attributes=request.protected_attributes,
            domain=request.domain,
        )

        db.add(audit_run)
        db.commit()
        db.refresh(audit_run)
        logger.info(f"Created audit record {audit_id}")

        # Log audit start to audit trail
        AuditTrailService.log_to_database(
            dataset_id=request.dataset_id,
            audit_id=audit_id,
            appeal_id=None,
            actor="system",
            action="audit_run_started",
            entity_type="audit",
            entity_id=audit_id,
            details={
                "label_column": request.label_column,
                "protected_attributes": request.protected_attributes,
                "domain": request.domain,
            },
        )

        # Queue background task
        background_tasks.add_task(
            _run_audit_background,
            audit_id=audit_id,
            dataset_id=request.dataset_id,
            label_column=request.label_column,
            protected_attributes=request.protected_attributes,
            domain=request.domain,
        )

        return AuditResponse(
            audit_id=audit_id,
            status=audit_run.status.value,
            created_at=audit_run.created_at,
            dataset_id=request.dataset_id,
        )

    except ValueError as e:
        logger.error(f"Validation error: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error triggering audit: {e}")
        raise HTTPException(status_code=500, detail="Failed to start audit")


@router.get("/{audit_id}", response_model=AuditResponse)
async def get_audit_result(audit_id: str, db: Session = Depends(get_db)):
    """Retrieve audit results by ID."""
    try:
        audit = db.query(AuditRun).filter(AuditRun.id == audit_id).first()
        if not audit:
            raise HTTPException(status_code=404, detail="Audit not found")

        return AuditResponse(
            audit_id=audit.id,
            status=audit.status.value,
            created_at=audit.created_at,
            dataset_id=audit.dataset_id,
            metrics=audit.metrics,
            fairness_score=audit.fairness_score,
            proxy_features=audit.proxy_features,
            error_message=audit.error_message,
        )

    except Exception as e:
        logger.error(f"Error fetching audit: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve audit")


@router.get("", response_model=AuditHistoryResponse)
async def list_audits(
    dataset_id: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
):
    """List audit history, optionally filtered by dataset."""
    try:
        query = db.query(AuditRun)

        if dataset_id:
            query = query.filter(AuditRun.dataset_id == dataset_id)

        audits = (
            query.order_by(AuditRun.created_at.desc()).offset(skip).limit(limit).all()
        )
        total = query.count()

        return AuditHistoryResponse(
            audits=[
                AuditResponse(
                    audit_id=a.id,
                    status=a.status.value,
                    created_at=a.created_at,
                    dataset_id=a.dataset_id,
                    metrics=a.metrics,
                    fairness_score=a.fairness_score,
                    proxy_features=a.proxy_features,
                )
                for a in audits
            ],
            total_count=total,
        )

    except Exception as e:
        logger.error(f"Error listing audits: {e}")
        raise HTTPException(status_code=500, detail="Failed to list audits")


# ===== Background Task =====


async def _run_audit_background(
    audit_id: str,
    dataset_id: str,
    label_column: str,
    protected_attributes: list,
    domain: str,
):
    """Background task to run audit asynchronously."""
    from app.db.session import SessionLocal

    db = SessionLocal()
    try:
        # Update status to running
        audit = db.query(AuditRun).filter(AuditRun.id == audit_id).first()
        if audit:
            audit.status = AuditStatus.running
            db.commit()

        # Load dataset
        dataset = get_dataset(dataset_id, db)
        df = load_dataset_from_file(dataset.file_path)
        logger.info(f"Loaded dataset with {len(df)} rows for audit {audit_id}")

        # Run audit pipeline
        await run_full_audit_pipeline(
            audit_id=audit_id,
            df=df,
            label_col=label_column,
            protected_attrs=protected_attributes,
            domain=domain,
            db=db,
        )

        logger.info(f"Audit {audit_id} completed successfully")

        # Log audit completion to audit trail
        audit = db.query(AuditRun).filter(AuditRun.id == audit_id).first()
        if audit and audit.fairness_score is not None:
            AuditTrailService.log_to_database(
                dataset_id=dataset_id,
                audit_id=audit_id,
                appeal_id=None,
                actor="system",
                action="audit_run_completed",
                entity_type="audit",
                entity_id=audit_id,
                details={
                    "fairness_score": audit.fairness_score,
                    "proxy_features_count": len(audit.proxy_features or []),
                    "status": audit.status.value,
                },
            )

    except Exception as e:
        logger.error(f"Error in background audit task {audit_id}: {e}", exc_info=True)
        audit = db.query(AuditRun).filter(AuditRun.id == audit_id).first()
        if audit:
            audit.status = AuditStatus.failed
            audit.error_message = str(e)
            db.commit()

        # Log audit failure
        AuditTrailService.log_to_database(
            dataset_id=dataset_id,
            audit_id=audit_id,
            appeal_id=None,
            actor="system",
            action="audit_run_failed",
            entity_type="audit",
            entity_id=audit_id,
            details={"error": str(e)},
        )

    finally:
        db.close()

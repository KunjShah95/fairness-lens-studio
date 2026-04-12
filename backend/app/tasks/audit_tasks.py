"""
Celery tasks for long-running bias audit operations.
Configure Celery worker to process these tasks asynchronously.
"""

from celery import Celery
from app.config import settings
import logging

logger = logging.getLogger(__name__)

# Initialize Celery app
celery = Celery(
    "equitylens",
    broker=settings.redis_url,
    backend=settings.redis_url
)

celery.conf.update(
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    timezone='UTC',
    enable_utc=True,
)

@celery.task(bind=True, max_retries=2, default_retry_delay=30)
def run_audit_task(
    self,
    audit_id: str,
    dataset_id: str,
    label_column: str,
    protected_attributes: list,
    domain: str
):
    """
    Async task to run a full bias audit.
    
    Args:
        audit_id: Unique audit identifier
        dataset_id: Dataset to audit
        label_column: Outcome column name
        protected_attributes: List of protected attributes
        domain: Business domain
    """
    from app.db.session import SessionLocal
    from app.services.bias_engine import run_full_audit_pipeline
    from app.services.dataset_service import load_dataset_from_file, get_dataset
    
    db = SessionLocal()
    try:
        logger.info(f"[Celery] Starting audit task {audit_id}")
        
        # Load dataset and run pipeline
        dataset = get_dataset(dataset_id, db)
        df = load_dataset_from_file(dataset.file_path)
        
        # Note: Using run_full_audit_pipeline with sync wrapper
        import asyncio
        asyncio.run(run_full_audit_pipeline(
            audit_id=audit_id,
            df=df,
            label_col=label_column,
            protected_attrs=protected_attributes,
            domain=domain,
            db=db
        ))
        
        logger.info(f"[Celery] Completed audit task {audit_id}")
        return {"status": "success", "audit_id": audit_id}
    
    except Exception as exc:
        logger.error(f"[Celery] Error in audit task {audit_id}: {exc}", exc_info=True)
        # Retry with exponential backoff
        self.retry(exc=exc, countdown=30 * (2 ** self.request.retries))
    
    finally:
        db.close()

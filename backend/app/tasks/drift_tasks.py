<<<<<<< HEAD
# backend/app/tasks/drift_tasks.py
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
import logging

logger = logging.getLogger(__name__)
=======
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from app.db.session import SessionLocal
from app.services.bias_drift_service import DriftService
>>>>>>> f1d76cf993b700369496acb5692d9cbb0adb7ffc

scheduler = AsyncIOScheduler()


<<<<<<< HEAD
async def scheduled_drift_check(config_id: str, dataset_id: str):
    """Scheduled drift check for a config."""
    from app.db.session import SessionLocal
    from app.services.bias_drift_service import DriftService

    db = SessionLocal()
    try:
        results = await DriftService.check_all_enabled_monitors(db)
        logger.info(f"Drift check completed: {len(results)} alerts")
        return results
    except Exception as e:
        logger.error(f"Drift check failed: {e}")
        return []
=======
def schedule_drift_check(config_id: str, dataset_id: str):
    """Scheduled drift check for a config."""
    db = SessionLocal()
    try:
        results = DriftService.check_all_enabled_monitors(db)
        return results
>>>>>>> f1d76cf993b700369496acb5692d9cbb0adb7ffc
    finally:
        db.close()


def add_drift_job(config_id: str, dataset_id: str, cron_expression: str = "0 0 1 * *"):
    """Add a scheduled drift check job."""
    parts = cron_expression.split()
    scheduler.add_job(
        func=schedule_drift_check,
        trigger="cron",
        minute=parts[0],
        hour=parts[1],
        day=parts[2],
        month=parts[3],
        args=[config_id, dataset_id],
        id=f"drift_{config_id}",
        replace_existing=True,
    )
<<<<<<< HEAD
    logger.info(f"Added drift job for config {config_id}, schedule: {cron_expression}")
=======
>>>>>>> f1d76cf993b700369496acb5692d9cbb0adb7ffc


def start_scheduler():
    """Start the drift monitoring scheduler."""
<<<<<<< HEAD
    if not scheduler.running:
        scheduler.start()
        logger.info("Drift monitoring scheduler started")
    else:
        logger.warning("Scheduler already running")
=======
    scheduler.start()
>>>>>>> f1d76cf993b700369496acb5692d9cbb0adb7ffc


def stop_scheduler():
    """Stop the drift monitoring scheduler."""
<<<<<<< HEAD
    if scheduler.running:
        scheduler.shutdown(wait=False)
        logger.info("Drift monitoring scheduler stopped")
=======
    scheduler.shutdown()
>>>>>>> f1d76cf993b700369496acb5692d9cbb0adb7ffc

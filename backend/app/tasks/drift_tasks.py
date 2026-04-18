# backend/app/tasks/drift_tasks.py
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
import logging

logger = logging.getLogger(__name__)

scheduler = AsyncIOScheduler()


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
    finally:
        db.close()


def add_drift_job(config_id: str, dataset_id: str, cron_expression: str = "0 0 1 * *"):
    """Add a scheduled drift check job.

    Args:
        config_id: The drift monitor config ID
        dataset_id: The dataset ID to check
        cron_expression: Cron expression (default: monthly on 1st at midnight)
    """
    parts = cron_expression.split()

    if len(parts) < 5:
        logger.warning(f"Invalid cron expression: {cron_expression}, using default")
        cron_expression = "0 0 1 * *"
        parts = cron_expression.split()

    # Parse cron parts - handle both 5-field and 6-field formats
    minute = parts[0]
    hour = parts[1]
    day = parts[2] if len(parts) > 2 and parts[2] != "*" else None
    month = parts[3] if len(parts) > 3 and parts[3] != "*" else None
    day_of_week = parts[4] if len(parts) > 4 and parts[4] != "*" else None

    # APScheduler CronTrigger expects specific types
    trigger = CronTrigger(
        minute=minute,
        hour=hour,
        day=day,
        month=month,
        day_of_week=day_of_week,
    )

    scheduler.add_job(
        func=scheduled_drift_check,
        trigger=trigger,
        args=[config_id, dataset_id],
        id=f"drift_{config_id}",
        replace_existing=True,
    )
    logger.info(f"Added drift job for config {config_id}, schedule: {cron_expression}")


def start_scheduler():
    """Start the drift monitoring scheduler."""
    if not scheduler.running:
        scheduler.start()
        logger.info("Drift monitoring scheduler started")
    else:
        logger.warning("Scheduler already running")


def stop_scheduler():
    """Stop the drift monitoring scheduler."""
    if scheduler.running:
        scheduler.shutdown(wait=False)
        logger.info("Drift monitoring scheduler stopped")

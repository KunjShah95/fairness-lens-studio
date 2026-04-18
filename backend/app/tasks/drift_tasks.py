from apscheduler.schedulers.asyncio import AsyncIOScheduler
from app.db.session import SessionLocal
from app.services.bias_drift_service import DriftService

scheduler = AsyncIOScheduler()


def schedule_drift_check(config_id: str, dataset_id: str):
    """Scheduled drift check for a config."""
    db = SessionLocal()
    try:
        results = DriftService.check_all_enabled_monitors(db)
        return results
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


def start_scheduler():
    """Start the drift monitoring scheduler."""
    scheduler.start()


def stop_scheduler():
    """Stop the drift monitoring scheduler."""
    scheduler.shutdown()

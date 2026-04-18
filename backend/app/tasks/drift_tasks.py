from apscheduler.schedulers.asyncio import AsyncIOScheduler
from app.db.session import SessionLocal
from app.services.bias_drift_service import DriftService

scheduler = AsyncIOScheduler()


async def schedule_drift_check():
    """Scheduled drift check for all enabled monitors."""
    db = SessionLocal()
    try:
        results = await DriftService.check_all_enabled_monitors(db)
        return results
    finally:
        db.close()


def add_drift_job(config_id: str, cron_expression: str = "0 0 1 * *"):
    """Add a scheduled drift check job."""
    parts = cron_expression.split()
    scheduler.add_job(
        func=schedule_drift_check,
        trigger="cron",
        minute=parts[0],
        hour=parts[1],
        day=parts[2],
        month=parts[3],
        id=f"drift_{config_id}",
        replace_existing=True,
    )


def load_all_drift_jobs():
    """Load all enabled drift monitors from DB into scheduler."""
    db = SessionLocal()
    try:
        from app.db.models import DriftMonitorConfig
        configs = db.query(DriftMonitorConfig).filter(DriftMonitorConfig.enabled == True).all()
        for config in configs:
            add_drift_job(config.id, config.schedule_cron or "0 0 1 * *")
    finally:
        db.close()


def start_scheduler():
    """Start the drift monitoring scheduler."""
    if not scheduler.running:
        load_all_drift_jobs()
        scheduler.start()


def stop_scheduler():
    """Stop the drift monitoring scheduler."""
    if scheduler.running:
        scheduler.shutdown()

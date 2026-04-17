"""Celery configuration for EquityLens background tasks."""

import os
from celery import Celery
from celery.schedules import crontab

# Redis broker URL
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")

# Create Celery app
celery_app = Celery(
    "equitylens",
    broker=REDIS_URL,
    backend=REDIS_URL,
    include=[
        "app.tasks.audit_tasks",
        "app.tasks.notification_tasks",
    ],
)

# Configuration
celery_app.conf.update(
    # Task settings
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    # Task routing
    task_routes={
        "app.tasks.audit_tasks.run_audit": {"queue": "audits"},
        "app.tasks.audit_tasks.run_drift_check": {"queue": "drift"},
        "app.tasks.notification_tasks.send_email": {"queue": "notifications"},
        "app.tasks.notification_tasks.send_alert": {"queue": "alerts"},
    },
    # Beat schedule for periodic tasks
    beat_schedule={
        "weekly-drift-check": {
            "task": "app.tasks.audit_tasks.run_drift_check",
            "schedule": crontab(day_of_week="sunday", hour=2),
        },
    },
    # Result backend settings
    result_expires=3600,  # 1 hour
    task_ignore_result=False,
    # Worker settings
    worker_prefetch_multiplier=4,
    worker_max_tasks_per_child=1000,
)

if __name__ == "__main__":
    celery_app.start()

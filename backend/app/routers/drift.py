from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List, Optional
import logging

from app.db.session import get_db
from app.db.models import DriftMonitorConfig, DriftAlert
from app.models.drift import (
    DriftMonitorCreate, DriftMonitorUpdate, DriftMonitorResponse, 
    DriftAlertResponse, DriftStatusResponse
)
from app.tasks.drift_tasks import add_drift_job, scheduler

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/drift", tags=["drift"])

@router.post("/monitors", response_model=DriftMonitorResponse)
async def create_drift_monitor(
    config: DriftMonitorCreate,
    db: Session = Depends(get_db)
):
    """Create a new drift monitor."""
    try:
        new_config = DriftMonitorConfig(
            dataset_id=config.dataset_id,
            enabled=config.enabled,
            schedule_cron=config.schedule_cron,
            alert_threshold=config.alert_threshold
        )
        db.add(new_config)
        db.commit()
        db.refresh(new_config)
        
        # Add to scheduler if enabled
        if new_config.enabled:
            add_drift_job(new_config.id, new_config.schedule_cron)
            
        return new_config
    except Exception as e:
        logger.error(f"Error creating drift monitor: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/monitors", response_model=List[DriftMonitorResponse])
async def list_drift_monitors(db: Session = Depends(get_db)):
    """List all drift monitors."""
    return db.query(DriftMonitorConfig).all()

@router.patch("/monitors/{monitor_id}", response_model=DriftMonitorResponse)
async def update_drift_monitor(
    monitor_id: str,
    update: DriftMonitorUpdate,
    db: Session = Depends(get_db)
):
    """Update a drift monitor."""
    config = db.query(DriftMonitorConfig).filter(DriftMonitorConfig.id == monitor_id).first()
    if not config:
        raise HTTPException(status_code=404, detail="Monitor not found")
        
    for field, value in update.dict(exclude_unset=True).items():
        setattr(config, field, value)
        
    db.commit()
    db.refresh(config)
    
    # Update scheduler
    if config.enabled:
        add_drift_job(config.id, config.schedule_cron)
    else:
        # Remove from scheduler if it exists
        try:
            scheduler.remove_job(f"drift_{config.id}")
        except:
            pass
            
    return config

@router.delete("/monitors/{monitor_id}")
async def delete_drift_monitor(monitor_id: str, db: Session = Depends(get_db)):
    """Delete a drift monitor."""
    config = db.query(DriftMonitorConfig).filter(DriftMonitorConfig.id == monitor_id).first()
    if not config:
        raise HTTPException(status_code=404, detail="Monitor not found")
        
    db.delete(config)
    db.commit()
    
    # Remove from scheduler
    try:
        scheduler.remove_job(f"drift_{config.id}")
    except:
        pass
        
    return {"message": "Monitor deleted"}

@router.get("/alerts", response_model=List[DriftAlertResponse])
async def list_drift_alerts(
    status: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """List drift alerts."""
    query = db.query(DriftAlert)
    if status:
        query = query.filter(DriftAlert.status == status)
    return query.order_by(DriftAlert.created_at.desc()).all()

@router.post("/alerts/{alert_id}/acknowledge")
async def acknowledge_alert(alert_id: str, db: Session = Depends(get_db)):
    """Acknowledge a drift alert."""
    alert = db.query(DriftAlert).filter(DriftAlert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
        
    alert.status = "acknowledged"
    db.commit()
    return {"message": "Alert acknowledged"}

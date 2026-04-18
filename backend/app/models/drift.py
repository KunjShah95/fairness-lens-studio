from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime

class DriftMonitorBase(BaseModel):
    dataset_id: str
    enabled: bool = True
    schedule_cron: str = "0 0 1 * *"
    alert_threshold: float = 0.05

class DriftMonitorCreate(DriftMonitorBase):
    pass

class DriftMonitorUpdate(BaseModel):
    enabled: Optional[bool] = None
    schedule_cron: Optional[str] = None
    alert_threshold: Optional[float] = None

class DriftMonitorResponse(DriftMonitorBase):
    id: str
    last_checked: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True

class DriftAlertResponse(BaseModel):
    id: str
    config_id: str
    previous_score: int
    current_score: int
    score_delta: float
    metric_that_drifted: Optional[str] = None
    status: str
    created_at: datetime

    class Config:
        from_attributes = True

class DriftStatusResponse(BaseModel):
    monitors: List[DriftMonitorResponse]
    alerts: List[DriftAlertResponse]

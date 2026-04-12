from pydantic import BaseModel, Field
from typing import Optional, List, Dict
from datetime import datetime

class DatasetUploadRequest(BaseModel):
    """Request model for dataset upload."""
    name: str = Field(..., min_length=1, max_length=255)
    label_column: str = Field(..., description="Column name for the label/outcome")
    protected_attributes: List[str] = Field(..., min_items=1, description="List of protected attribute column names")
    domain: Optional[str] = Field("general", pattern="^(hiring|lending|healthcare|general)$")

class DatasetSchema(BaseModel):
    """Schema information for a dataset."""
    column_name: str
    data_type: str
    sample_values: Optional[List] = None

class DatasetResponse(BaseModel):
    """Response model for dataset queries."""
    id: str
    name: str
    uploaded_by: str
    uploaded_at: datetime
    file_name: str
    row_count: Optional[int] = None
    column_count: Optional[int] = None
    schema: Optional[Dict[str, str]] = None
    detected_protected_attrs: Optional[List[str]] = None
    
    class Config:
        from_attributes = True

class DatasetListResponse(BaseModel):
    """Response for listing datasets."""
    datasets: List[DatasetResponse]
    total_count: int

from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
import logging

from app.db.session import get_db
from app.db.models import Dataset
from app.models.dataset import DatasetUploadRequest, DatasetResponse, DatasetListResponse
from app.services.dataset_service import (
    parse_csv, save_dataset, get_dataset
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/datasets", tags=["datasets"])

@router.post("/upload", response_model=DatasetResponse)
async def upload_dataset(
    file: UploadFile = File(...),
    name: str = Form(...),
    label_column: str = Form(...),
    protected_attributes: str = Form(...),
    domain: str = Form("general"),
    db: Session = Depends(get_db)
):
    """
    Upload a CSV dataset and store metadata.
    
    protected_attributes should be comma-separated: "gender,race,age"
    """
    if file.content_type not in ["text/csv", "application/vnd.ms-excel"]:
        raise HTTPException(status_code=400, detail="Only CSV files allowed")
    
    try:
        # Read file contents
        contents = await file.read()
        
        # Parse CSV
        df = parse_csv(contents)
        logger.info(f"Parsed CSV with {len(df)} rows and {len(df.columns)} columns")
        
        # Parse protected attributes from comma-separated string
        protected_attrs_list = [attr.strip() for attr in protected_attributes.split(",")]
        
        # Create request object
        upload_request = DatasetUploadRequest(
            name=name,
            label_column=label_column,
            protected_attributes=protected_attrs_list,
            domain=domain
        )
        
        # Save dataset
        dataset_data = await save_dataset(
            df=df,
            request=upload_request,
            file_name=file.filename,
            user_id="default_user",  # TODO: get from auth context
            db=db
        )
        
        logger.info(f"Dataset uploaded successfully: {dataset_data['id']}")
        return DatasetResponse(**dataset_data)
    
    except ValueError as e:
        logger.error(f"Validation error: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error uploading dataset: {e}")
        raise HTTPException(status_code=500, detail="Failed to upload dataset")

@router.get("/{dataset_id}", response_model=DatasetResponse)
async def get_dataset_info(dataset_id: str, db: Session = Depends(get_db)):
    """Retrieve dataset metadata by ID."""
    try:
        dataset = get_dataset(dataset_id, db)
        return DatasetResponse.from_orm(dataset)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Error fetching dataset: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve dataset")

@router.get("", response_model=DatasetListResponse)
async def list_datasets(skip: int = 0, limit: int = 50, db: Session = Depends(get_db)):
    """List all uploaded datasets."""
    try:
        datasets = db.query(Dataset).offset(skip).limit(limit).all()
        total = db.query(Dataset).count()
        
        return DatasetListResponse(
            datasets=[DatasetResponse.from_orm(d) for d in datasets],
            total_count=total
        )
    except Exception as e:
        logger.error(f"Error listing datasets: {e}")
        raise HTTPException(status_code=500, detail="Failed to list datasets")

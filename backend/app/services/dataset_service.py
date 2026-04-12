import pandas as pd
import logging
from typing import List, Dict, Tuple
from io import BytesIO
from sqlalchemy.orm import Session
from app.db.models import Dataset
from app.models.dataset import DatasetUploadRequest
import os

logger = logging.getLogger(__name__)

# List of common protected attributes to auto-detect
PROTECTED_ATTRIBUTE_KEYWORDS = {
    "gender", "sex", "race", "ethnicity", "age", "disability",
    "religion", "marital_status", "veteran", "caste", "national_origin"
}

def parse_csv(file_contents: bytes) -> pd.DataFrame:
    """Parse CSV file bytes into DataFrame."""
    try:
        df = pd.read_csv(BytesIO(file_contents))
        return df
    except Exception as e:
        logger.error(f"Error parsing CSV: {e}")
        raise ValueError(f"Failed to parse CSV file: {str(e)}")

def detect_protected_attributes(df: pd.DataFrame) -> List[str]:
    """Auto-detect potential protected attributes by column name."""
    detected = []
    for col in df.columns:
        col_lower = col.lower()
        for keyword in PROTECTED_ATTRIBUTE_KEYWORDS:
            if keyword in col_lower:
                detected.append(col)
                break
    return detected

def infer_schema(df: pd.DataFrame) -> Dict[str, str]:
    """Infer Pydantic-compatible schema from DataFrame."""
    schema = {}
    for col, dtype in df.dtypes.items():
        if col not in schema:
            if pd.api.types.is_integer_dtype(dtype):
                schema[col] = "int"
            elif pd.api.types.is_float_dtype(dtype):
                schema[col] = "float"
            elif pd.api.types.is_bool_dtype(dtype):
                schema[col] = "bool"
            else:
                schema[col] = "string"
    return schema

async def save_dataset(
    df: pd.DataFrame,
    request: DatasetUploadRequest,
    file_name: str,
    user_id: str = "default_user",
    db: Session = None
) -> Dict:
    """
    Save dataset to database and store CSV file.
    
    Returns:
        Dict with dataset response data
    """
    try:
        from app.config import settings
        
        # Validate label column exists
        if request.label_column not in df.columns:
            raise ValueError(f"Label column '{request.label_column}' not found in dataset")
        
        # Validate protected attributes exist
        for attr in request.protected_attributes:
            if attr not in df.columns:
                raise ValueError(f"Protected attribute '{attr}' not found in dataset")
        
        # Infer schema
        schema = infer_schema(df)
        
        # Auto-detect protected attributes if needed
        detected_protected = detect_protected_attributes(df)
        
        # Save CSV file to disk
        dataset_id = str(__import__("uuid").uuid4())
        file_path = os.path.join(settings.upload_dir, f"{dataset_id}.csv")
        df.to_csv(file_path, index=False)
        logger.info(f"Saved dataset CSV to {file_path}")
        
        # Create database record
        dataset_record = Dataset(
            id=dataset_id,
            name=request.name,
            uploaded_by=user_id,
            file_path=file_path,
            file_name=file_name,
            row_count=len(df),
            column_count=len(df.columns),
            schema=schema,
            detected_protected_attrs=detected_protected
        )
        
        if db:
            db.add(dataset_record)
            db.commit()
            db.refresh(dataset_record)
            logger.info(f"Created dataset record {dataset_id} in database")
        
        return {
            "id": dataset_id,
            "name": request.name,
            "uploaded_by": user_id,
            "uploaded_at": dataset_record.uploaded_at,
            "file_name": file_name,
            "row_count": len(df),
            "column_count": len(df.columns),
            "schema": schema,
            "detected_protected_attrs": detected_protected
        }
    
    except Exception as e:
        logger.error(f"Error saving dataset: {e}")
        raise

def load_dataset_from_file(file_path: str) -> pd.DataFrame:
    """Load dataset from CSV file path."""
    try:
        return pd.read_csv(file_path)
    except Exception as e:
        logger.error(f"Error loading dataset from {file_path}: {e}")
        raise

def get_dataset(dataset_id: str, db: Session) -> Dataset:
    """Retrieve dataset record from database."""
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not dataset:
        raise ValueError(f"Dataset {dataset_id} not found")
    return dataset

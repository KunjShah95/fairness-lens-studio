"""
Test suite for dataset operations
"""

import pytest
from app.services.dataset_service import parse_csv, detect_protected_attributes, infer_schema

def test_parse_csv(temp_csv_file):
    """Test CSV parsing."""
    with open(temp_csv_file, 'rb') as f:
        contents = f.read()
    
    df = parse_csv(contents)
    assert len(df) == 100
    assert len(df.columns) == 6

def test_detect_protected_attributes(sample_dataset):
    """Test auto-detection of protected attributes."""
    detected = detect_protected_attributes(sample_dataset)
    
    assert "gender" in detected
    assert "race" in detected

def test_infer_schema(sample_dataset):
    """Test schema inference."""
    schema = infer_schema(sample_dataset)
    
    assert "id" in schema
    assert schema["id"] == "int"
    assert schema["income"] == "int"
    assert schema["approved"] == "int"

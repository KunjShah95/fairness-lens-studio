"""
Test suite for bias engine
"""

import pytest
import pandas as pd
from app.services.bias_engine import compute_core_metrics

@pytest.mark.asyncio
async def test_compute_core_metrics(sample_dataset):
    """Test core metric computation."""
    result = await compute_core_metrics(
        df=sample_dataset,
        label_col="approved",
        protected_attr="gender",
        privileged_val=1
    )
    
    # Should return valid metrics
    assert "demographic_parity_difference" in result
    assert "demographic_parity_ratio" in result
    assert "equal_opportunity_difference" in result
    assert "flagged" in result
    
    # Values should be floats or None
    if result["demographic_parity_difference"] is not None:
        assert isinstance(result["demographic_parity_difference"], (int, float))

@pytest.mark.asyncio
async def test_compute_metrics_missing_column(sample_dataset):
    """Test error handling for missing column."""
    result = await compute_core_metrics(
        df=sample_dataset,
        label_col="nonexistent",
        protected_attr="gender"
    )
    
    # Should have error field
    assert "error" in result or result["demographic_parity_difference"] is None

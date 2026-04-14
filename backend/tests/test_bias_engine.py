"""
Test suite for bias engine
"""

import pytest
import pandas as pd
from app.services.bias_engine import (
    compute_core_metrics,
    detect_proxy_features,
    _compute_fairness_score_phase2,
)

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


@pytest.mark.asyncio
async def test_detect_proxy_features_returns_ranked_list(sample_dataset):
    """Proxy detection should return a list sorted by abs correlation desc."""
    proxies = await detect_proxy_features(
        df=sample_dataset,
        label_col="approved",
        protected_attrs=["gender", "race"],
        correlation_threshold=0.0,  # force broad capture for deterministic test
    )

    assert isinstance(proxies, list)
    if len(proxies) > 1:
        corrs = [abs(item["correlation"]) for item in proxies]
        assert corrs == sorted(corrs, reverse=True)


def test_hybrid_fairness_score_range_and_penalties():
    """Hybrid fairness score should stay in 0-100 and decrease with penalties."""
    healthy_metrics = {
        "gender": {
            "demographic_parity_difference": 0.02,
            "demographic_parity_ratio": 0.95,
            "equal_opportunity_difference": 0.03,
        }
    }

    risky_metrics = {
        "gender": {
            "demographic_parity_difference": 0.35,
            "demographic_parity_ratio": 0.40,
            "equal_opportunity_difference": 0.30,
        }
    }

    healthy_score = _compute_fairness_score_phase2(
        healthy_metrics,
        proxy_count=0,
        intersectional_results=[],
    )
    risky_score = _compute_fairness_score_phase2(
        risky_metrics,
        proxy_count=3,
        intersectional_results=[{"disparity_from_average": 0.25}],
    )

    assert 0 <= healthy_score <= 100
    assert 0 <= risky_score <= 100
    assert healthy_score > risky_score

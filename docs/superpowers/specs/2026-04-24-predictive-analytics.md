# Phase 3: Predictive Analytics Specification

**Date:** 2026-04-24  
**Status:** Approved  
**Prerequisite:** Multi-Model Hub

---

## Overview

Bias trend forecasting, drift prediction, and what-if scenario analysis using ML models.

---

## Features

### 1. Bias Trend Forecasting

```python
@router.post("/ai/predict/trend")
async def predict_bias_trend(
    dataset_id: str,
    protected_attribute: str,
    time_horizon_days: int = 30
):
    """
    Predict future bias levels based on historical data.
    Uses time-series + causal models.
    """
# Response:
{
    "predicted_score": 72,
    "confidence_interval": [68, 76],
    "trend": "improving",  # or degrading/stable
    "factors": ["treatment_rate", "feature_drift"]
}
```

### 2. Drift Prediction

```python
@router.post("/ai/predict/drift")
async def predict_drift(
    dataset_id: str,
    feature: str = "all"
):
    """
    Predict which features will drift.
    Early warning for model retraining.
    """
```

### 3. What-If Analysis

```python
@router.post("/ai/simulate/whatif")
async def whatif_analysis(
    scenario: WhatIfScenario  # interventionapplied, expected_effect
):
    """
    Simulate interventions:
    - "What if we remove feature X?"
    - "What if group B gets same treatment?"
    """
```

### 4. Counterfactual Predictions

```python
@router.post("/ai/predict/counterfactual")
async def predict_counterfactual(
    row: Dict,
    protected_attribute: str,
    desired_outcome: str
):
    """
    What would need to change for equitable outcome?
    """
```

---

## Endpoints

| Endpoint | Purpose |
|---------|---------|
| `POST /ai/predict/trend` | Forecast bias trends |
| `POST /ai/predict/drift` | Predict feature drift |
| `POST /ai/simulate/whatif` | What-if scenarios |
| `POST /ai/predict/counterfactual` | Counterfactual analysis |

---

## ML Models

| Model | Use Case |
|-------|----------|
| Time-series (Prophet) | Trend forecasting |
| Isolation Forest | Anomaly detection |
| SHAP | Feature importance |
| CausalNex | Causal inference |

---

## Files to Create

| File | Purpose |
|------|---------|
| `app/routers/predictions.py` | Prediction endpoints |
| `app/services/trend_forecaster.py` | Bias trend ML |
| `app/services/drift_predictor.py` | Feature drift prediction |
| `app/services/whatif_engine.py` | What-if simulator |
| `app/services/counterfactual.py` | Counterfactual predictions |

---

## Dashboard Integration

- Add prediction cards to DashboardPage
- Show trend charts
- Alert on predicted drift
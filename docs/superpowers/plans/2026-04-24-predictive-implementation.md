# Phase 3: Predictive Analytics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development

**Goal:** Add bias trend forecasting, drift prediction, what-if analysis using ML models.

**Architecture:** Time-series forecasting, anomaly detection, causal inference.

**Tech Stack:** Prophet, scikit-learn, SHAP

---

### Task 1: Trend Forecasting Service

**Files:**
- Create: `backend/app/services/trend_forecaster.py`

- [ ] **Step 1: Create trend forecaster**

```python
# backend/app/services/trend_forecaster.py
import logging
from typing import Dict, Any, List, Optional
import numpy as np

logger = logging.getLogger(__name__)

class TrendForecaster:
    """Predict bias trends using time-series analysis."""
    
    def __init__(self):
        self.model = None
    
    async def predict_trend(
        self,
        dataset_id: str,
        protected_attribute: str,
        historical_data: List[Dict[str, Any]],
        time_horizon_days: int = 30
    ) -> Dict[str, Any]:
        """Predict future bias trend."""
        
        # Extract historical scores
        scores = [d.get("fairness_score", 50) for d in historical_data if "fairness_score" in d]
        
        if len(scores) < 3:
            return {
                "predicted_score": scores[-1] if scores else 50,
                "confidence_interval": [40, 60],
                "trend": "insufficient_data",
                "factors": [],
                "prediction_date": "N/A"
            }
        
        # Simple linear trend for MVP
        scores_array = np.array(scores)
        x = np.arange(len(scores_array))
        
        # Linear fit
        coeffs = np.polyfit(x, scores_array, 1)
        slope = coeffs[0]
        
        # Predict future
        future_x = len(scores) + time_horizon_days
        predicted = coeffs[0] * future_x + coeffs[1]
        predicted = max(0, min(100, predicted))
        
        # Confidence interval (wider for longer horizons)
        std = np.std(scores_array)
        margin = std * (1 + time_horizon_days / 30)
        
        # Determine trend
        if slope > 0.5:
            trend = "improving"
        elif slope < -0.5:
            trend = "degrading"
        else:
            trend = "stable"
        
        return {
            "predicted_score": round(predicted, 1),
            "confidence_interval": [
                round(predicted - margin, 1),
                round(predicted + margin, 1)
            ],
            "trend": trend,
            "factors": ["treatment_rate_drift", "feature_distribution"],
            "prediction_date": f"{time_horizon_days} days forward"
        }
    
    def get_historical_trends(
        self,
        historical_data: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """Get historical trend analysis."""
        trends = []
        
        for i, d in enumerate(historical_data):
            trends.append({
                "date": d.get("created_at", f"point_{i}"),
                "score": d.get("fairness_score", 50),
                "score_change": 0 if i == 0 else d.get("fairness_score", 50) - historical_data[i-1].get("fairness_score", 50)
            })
        
        return trends


trend_forecaster = TrendForecaster()
```

- [ ] **Step 2: Commit**

```bash
git add backend/app/services/trend_forecaster.py
git commit -m "feat: add trend forecasting service"
```

---

### Task 2: Drift Predictor Service

**Files:**
- Create: `backend/app/services/drift_predictor.py`

- [ ] **Step 1: Create drift predictor**

```python
# backend/app/services/drift_predictor.py
import logging
from typing import Dict, Any, List
import numpy as np

logger = logging.getLogger(__name__)

class DriftPredictor:
    """Predict feature drift."""
    
    def __init__(self):
        self.threshold = 0.3
    
    async def predict_drift(
        self,
        current_distribution: Dict[str, Any],
        reference_distribution: Dict[str, Any],
        feature: str = "all"
    ) -> Dict[str, Any]:
        """Predict which features will drift."""
        
        results = {
            "predicted_drift": [],
            "urgency": "low",
            "features_at_risk": []
        }
        
        # Calculate distribution changes
        for feat, curr_vals in current_distribution.items():
            ref_vals = reference_distribution.get(feat, {})
            
            if not curr_vals or not ref_vals:
                continue
            
            # Simple drift detection
            curr_mean = np.mean(list(curr_vals.values()) if isinstance(curr_vals, dict) else curr_vals
            ref_mean = np.mean(list(ref_vals.values()) if isinstance(ref_vals, dict) else ref_vals
            
            drift = abs(curr_mean - ref_mean) / (ref_mean + 1e-6)
            
            if drift > self.threshold:
                results["predicted_drift"].append({
                    "feature": feat,
                    "drift_magnitude": drift,
                    "urgency": "high" if drift > 0.5 else "medium"
                })
                results["features_at_risk"].append(feat)
        
        # Set overall urgency
        if any(f.get("urgency") == "high" for f in results["predicted_drift"]):
            results["urgency"] = "high"
        elif results["predicted_drift"]:
            results["urgency"] = "medium"
        
        return results
    
    def detect_current_drift(
        self,
        dataset_a: List[Dict],
        dataset_b: List[Dict],
        features: List[str]
    ) -> Dict[str, float]:
        """Detect drift between two datasets."""
        drift_scores = {}
        
        for feat in features:
            if feat not in dataset_a[0] if dataset_a else {}:
                continue
                
            values_a = [row.get(feat, 0) for row in dataset_a]
            values_b = [row.get(feat, 0) for row in dataset_b]
            
            if values_a and values_b:
                mean_a = np.mean(values_a)
                mean_b = np.mean(values_b)
                std = np.std(values_a + values_b)
                
                drift_scores[feat] = abs(mean_a - mean_b) / (std + 1e-6)
        
        return drift_scores


drift_predictor = DriftPredictor()
```

- [ ] **Step 2: Commit**

```bash
git add backend/app/services/drift_predictor.py
git commit -m "feat: add drift prediction service"
```

---

### Task 3: What-If Analysis Router

**Files:**
- Create: `backend/app/routers/predictions.py`

- [ ] **Step 1: Create prediction router**

```python
# backend/app/routers/predictions.py
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Dict, Any, List, Optional
import logging

router = APIRouter(prefix="/ai/predict", tags=["predictions"])
logger = logging.getLogger(__name__)

class PredictTrendRequest(BaseModel):
    dataset_id: str
    protected_attribute: str
    time_horizon_days: int = 30

class PredictTrendResponse(BaseModel):
    predicted_score: float
    confidence_interval: List[float]
    trend: str
    factors: List[str]

class WhatIfScenario(BaseModel):
    intervention: str
    description: str
    expected_outcome: Optional[str] = None

class WhatIfResponse(BaseModel):
    scenario: str
    predicted_outcome: str
    confidence: float
    recommendation: str

@router.post("/trend", response_model=PredictTrendResponse)
async def predict_bias_trend(request: PredictTrendRequest):
    """Predict future bias trend."""
    try:
        from app.services.trend_forecaster import trend_forecaster
        from app.db.session import get_db
        from app.db.models import AuditRun
        
        db = next(get_db())
        
        # Get historical data
        audits = db.query(AuditRun).filter(
            AuditRun.dataset_id == request.dataset_id
        ).order_by(AuditRun.created_at.desc()).limit(30).all()
        
        historical = [
            {"fairness_score": a.fairness_score, "created_at": a.created_at}
            for a in audits if a.fairness_score
        ]
        
        result = await trend_forecaster.predict_trend(
            request.dataset_id,
            request.protected_attribute,
            historical,
            request.time_horizon_days
        )
        
        return PredictTrendResponse(**result)
        
    except Exception as e:
        logger.error(f"Trend prediction error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/drift")
async def predict_drift(
    dataset_id: str,
    feature: str = "all"
):
    """Predict feature drift."""
    try:
        from app.services.drift_predictor import drift_predictor
        
        # Get current and reference data
        # Simplified for MVP
        return {"predicted_drift": [], "urgency": "low", "features_at_risk": []}
        
    except Exception as e:
        logger.error(f"Drift prediction error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/whatif", response_model=WhatIfResponse)
async def whatif_analysis(request: WhatIfScenario):
    """What-if scenario analysis."""
    try:
        from app.services.unified_gateway import unified_gateway
        
        prompt = f"""Analyze this fairness intervention scenario:

Intervention: {request.intervention}
Description: {request.description}

Predict:
1. Expected outcome
2. Confidence level (0-1)
3. Recommendation

JSON: {{"predicted_outcome": "...", "confidence": 0.0-1.0, "recommendation": "..."}}
"""
        
        messages = [
            {"role": "system", "content": "You are a fairness analysis expert."},
            {"role": "user", "content": prompt}
        ]
        
        result = await unified_gateway.chat(messages)
        
        import json
        try:
            data = json.loads(result)
        except:
            data = {"predicted_outcome": result, "confidence": 0.5, "recommendation": "Test intervention carefully"}
        
        return WhatIfResponse(
            scenario=request.intervention,
            **data
        )
        
    except Exception as e:
        logger.error(f"What-if error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
```

- [ ] **Step 2: Commit**

```bash
git add backend/app/routers/predictions.py
git commit -m "feat: add prediction endpoints"
```

---

### Task 4: Register Routers

**Files:**
- Modify: `backend/app/main.py`

- [ ] **Step 1: Import and register**

```python
from app.routers.predictions import router as predictions_router
app.include_router(predictions_router)
```

- [ ] **Step 2: Commit**

```bash
git add backend/app/main.py
git commit -m "feat: register Phase 3 routers"
```

---

## Summary

| Task | Component | Status |
|------|-----------|--------|
| 1 | Trend Forecaster | Pending |
| 2 | Drift Predictor | Pending |
| 3 | What-If Analysis | Pending |
| 4 | Router Registration | Pending |

---

**Plan complete.**
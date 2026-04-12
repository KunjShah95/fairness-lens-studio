# SKILLS.md — EquityLens Developer Guide

> Patterns, conventions, and skills every contributor needs to build EquityLens correctly and consistently. Read CONTEXT.md first, then this file.

---

## Table of Contents

1. [Backend Skills — FastAPI](#1-backend-skills--fastapi)
2. [ML & Bias Detection Skills](#2-ml--bias-detection-skills)
3. [Simulation Engine Skills](#3-simulation-engine-skills)
4. [Frontend Skills — React](#4-frontend-skills--react)
5. [Database Skills](#5-database-skills)
6. [Async Task Skills — Celery](#6-async-task-skills--celery)
7. [Authentication & Authorization](#7-authentication--authorization)
8. [Compliance & Audit Trail Skills](#8-compliance--audit-trail-skills)
9. [Testing Patterns](#9-testing-patterns)
10. [Code Style & Conventions](#10-code-style--conventions)

---

## 1. Backend Skills — FastAPI

### Router structure

Every domain gets its own router file. Routers are registered in `main.py`. Never put business logic in a router — routers call services.

```python
# backend/app/routers/audit.py
from fastapi import APIRouter, Depends, BackgroundTasks
from app.services.bias_engine import run_audit
from app.models.audit import AuditRequest, AuditResponse
from app.utils.auth import require_role

router = APIRouter(prefix="/api/audit", tags=["audit"])

@router.post("/run", response_model=AuditResponse)
async def trigger_audit(
    request: AuditRequest,
    background_tasks: BackgroundTasks,
    user=Depends(require_role(["admin", "analyst"]))
):
    audit_id = await run_audit(request, background_tasks)
    return {"audit_id": audit_id, "status": "queued"}
```

### Service pattern

All business logic lives in `services/`. Services are async functions or classes. They never import from routers.

```python
# backend/app/services/bias_engine.py
from aif360.datasets import BinaryLabelDataset
from aif360.metrics import BinaryLabelDatasetMetric
import pandas as pd

async def compute_demographic_parity(
    df: pd.DataFrame,
    label_col: str,
    protected_attr: str,
    privileged_val: int = 1
) -> dict:
    """
    Returns demographic parity difference and ratio.
    Positive difference = privileged group has higher positive rate.
    """
    dataset = BinaryLabelDataset(
        df=df,
        label_names=[label_col],
        protected_attribute_names=[protected_attr]
    )
    metric = BinaryLabelDatasetMetric(
        dataset,
        privileged_groups=[{protected_attr: privileged_val}],
        unprivileged_groups=[{protected_attr: 0}]
    )
    return {
        "demographic_parity_difference": metric.mean_difference(),
        "demographic_parity_ratio": metric.disparate_impact(),
        "flagged": abs(metric.mean_difference()) > 0.10
    }
```

### Pydantic models

All request and response shapes are Pydantic models. Never use raw `dict` in API boundaries.

```python
# backend/app/models/audit.py
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum

class MitigationStatus(str, Enum):
    none = "none"
    reweighting = "reweighting"
    feature_removal = "feature_removal"
    adversarial = "adversarial"

class AuditRequest(BaseModel):
    dataset_id: str
    label_column: str
    protected_attributes: List[str]
    domain: str = Field(..., pattern="^(hiring|lending|healthcare)$")
    mitigation: MitigationStatus = MitigationStatus.none

class BiasMetrics(BaseModel):
    demographic_parity: float
    equal_opportunity: float
    disparate_impact: float
    fairness_score: int = Field(..., ge=0, le=100)
    proxy_features: List[str]

class AuditResponse(BaseModel):
    audit_id: str
    status: str
    created_at: datetime
    metrics: Optional[BiasMetrics] = None
```

### Error handling

Use FastAPI's `HTTPException` for all API errors. Use a custom exception handler for ML errors.

```python
from fastapi import HTTPException

# In routers
if not dataset_exists(dataset_id):
    raise HTTPException(status_code=404, detail="Dataset not found")

# In main.py — global handler for unexpected ML errors
@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    logger.error(f"Unhandled error: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal error. The audit team has been notified."}
    )
```

---

## 2. ML & Bias Detection Skills

### Running a full audit — checklist

Every audit run must:
1. Validate that protected attributes are present in the dataset
2. Check minimum group sizes (n ≥ 30 per subgroup)
3. Run all three core metrics (demographic parity, equal opportunity, disparate impact)
4. Run SHAP proxy detection on all non-protected features
5. Run intersectional analysis for all two-way attribute combinations
6. Compute the Fairness Score
7. Store results to PostgreSQL
8. Log to the immutable audit trail

### SHAP proxy detection pattern

```python
import shap
import numpy as np
from scipy.stats import pearsonr

def detect_proxy_features(
    model,
    X: pd.DataFrame,
    protected_attrs: list[str],
    correlation_threshold: float = 0.70
) -> list[dict]:
    """
    Returns a list of features that are proxies for protected attributes.
    A feature is a proxy if its SHAP importance is high AND
    it correlates strongly with a protected attribute.
    """
    explainer = shap.TreeExplainer(model)  # use LinearExplainer for linear models
    shap_values = explainer.shap_values(X)
    mean_abs_shap = np.abs(shap_values).mean(axis=0)

    proxies = []
    for i, feature in enumerate(X.columns):
        if feature in protected_attrs:
            continue
        if mean_abs_shap[i] < 0.01:  # low importance — skip
            continue
        for attr in protected_attrs:
            if attr not in X.columns:
                continue
            corr, p_value = pearsonr(X[feature], X[attr])
            if abs(corr) >= correlation_threshold and p_value < 0.05:
                proxies.append({
                    "feature": feature,
                    "protected_attribute": attr,
                    "correlation": round(corr, 3),
                    "shap_importance": round(float(mean_abs_shap[i]), 4)
                })
    return proxies
```

### Intersectional bias pattern

```python
def compute_intersectional_bias(
    df: pd.DataFrame,
    label_col: str,
    protected_attrs: list[str],
    min_group_size: int = 30
) -> list[dict]:
    """
    Computes positive outcome rate for every two-way intersection of
    protected attribute values. Returns groups with significant disparity.
    """
    overall_rate = df[label_col].mean()
    results = []

    # Two-way intersections only (three-way produces too many tiny groups)
    for i in range(len(protected_attrs)):
        for j in range(i + 1, len(protected_attrs)):
            attr_a, attr_b = protected_attrs[i], protected_attrs[j]
            grouped = df.groupby([attr_a, attr_b])[label_col].agg(["mean", "count"])
            for (val_a, val_b), row in grouped.iterrows():
                if row["count"] < min_group_size:
                    continue
                disparity = row["mean"] - overall_rate
                results.append({
                    "group": f"{attr_a}={val_a}, {attr_b}={val_b}",
                    "n": int(row["count"]),
                    "positive_rate": round(row["mean"], 3),
                    "disparity_from_average": round(disparity, 3),
                    "flagged": abs(disparity) > 0.10
                })

    return sorted(results, key=lambda x: x["disparity_from_average"])
```

### Causal fairness with DoWhy

```python
import dowhy
from dowhy import CausalModel

def run_causal_analysis(
    df: pd.DataFrame,
    treatment: str,       # e.g., "postal_code"
    outcome: str,         # e.g., "loan_approved"
    common_causes: list[str]  # e.g., ["income", "credit_score"]
) -> dict:
    """
    Tests whether treatment causally affects outcome.
    Returns ATE (Average Treatment Effect) and confidence.
    """
    model = CausalModel(
        data=df,
        treatment=treatment,
        outcome=outcome,
        common_causes=common_causes
    )
    identified = model.identify_effect()
    estimate = model.estimate_effect(
        identified,
        method_name="backdoor.linear_regression"
    )
    refutation = model.refute_estimate(
        identified, estimate,
        method_name="random_common_cause"
    )

    return {
        "treatment": treatment,
        "outcome": outcome,
        "ate": round(float(estimate.value), 4),
        "causal": abs(estimate.value) > 0.05,
        "refutation_p_value": round(refutation.new_effect, 4)
    }
```

### Fairness Score calculation

```python
def compute_fairness_score(
    demographic_parity: float,
    equal_opportunity: float,
    disparate_impact: float,
    proxy_count: int,
    worst_intersectional_disparity: float
) -> int:
    """
    Returns a 0-100 fairness score.
    Weights: DP=30%, EO=30%, DI=25%, proxy penalty, intersectional penalty.
    """
    dp_score = min(demographic_parity, 1.0) * 30
    eo_score = min(equal_opportunity, 1.0) * 30
    di_score = min(disparate_impact, 1.0) * 25
    base = dp_score + eo_score + di_score  # max 85

    proxy_penalty = min(proxy_count * 15, 30)
    intersectional_penalty = 10 if worst_intersectional_disparity > 0.20 else 0

    score = max(0, int(base - proxy_penalty - intersectional_penalty))
    return min(score, 100)
```

---

## 3. Simulation Engine Skills

### Counterfactual generation with DiCE-ML

```python
import dice_ml
from dice_ml import Dice

def generate_counterfactuals(
    model,
    X_train: pd.DataFrame,
    query_instance: pd.DataFrame,
    outcome_name: str,
    features_to_vary: list[str],  # exclude protected attrs
    num_cfs: int = 3
) -> list[dict]:
    """
    Generates diverse counterfactual examples showing minimum changes
    needed to flip the model's decision.
    """
    data = dice_ml.Data(
        dataframe=pd.concat([X_train, query_instance]),
        continuous_features=X_train.select_dtypes(include="number").columns.tolist(),
        outcome_name=outcome_name
    )
    model_d = dice_ml.Model(model=model, backend="sklearn")
    exp = Dice(data, model_d, method="random")

    cfs = exp.generate_counterfactuals(
        query_instance,
        total_CFs=num_cfs,
        desired_class="opposite",
        features_to_vary=features_to_vary
    )

    results = []
    for cf in cfs.cf_examples_list[0].final_cfs_df.to_dict(orient="records"):
        results.append({
            "changes": {
                k: {"from": float(query_instance[k].values[0]), "to": float(v)}
                for k, v in cf.items()
                if k != outcome_name and v != query_instance[k].values[0]
            },
            "new_outcome": int(cf[outcome_name])
        })
    return results
```

### What-if scenario modeling

```python
def run_whatif_scenario(
    model,
    X_test: pd.DataFrame,
    scenario: dict  # e.g., {"remove_features": ["postal_code"]}
) -> dict:
    """
    Re-runs model predictions under a modified feature set.
    Returns comparison of outcomes before and after.
    """
    X_modified = X_test.copy()

    if "remove_features" in scenario:
        for feat in scenario["remove_features"]:
            if feat in X_modified.columns:
                X_modified[feat] = X_modified[feat].mean()  # neutralize

    original_preds = model.predict(X_test)
    modified_preds = model.predict(X_modified)

    changed = original_preds != modified_preds
    return {
        "total_decisions": len(original_preds),
        "decisions_changed": int(changed.sum()),
        "newly_approved": int(((original_preds == 0) & (modified_preds == 1)).sum()),
        "newly_rejected": int(((original_preds == 1) & (modified_preds == 0)).sum()),
        "change_rate": round(changed.mean(), 3)
    }
```

---

## 4. Frontend Skills — React

### Component conventions

- One component per file. File name matches component name (PascalCase).
- All components are functional with hooks. No class components.
- Props are typed with JSDoc or TypeScript interfaces.
- Data fetching lives in custom hooks, not in components.

```jsx
// src/hooks/useAuditResult.js
import { useState, useEffect } from "react";
import { fetchAudit } from "../api/audit";

export function useAuditResult(auditId) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!auditId) return;
        setLoading(true);
        fetchAudit(auditId)
            .then(setData)
            .catch(setError)
            .finally(() => setLoading(false));
    }, [auditId]);

    return { data, loading, error };
}
```

### Fairness Score display component

```jsx
// src/components/shared/FairnessScore.jsx
export function FairnessScore({ score }) {
    const color =
        score >= 80 ? "text-green-700 bg-green-50" :
        score >= 60 ? "text-amber-700 bg-amber-50" :
                      "text-red-700 bg-red-50";
    const label =
        score >= 80 ? "Pass" :
        score >= 60 ? "Marginal" : "High risk";

    return (
        <div className={`rounded-xl p-4 flex flex-col items-center ${color}`}>
            <span className="text-5xl font-medium">{score}</span>
            <span className="text-sm mt-1">/ 100 — {label}</span>
        </div>
    );
}
```

### Zustand store pattern

```js
// src/store/auditStore.js
import { create } from "zustand";

export const useAuditStore = create((set) => ({
    currentAudit: null,
    auditHistory: [],
    setCurrentAudit: (audit) => set({ currentAudit: audit }),
    addToHistory: (audit) =>
        set((state) => ({ auditHistory: [audit, ...state.auditHistory] })),
    clearAudit: () => set({ currentAudit: null }),
}));
```

### API client pattern

```js
// src/api/audit.js
const BASE = import.meta.env.VITE_API_BASE_URL;

async function apiFetch(path, options = {}) {
    const token = localStorage.getItem("equitylens_token");
    const res = await fetch(`${BASE}${path}`, {
        headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        ...options,
    });
    if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "API error");
    }
    return res.json();
}

export const fetchAudit = (id) => apiFetch(`/api/audit/${id}`);
export const triggerAudit = (body) =>
    apiFetch("/api/audit/run", { method: "POST", body: JSON.stringify(body) });
export const runWhatif = (body) =>
    apiFetch("/api/simulate/whatif", { method: "POST", body: JSON.stringify(body) });
```

---

## 5. Database Skills

### PostgreSQL — SQLAlchemy models

```python
# backend/app/db/models.py
from sqlalchemy import Column, String, Float, Integer, JSON, DateTime, Enum
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime, timezone
import uuid, enum

Base = declarative_base()

class AuditStatus(enum.Enum):
    queued = "queued"
    running = "running"
    complete = "complete"
    failed = "failed"

class AuditRun(Base):
    __tablename__ = "audit_runs"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    dataset_id = Column(String, nullable=False)
    created_by = Column(String, nullable=False)  # user ID
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    status = Column(Enum(AuditStatus), default=AuditStatus.queued)
    fairness_score = Column(Integer, nullable=True)
    metrics = Column(JSON, nullable=True)  # full metric breakdown
    proxy_features = Column(JSON, nullable=True)
    mitigation_applied = Column(String, nullable=True)
```

### MongoDB — audit trail document structure

```python
# Each document in the audit_trail collection
{
    "_id": ObjectId,
    "timestamp": "2026-04-11T14:32:00Z",  # ISO 8601
    "actor_id": "user_abc123",
    "actor_role": "analyst",
    "action": "mitigation_applied",        # enum of action types
    "entity_type": "audit_run",
    "entity_id": "audit-uuid-here",
    "payload": {                           # action-specific data
        "technique": "reweighting",
        "fairness_score_before": 47,
        "fairness_score_after": 82
    },
    "sha256": "a3f9...b812",               # hash of this entry's content
    "prev_sha256": "f71c...9a3e"           # hash of previous entry (chain)
}
```

### Generating the hash chain entry

```python
import hashlib, json
from datetime import datetime, timezone

def create_audit_log_entry(
    actor_id: str,
    actor_role: str,
    action: str,
    entity_type: str,
    entity_id: str,
    payload: dict,
    prev_hash: str
) -> dict:
    entry = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "actor_id": actor_id,
        "actor_role": actor_role,
        "action": action,
        "entity_type": entity_type,
        "entity_id": entity_id,
        "payload": payload,
        "prev_sha256": prev_hash,
    }
    content = json.dumps(entry, sort_keys=True)
    entry["sha256"] = hashlib.sha256(content.encode()).hexdigest()
    return entry
```

---

## 6. Async Task Skills — Celery

### Task definition

```python
# backend/app/tasks/audit_tasks.py
from celery import Celery
from app.services.bias_engine import run_full_audit_pipeline
from app.db.session import SessionLocal

celery = Celery("equitylens", broker="redis://localhost:6379/0")

@celery.task(bind=True, max_retries=2, soft_time_limit=300)
def run_audit_task(self, audit_id: str, dataset_path: str, config: dict):
    try:
        db = SessionLocal()
        run_full_audit_pipeline(audit_id, dataset_path, config, db)
    except Exception as exc:
        self.retry(exc=exc, countdown=30)
    finally:
        db.close()
```

### Queuing from a router

```python
from app.tasks.audit_tasks import run_audit_task

@router.post("/run")
async def trigger_audit(request: AuditRequest, ...):
    audit_id = str(uuid.uuid4())
    # Save audit record with status=queued
    await save_audit_record(audit_id, request)
    # Queue the task
    run_audit_task.delay(audit_id, dataset_path, request.dict())
    return {"audit_id": audit_id, "status": "queued"}
```

---

## 7. Authentication & Authorization

### Role-based dependency

```python
# backend/app/utils/auth.py
from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer
import firebase_admin.auth as firebase_auth

security = HTTPBearer()

async def get_current_user(token=Depends(security)):
    try:
        decoded = firebase_auth.verify_id_token(token.credentials)
        return decoded
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

def require_role(allowed_roles: list[str]):
    async def checker(user=Depends(get_current_user)):
        role = user.get("role", "public")
        if role not in allowed_roles:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        return user
    return checker
```

### Role assignment

Roles are stored as custom claims in Firebase Auth. Set via Admin SDK when a user is created or updated:

```python
firebase_admin.auth.set_custom_user_claims(uid, {"role": "analyst"})
```

Valid roles: `"admin"`, `"analyst"`, `"public"`.

The affected person portal endpoints use no auth (`public` role, no token required).

---

## 8. Compliance & Audit Trail Skills

### Regulation mapping table structure

The regulation mapper is a JSON configuration file, not hardcoded logic:

```json
// backend/app/data/regulations.json
[
  {
    "id": "eu_ai_act_art10",
    "name": "EU AI Act — Article 10",
    "jurisdiction": "EU",
    "domains": ["hiring", "lending", "healthcare"],
    "checks": [
      {
        "metric": "demographic_parity_ratio",
        "operator": ">=",
        "threshold": 0.80,
        "severity": "breach"
      },
      {
        "metric": "fairness_score",
        "operator": ">=",
        "threshold": 70,
        "severity": "review"
      }
    ]
  },
  {
    "id": "eeoc_4_5ths",
    "name": "EEOC 4/5ths Rule",
    "jurisdiction": "US",
    "domains": ["hiring"],
    "checks": [
      {
        "metric": "disparate_impact",
        "operator": ">=",
        "threshold": 0.80,
        "severity": "breach"
      }
    ]
  }
]
```

### Running the mapper

```python
import json

def map_to_regulations(
    metrics: dict,
    domain: str,
    jurisdiction: str
) -> list[dict]:
    with open("app/data/regulations.json") as f:
        regulations = json.load(f)

    results = []
    for reg in regulations:
        if domain not in reg["domains"]:
            continue
        if reg["jurisdiction"] not in [jurisdiction, "global"]:
            continue
        status = "compliant"
        for check in reg["checks"]:
            value = metrics.get(check["metric"], None)
            if value is None:
                continue
            ops = {">=": lambda a, b: a >= b, "<=": lambda a, b: a <= b}
            if not ops[check["operator"]](value, check["threshold"]):
                status = check["severity"]
                break
        results.append({"regulation": reg["name"], "status": status})

    return results
```

---

## 9. Testing Patterns

### Backend — pytest

```python
# backend/tests/test_bias_engine.py
import pytest
import pandas as pd
from app.services.bias_engine import compute_demographic_parity

@pytest.fixture
def biased_dataset():
    return pd.DataFrame({
        "income": [50, 60, 70, 40, 55, 65],
        "gender": [1, 1, 1, 0, 0, 0],   # 1=male, 0=female
        "approved": [1, 1, 1, 0, 0, 1]  # males approved more
    })

@pytest.mark.asyncio
async def test_demographic_parity_detects_bias(biased_dataset):
    result = await compute_demographic_parity(
        biased_dataset, label_col="approved", protected_attr="gender"
    )
    assert result["flagged"] is True
    assert result["demographic_parity_difference"] > 0.10

@pytest.mark.asyncio
async def test_fairness_score_range():
    # Score must always be 0–100
    from app.services.bias_engine import compute_fairness_score
    score = compute_fairness_score(0.5, 0.6, 0.55, proxy_count=3, worst_intersectional_disparity=0.3)
    assert 0 <= score <= 100
```

### Frontend — Vitest

```js
// frontend/src/components/shared/FairnessScore.test.jsx
import { render, screen } from "@testing-library/react";
import { FairnessScore } from "./FairnessScore";

test("shows Pass for score >= 80", () => {
    render(<FairnessScore score={85} />);
    expect(screen.getByText(/Pass/)).toBeInTheDocument();
});

test("shows High risk for score < 60", () => {
    render(<FairnessScore score={45} />);
    expect(screen.getByText(/High risk/)).toBeInTheDocument();
});
```

---

## 10. Code Style & Conventions

### Python
- Formatter: **Black** (`line-length = 88`)
- Linter: **Ruff**
- Type hints: required on all function signatures
- Docstrings: required on all service functions (Google style)
- Imports: stdlib → third-party → local, separated by blank lines
- No `print()` in production code — use `logging.getLogger(__name__)`

### JavaScript / React
- Formatter: **Prettier** (defaults)
- Linter: **ESLint** with React plugin
- Variable names: camelCase. Component names: PascalCase. Constants: UPPER_SNAKE_CASE.
- No `console.log` in production code
- All API calls wrapped in try/catch with user-visible error state

### Git conventions
- Branch naming: `feature/`, `fix/`, `chore/`, `docs/`
- Commit style: [Conventional Commits](https://www.conventionalcommits.org/) — `feat:`, `fix:`, `docs:`, `test:`, `refactor:`
- PRs require at least one review before merge
- Never commit `.env` files — use `.env.example` with placeholder values

### Sensitive data rules
- Never log PII (names, addresses, income values, decision outcomes tied to individuals)
- Portal queries are always stateless — never persist portal input to any database
- Protected attribute columns must be masked in logs: `"gender": "[PROTECTED]"`
- Any new regulation added to `regulations.json` requires a PR review from the compliance lead

---

*Last updated: April 2026. Questions? Open an issue tagged `docs`.*

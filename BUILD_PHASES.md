# EquityLens Build Phases — Complete Roadmap

> A structured phase-by-phase plan to build EquityLens frontend and backend end-to-end over 4-6 weeks.

---

## Phase Overview

| Phase | Focus | Duration | Backend | Frontend |
|-------|-------|----------|---------|----------|
| **1** | Data Ingestion | 3-4 days | FastAPI app, models, DB setup | Upload page, file parsing |
| **2** | Bias Detection Engine | 5-6 days | AIF360 integration, async tasks | Analysis dashboard |
| **3** | Intelligence Layer | 4-5 days | SHAP, DoWhy, intersectionality | Detailed metric views |
| **4** | Decision Layer | 4-5 days | Fairness Score, mitigation | Decision panel, what-if basics |
| **5** | Simulator | 5-6 days | DiCE-ML, scenario modeling | Interactive simulator UI |
| **6** | Trust Layer | 4-5 days | Portal, appeals workflow | Public portal, appeal form |
| **7** | Governance | 4-5 days | Audit trail, compliance layer | Committee workflow UI |
| **8** | Transparency | 3-4 days | Report generation, model cards | PDF exports, public pages |

**Total: 32-40 days of development (4-5 weeks at 8 hrs/day)**

---

## Phase 1: Data Ingestion & Core Setup

### Goals
- Scaffold FastAPI backend with PostgreSQL
- Build data models for datasets and audit runs
- Implement CSV upload endpoint
- Create Upload page in frontend
- Test end-to-end data flow

### Backend Tasks

#### 1.1 Project Structure
```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py                 # FastAPI app, route registration
│   ├── config.py               # env vars, DB connection
│   ├── db/
│   │   ├── __init__.py
│   │   ├── session.py          # SQLAlchemy session management
│   │   └── models.py           # All SQLAlchemy models
│   ├── models/                 # Pydantic request/response models
│   │   ├── __init__.py
│   │   ├── dataset.py
│   │   └── audit.py
│   ├── routers/
│   │   ├── __init__.py
│   │   ├── datasets.py         # /api/datasets/* endpoints
│   │   └── audit.py            # /api/audit/* endpoints
│   ├── services/
│   │   ├── __init__.py
│   │   ├── dataset_service.py  # Data validation, storage
│   │   └── bias_engine.py      # ML logic (imports AIF360, SHAP, etc.)
│   ├── utils/
│   │   ├── __init__.py
│   │   └── auth.py             # Firebase auth (stub for now)
│   └── tasks/
│       ├── __init__.py
│       └── audit_tasks.py      # Celery tasks
├── tests/
│   ├── __init__.py
│   ├── conftest.py
│   └── test_bias_engine.py
├── .env.example
├── requirements.txt
├── pyproject.toml
└── README.md
```

#### 1.2 Installation & Dependencies
```bash
# Create backend venv
python -m venv venv
source venv/Scripts/activate  # Windows: venv\Scripts\activate

# requirements.txt
fastapi==0.104.1
uvicorn==0.24.0
sqlalchemy==2.0.23
psycopg2-binary==2.9.9
pydantic==2.5.0
pandas==2.1.3
numpy==1.26.2
aif360==0.5.0
scikit-learn==1.3.2
shap==0.43.0
celery==5.3.4
redis==5.0.1
python-dotenv==1.0.0
```

#### 1.3 Database Models
Create `backend/app/db/models.py`:

```python
from sqlalchemy import Column, String, Float, Integer, JSON, DateTime, Enum, LargeBinary, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime, timezone
import uuid
import enum

Base = declarative_base()

class Dataset(Base):
    __tablename__ = "datasets"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, nullable=False)
    uploaded_by = Column(String, nullable=False)
    uploaded_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    file_path = Column(String, nullable=False)
    row_count = Column(Integer)
    column_count = Column(Integer)
    schema = Column(JSON)  # {"column1": "int", "column2": "string"}
    detected_protected_attrs = Column(JSON)  # ["gender", "race"]
    
class AuditStatus(enum.Enum):
    queued = "queued"
    running = "running"
    complete = "complete"
    failed = "failed"

class AuditRun(Base):
    __tablename__ = "audit_runs"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    dataset_id = Column(String, ForeignKey("datasets.id"), nullable=False)
    created_by = Column(String, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    status = Column(Enum(AuditStatus), default=AuditStatus.queued)
    label_column = Column(String)
    protected_attributes = Column(JSON)  # ["gender", "race"]
    domain = Column(String)  # "hiring", "lending", "healthcare"
    
    # Results
    fairness_score = Column(Integer, nullable=True)
    metrics = Column(JSON, nullable=True)
    proxy_features = Column(JSON, nullable=True)
    intersectional_results = Column(JSON, nullable=True)
    error_message = Column(String, nullable=True)
```

#### 1.4 Pydantic Models
Create `backend/app/models/dataset.py`:

```python
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

class DatasetUploadRequest(BaseModel):
    name: str
    label_column: str
    protected_attributes: List[str]

class DatasetResponse(BaseModel):
    id: str
    name: str
    row_count: int
    column_count: int
    schema: dict
    uploaded_at: datetime
    
    class Config:
        from_attributes = True
```

#### 1.5 FastAPI Router
Create `backend/app/routers/datasets.py`:

```python
from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from app.models.dataset import DatasetUploadRequest, DatasetResponse
from app.services.dataset_service import save_dataset, parse_csv
import os

router = APIRouter(prefix="/api/datasets", tags=["datasets"])

@router.post("/upload", response_model=DatasetResponse)
async def upload_dataset(file: UploadFile = File(...), request: DatasetUploadRequest = Depends()):
    if file.content_type not in ["text/csv", "application/vnd.ms-excel"]:
        raise HTTPException(status_code=400, detail="Only CSV files allowed")
    
    contents = await file.read()
    df = parse_csv(contents)
    
    dataset = await save_dataset(df, request, file.filename)
    return dataset

@router.get("/{dataset_id}", response_model=DatasetResponse)
async def get_dataset(dataset_id: str):
    # Implementation
    pass
```

### Frontend Tasks

#### 1.6 UploadPage Component
Create `src/pages/UploadPage.tsx`:

```tsx
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";

export function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [labelColumn, setLabelColumn] = useState("");
  const [protectedAttrs, setProtectedAttrs] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleUpload = async () => {
    if (!file) return;
    
    setLoading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("name", file.name);
    formData.append("label_column", labelColumn);
    formData.append("protected_attributes", JSON.stringify(protectedAttrs));

    try {
      const response = await fetch("/api/datasets/upload", {
        method: "POST",
        body: formData,
      });
      if (!response.ok) throw new Error("Upload failed");
      const data = await response.json();
      // Redirect to analysis or show success
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      <Card className="max-w-2xl mx-auto">
        <div className="p-8">
          <h1 className="text-3xl font-bold mb-6">Upload Dataset</h1>
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded flex gap-2">
              <AlertCircle className="text-red-600" />
              <span>{error}</span>
            </div>
          )}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">CSV File</label>
              <Input type="file" accept=".csv" onChange={(e) => setFile(e.target.files?.[0] || null)} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Label Column</label>
              <Input 
                placeholder="e.g., approved, hired, admitted"
                value={labelColumn}
                onChange={(e) => setLabelColumn(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Protected Attributes (comma-separated)</label>
              <Input 
                placeholder="e.g., gender,race,age"
                onChange={(e) => setProtectedAttrs(e.target.value.split(",").map(s => s.trim()))}
              />
            </div>
            <Button onClick={handleUpload} disabled={!file || loading} className="w-full">
              {loading ? "Uploading..." : "Upload & Analyze"}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
```

#### 1.7 Store Setup
Create `src/lib/store.ts` (using Zustand):

```ts
import { create } from "zustand";

interface Dataset {
  id: string;
  name: string;
  rowCount: number;
  columnCount: number;
  schema: Record<string, string>;
  uploadedAt: string;
}

interface Store {
  currentDataset: Dataset | null;
  setCurrentDataset: (dataset: Dataset) => void;
  datasets: Dataset[];
  addDataset: (dataset: Dataset) => void;
}

export const useStore = create<Store>((set) => ({
  currentDataset: null,
  setCurrentDataset: (dataset) => set({ currentDataset: dataset }),
  datasets: [],
  addDataset: (dataset) => set((state) => ({ datasets: [dataset, ...state.datasets] })),
}));
```

### Testing
- Test CSV parsing with 100, 10k, 100k row files
- Verify schema detection (int, string, float, bool types)
- Test protected attribute detection
- E2E: upload → DB save → retrieve → list

---

## Phase 2: Bias Detection Engine

### Goals
- Implement AIF360 + Fairlearn integration
- Compute demographic parity, equal opportunity, disparate impact
- Set up Celery async task queue
- Display results on Analysis Dashboard in real-time
- Validate results with test datasets

### Backend Tasks

#### 2.1 Bias Engine Service
Create `backend/app/services/bias_engine.py`:

```python
import pandas as pd
import numpy as np
from aif360.datasets import BinaryLabelDataset
from aif360.metrics import BinaryLabelDatasetMetric
from fairlearn.metrics import demographic_parity_ratio, equalized_odds_ratio

async def compute_core_metrics(
    df: pd.DataFrame,
    label_col: str,
    protected_attr: str,
    privileged_val: int = 1
) -> dict:
    """
    Returns demographic parity, equal opportunity, disparate impact.
    """
    # Prepare AIF360 dataset
    dataset = BinaryLabelDataset(
        df=df,
        label_names=[label_col],
        protected_attribute_names=[protected_attr]
    )
    
    # Compute metrics
    metric = BinaryLabelDatasetMetric(
        dataset,
        privileged_groups=[{protected_attr: privileged_val}],
        unprivileged_groups=[{protected_attr: 0}]
    )
    
    return {
        "demographic_parity_difference": metric.mean_difference(),
        "demographic_parity_ratio": metric.disparate_impact(),
        "equal_opportunity_difference": metric.equal_opportunity_difference(),
        "flagged": abs(metric.mean_difference()) > 0.10
    }

async def run_full_audit_pipeline(
    audit_id: str,
    dataset_id: str,
    label_col: str,
    protected_attrs: list[str],
    domain: str,
    db_session
) -> dict:
    """
    Main async audit function. Runs all bias detection steps.
    """
    from app.db.session import get_db
    
    # Load dataset
    df = load_dataset_from_id(dataset_id, db_session)
    
    results = {
        "audit_id": audit_id,
        "metrics": {},
        "proxy_features": [],
        "intersectional_results": []
    }
    
    # Run metrics for each protected attribute
    for attr in protected_attrs:
        metrics = await compute_core_metrics(df, label_col, attr)
        results["metrics"][attr] = metrics
    
    # Save results
    update_audit_run(audit_id, results, db_session)
    
    return results
```

#### 2.2 Celery Task
Create `backend/app/tasks/audit_tasks.py`:

```python
from celery import Celery
from app.services.bias_engine import run_full_audit_pipeline
from app.db.session import SessionLocal
import os

celery = Celery(
    "equitylens",
    broker=os.getenv("REDIS_URL", "redis://localhost:6379/0"),
    backend=os.getenv("REDIS_URL", "redis://localhost:6379/0")
)

@celery.task(bind=True, max_retries=2)
def run_audit_task(self, audit_id: str, dataset_id: str, label_col: str, 
                   protected_attrs: list, domain: str):
    try:
        db = SessionLocal()
        result = run_full_audit_pipeline(
            audit_id, dataset_id, label_col, protected_attrs, domain, db
        )
        return result
    except Exception as exc:
        self.retry(exc=exc, countdown=30)
    finally:
        db.close()
```

#### 2.3 Audit Router
Create `backend/app/routers/audit.py`:

```python
from fastapi import APIRouter, Depends, BackgroundTasks, HTTPException
from app.models.audit import AuditRequest, AuditResponse
from app.tasks.audit_tasks import run_audit_task
from app.db.session import get_db
import uuid

router = APIRouter(prefix="/api/audit", tags=["audit"])

@router.post("/run", response_model=AuditResponse)
async def trigger_audit(request: AuditRequest, db=Depends(get_db)):
    audit_id = str(uuid.uuid4())
    
    # Save audit record with status=queued
    audit = save_audit_record(audit_id, request, db)
    
    # Queue the async task
    run_audit_task.delay(
        audit_id, request.dataset_id, request.label_column,
        request.protected_attributes, request.domain
    )
    
    return AuditResponse(
        audit_id=audit_id,
        status="queued",
        created_at=audit.created_at,
        metrics=None
    )

@router.get("/{audit_id}", response_model=AuditResponse)
async def get_audit_result(audit_id: str, db=Depends(get_db)):
    audit = db.query(AuditRun).filter(AuditRun.id == audit_id).first()
    if not audit:
        raise HTTPException(status_code=404, detail="Audit not found")
    
    return AuditResponse(
        audit_id=audit.id,
        status=audit.status,
        created_at=audit.created_at,
        metrics=audit.metrics
    )
```

### Frontend Tasks

#### 2.4 Analysis Dashboard
Create `src/pages/AnalysisPage.tsx`:

```tsx
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";

interface Metrics {
  demographic_parity_difference: number;
  disparate_impact: number;
  equal_opportunity_difference: number;
  flagged: boolean;
}

export function AnalysisPage() {
  const [auditId, setAuditId] = useState("");
  const [metrics, setMetrics] = useState<Record<string, Metrics>>({});
  const [status, setStatus] = useState("queued");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const id = params.get("audit_id");
    if (id) setAuditId(id);
  }, []);

  useEffect(() => {
    if (!auditId) return;
    
    const poll = setInterval(async () => {
      const res = await fetch(`/api/audit/${auditId}`);
      const data = await res.json();
      setStatus(data.status);
      setMetrics(data.metrics || {});
      
      if (data.status === "complete" || data.status === "failed") {
        clearInterval(poll);
        setLoading(false);
      }
    }, 2000);
    
    return () => clearInterval(poll);
  }, [auditId]);

  if (loading && status === "queued") {
    return <div className="p-8"><Spinner /> Running bias audit...</div>;
  }

  return (
    <div className="p-8 space-y-6">
      <h1 className="text-3xl font-bold">Audit Results</h1>
      
      {Object.entries(metrics).map(([attr, m]) => (
        <Card key={attr} className="p-6">
          <h2 className="text-xl font-semibold mb-4">{attr}</h2>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-600">Demographic Parity</p>
              <p className="text-2xl font-bold">{m.demographic_parity_difference.toFixed(3)}</p>
              {m.demographic_parity_difference > 0.10 && (
                <Badge className="bg-red-100 text-red-800 mt-2">Flagged</Badge>
              )}
            </div>
            <div>
              <p className="text-sm text-gray-600">Disparate Impact</p>
              <p className="text-2xl font-bold">{m.disparate_impact.toFixed(3)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Equal Opportunity</p>
              <p className="text-2xl font-bold">{m.equal_opportunity_difference.toFixed(3)}</p>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
```

---

## Phases 3–8 Summary

### **Phase 3: Intelligence Layer** (SHAP, DoWhy, Intersectionality)
- Implement SHAP proxy detection
- Add intersectional bias computation
- Integrate DoWhy for causal fairness
- Display detailed proxy/causal findings

### **Phase 4: Decision Layer** (Fairness Score + Mitigation)
- Compute weighted Fairness Score (0–100)
- Implement three mitigation techniques (reweighting, feature removal, adversarial)
- Build before/after comparison UI
- Add approval workflow

### **Phase 5: Simulator Engine** (Counterfactuals + What-If)
- Integrate DiCE-ML for counterfactuals
- Implement scenario modeling
- Build interactive simulator UI with drag-and-drop feature changes

### **Phase 6: Trust Layer** (Portal + Appeals)
- Build public-facing Affected Person Portal (stateless)
- Implement appeals workflow (4-step process)
- Email notifications for appeals

### **Phase 7: Governance** (Audit Trail + Compliance)
- Implement SHA-256 hash-chained audit trail (MongoDB)
- Build regulation mapper
- Create Fairness Committee approval workflow UI

### **Phase 8: Transparency** (Reports + Public Pages)
- Generate PDF audit reports (WeasyPrint)
- Create Bias Nutrition Label component
- Build public Model Card page
- Export dashboard data to CSV

---

## Development Checklist

- [ ] Backend: Create project scaffold with all directories
- [ ] Backend: Install dependencies
- [ ] Backend: Set up PostgreSQL and verify connection
- [ ] Backend: Set up Redis and verify Celery
- [ ] Frontend: Update routing to include all pages
- [ ] Frontend: Hook up API client
- [ ] Frontend: Connect Upload flow end-to-end
- [ ] Frontend: Test real data upload and metric display
- [ ] Backend: Add auth stubs (Firebase Auth)
- [ ] Backend: Add logging setup
- [ ] Add CI/CD (GitHub Actions or similar)
- [ ] Add Docker Compose for local dev (PostgreSQL + Redis)

---

## Key Files to Create

**Backend:**
- ✅ `backend/app/main.py`
- ✅ `backend/app/db/models.py`
- ✅ `backend/app/db/session.py`
- ✅ `backend/app/models/dataset.py`, `audit.py`
- ✅ `backend/app/routers/datasets.py`, `audit.py`
- ✅ `backend/app/services/dataset_service.py`, `bias_engine.py`
- ✅ `backend/app/tasks/audit_tasks.py`
- ✅ `backend/requirements.txt`
- ✅ `.env.example`

**Frontend:**
- ✅ Connect `src/pages/UploadPage.tsx` to router
- ✅ Connect `src/pages/AnalysisPage.tsx` to router
- ✅ Update `src/lib/store.ts` for state management
- ✅ Create `src/api/client.ts` for API calls

---

## Starting Point

**Week 1: Phase 1 + early Phase 2**
- Day 1-2: Backend scaffold, DB setup, CSV upload endpoint
- Day 3-4: Frontend Upload page, API integration
- Day 5-6: AIF360 integration, basic metric computation
- **Goal:** Upload CSV → see bias metrics (3 core metrics)

**Week 2: Phase 2 complete + Phase 3 start**
- Celery async tasks, polling UI
- SHAP proxy detection
- Deep-dive visualization

Continue this weekly progression through Phase 8.

---

*Next step: Start Phase 1. I'll help you scaffold the backend and build out the upload flow.*

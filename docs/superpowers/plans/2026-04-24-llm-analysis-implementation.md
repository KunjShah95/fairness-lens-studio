# Phase 2: LLM Analysis Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development

**Goal:** Add document-based compliance checking, automated report generation, natural language dataset queries.

**Architecture:** Use LLM for policy parsing, report generation, NL-to-SQL.

**Tech Stack:** FastAPI, LLM integration, SQL parsing

---

### Task 1: Compliance Checker Router

**Files:**
- Create: `backend/app/routers/compliance.py`

- [ ] **Step 1: Create compliance router**

```python
# backend/app/routers/compliance.py
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Dict, Any, List, Optional
import logging

router = APIRouter(prefix="/ai/compliance", tags=["compliance"])
logger = logging.getLogger(__name__)

class ComplianceCheckRequest(BaseModel):
    policy_document: str
    audit_results: Dict[str, Any]
    compliance_framework: str = "eu_ai_act"  # eu_ai_act, nist, iso

class ComplianceViolation(BaseModel):
    requirement: str
    severity: str
    description: str
    recommendation: str

class ComplianceCheckResponse(BaseModel):
    compliance_score: float
    passed: bool
    violations: List[ComplianceViolation]
    framework: str

FRAMEWORK_REQUIREMENTS = {
    "eu_ai_act": [
        "Data governance and quality",
        "Transparency and explainability", 
        "Human oversight",
        "Accuracy and robustness",
        "Risk management"
    ],
    "nist": [
        "Govern",
        "Map",
        "Measure",
        "Manage"
    ],
    "iso": [
        "Context of organization",
        "Leadership",
        "Planning",
        "Support",
        "Operation"
    ]
}

@router.post("/check", response_model=ComplianceCheckResponse)
async def check_compliance(request: ComplianceCheckRequest):
    """Check audit results against policy requirements."""
    try:
        from app.services.unified_gateway import unified_gateway
        
        # Build prompt for compliance analysis
        prompt = f"""Analyze these audit results against {request.compliance_framework} requirements.

Requirements: {', '.join(FRAMEWORK_REQUIREMENTS.get(request.compliance_framework, []))}

Audit Results:
{request.audit_results}

For each requirement, determine:
1. Is it met? (yes/no/partial)
2. What is the severity if not met? (critical/high/medium/low)
3. What needs to be fixed?

Respond in JSON format:
{{"violations": [{{"requirement": "...", "severity": "...", "description": "...", "recommendation": "..."}}]}}
"""
        
        messages = [
            {"role": "system", "content": "You are a compliance expert. Respond in JSON only."},
            {"role": "user", "content": prompt}
        ]
        
        result = await unified_gateway.chat(messages, model="gpt-4o")
        
        # Parse JSON response
        import json
        try:
            data = json.loads(result)
        except:
            data = {"violations": []}
        
        violations = data.get("violations", [])
        passed = len([v for v in violations if v.get("severity") in ["critical", "high"]]) == 0
        score = max(0, 100 - len(violations) * 10)
        
        return ComplianceCheckResponse(
            compliance_score=score,
            passed=passed,
            violations=violations,
            framework=request.compliance_framework
        )
        
    except Exception as e:
        logger.error(f"Compliance check error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/frameworks")
async def list_frameworks():
    """List available compliance frameworks."""
    return {"frameworks": list(FRAMEWORK_REQUIREMENTS.keys())}
```

- [ ] **Step 2: Commit**

```bash
git add backend/app/routers/compliance.py
git commit -m "feat: add compliance checker endpoint"
```

---

### Task 2: Report Generator Router

**Files:**
- Create: `backend/app/routers/report_gen.py`

- [ ] **Step 1: Create report generator**

```python
# backend/app/routers/report_gen.py
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Dict, Any, Optional

router = APIRouter(prefix="/ai/reports", tags=["reports"])
import logging
logger = logging.getLogger(__name__)

class ReportRequest(BaseModel):
    audit_results: Dict[str, Any]
    format: str = "executive"  # executive, technical, regulatory
    include_charts: bool = True
    title: Optional[str] = "Fairness Audit Report"

class ReportResponse(BaseModel):
    title: str
    summary: str
    sections: Dict[str, str]
    recommendations: list

@router.post("/generate", response_model=ReportResponse)
async def generate_report(request: ReportRequest):
    """Generate AI-powered fairness report."""
    try:
        from app.services.unified_gateway import unified_gateway
        
        # Format-specific prompts
        format_prompts = {
            "executive": "Generate a 1-page executive summary for business stakeholders. Focus on high-level findings, risk level, and top 3 actions.",
            "technical": "Generate a detailed technical report for engineers. Include methodology, metrics, code examples, and specific findings.",
            "regulatory": "Generate a regulatory compliance report. Map findings to specific regulations, include required disclosures."
        }
        
        prompt = f"""{format_prompts.get(request.format, format_prompts['executive'])}

Audit Data:
{request.audit_results}

Structure your response as:
{{"title": "...", "summary": "...", "sections": {{...}}, "recommendations": [...]}}
"""
        
        messages = [
            {"role": "system", "content": "You are an expert technical writer. Generate structured reports in JSON."},
            {"role": "user", "content": prompt}
        ]
        
        result = await unified_gateway.chat(messages, model="gpt-4o")
        
        import json
        try:
            data = json.loads(result)
        except:
            data = {"title": request.title, "summary": result, "sections": {}, "recommendations": []}
        
        return ReportResponse(
            title=data.get("title", request.title),
            summary=data.get("summary", ""),
            sections=data.get("sections", {}),
            recommendations=data.get("recommendations", [])
        )
        
    except Exception as e:
        logger.error(f"Report generation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
```

- [ ] **Step 2: Commit**

```bash
git add backend/app/routers/report_gen.py
git commit -m "feat: add report generator endpoint"
```

---

### Task 3: Natural Language Query

**Files:**
- Create: `backend/app/routers/nl_query.py`

- [ ] **Step 1: Create NL query router**

```python
# backend/app/routers/nl_query.py
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Dict, Any, Optional

router = APIRouter(prefix="/ai/query", tags=["nl-query"])
import logging
logger = logging.getLogger(__name__)

class NLQueryRequest(BaseModel):
    question: str
    dataset_id: Optional[str] = None

class NLQueryResponse(BaseModel):
    question: str
    answer: str
    sql_query: Optional[str] = None
    confidence: float = 1.0

@router.post("/dataset", response_model=NLQueryResponse)
async def query_dataset(request: NLQueryRequest):
    """Ask questions about your dataset in natural language."""
    try:
        from app.services.unified_gateway import unified_gateway
        
        prompt = f"""You are a data analyst. Answer this question about the dataset:

Question: {request.question}

Based on the question, generate:
1. A SQL query to answer it (if applicable)
2. The answer based on typical fairness analysis
3. Your confidence level

Respond in JSON:
{{"sql_query": "...", "answer": "...", "confidence": 0.0-1.0}}
"""
        
        messages = [
            {"role": "system", "content": "You are SQL and data analysis expert. Respond in JSON only."},
            {"role": "user", "content": prompt}
        ]
        
        result = await unified_gateway.chat(messages, model="gpt-4o")
        
        import json
        try:
            data = json.loads(result)
        except:
            data = {"sql_query": None, "answer": result, "confidence": 0.5}
        
        return NLQueryResponse(
            question=request.question,
            answer=data.get("answer", result),
            sql_query=data.get("sql_query"),
            confidence=data.get("confidence", 0.8)
        )
        
    except Exception as e:
        logger.error(f"NL Query error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
```

- [ ] **Step 2: Commit**

```bash
git add backend/app/routers/nl_query.py
git commit -m "feat: add natural language query endpoint"
```

---

### Task 4: Register Routers in Main

**Files:**
- Modify: `backend/app/main.py`

- [ ] **Step 1: Add router imports and register**

```python
from app.routers import compliance, report_gen, nl_query

# Add to router registration
app.include_router(compliance.router)
app.include_router(report_gen.router)
app.include_router(nl_query.router)
```

- [ ] **Step 2: Commit**

```bash
git add backend/app/main.py
git commit -m "feat: register Phase 2 routers"
```

---

## Summary

| Task | Component | Status |
|------|-----------|--------|
| 1 | Compliance Checker | Pending |
| 2 | Report Generator | Pending |
| 3 | NL Query | Pending |
| 4 | Router Registration | Pending |

---

**Plan complete.**
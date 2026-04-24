# Phase 2: LLM Analysis Specification

**Date:** 2026-04-24  
**Status:** Approved  
**Prerequisite:** Multi-Model Hub

---

## Overview

Use LLM capabilities for advanced analysis: document-based compliance checking, automated report generation, natural language dataset queries.

---

## Features

### 1. Document-Based Policy Compliance

**Input:** Policy document (PDF/markdown) + dataset/audit results  
**Output:** Compliance score + specific violations

```python
@router.post("/ai/compliance/check")
async def check_compliance(
    policy_document: str,
    audit_results: Dict,
    compliance_framework: str = "eu_ai_act"  # or nist, iso
):
    """
    Check audit results against policy requirements.
    Uses LLM to understand policy and identify gaps.
    """
```

### 2. Automated Report Generation

```python
@router.post("/ai/reports/generate")
async def generate_report(
    audit_results: Dict,
    format: str = "executive",  # executive, technical, regulatory
    include_charts: bool = True
):
    """
    Generate AI-powered fairness reports.
    Natural language summaries + actionable insights.
    """
```

### 3. Natural Language Dataset Queries

```python
@router.post("/ai/query/dataset")
async def query_dataset(
    question: str,
    dataset_id: str,
    # "What's the bias trend for group A over time?"
):
    """
    Ask questions about your dataset in plain English.
    LLM generates SQL + executes + explains results.
    """
```

---

## Endpoints

| Endpoint | Purpose |
|---------|---------|
| `POST /ai/compliance/check` | Policy compliance analysis |
| `POST /ai/reports/generate` | Auto-generate reports |
| `POST /ai/query/dataset` | NL queries on datasets |
| `POST /ai/analyze/document` | Analyze uploaded documents |

---

## Compliance Frameworks Supported

- EU AI Act
- NIST AI RMF  
- ISO 42001
- EEOC Guidelines
- GDPR (fairness articles)

---

## Files to Create

| File | Purpose |
|------|---------|
| `app/routers/compliance.py` | Compliance checker |
| `app/routers/report_gen.py` | Report generator |
| `app/routers/nl_query.py` | Natural language queries |
| `app/services/compliance_engine.py` | Policy parsing + checking |
| `app/services/report_generator.py` | Report templates |
| `app/services/nl_sql.py` | NL to SQL converter |

---

## Integration

- Uses UnifiedAIGateway from Multi-Model Hub
- Falls back to rule-based if LLM unavailable
- Caches compliance checks (1 day TTL)
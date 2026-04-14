"""Demo and health check endpoints for system validation."""

import logging
from fastapi import APIRouter
from datetime import datetime

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/demo", tags=["demo"])


@router.get("/health")
async def health_check():
    """
    System health check - verify backend is running.
    
    Returns:
        Status and version info
    """
    return {
        "status": "healthy",
        "service": "EquityLens",
        "version": "0.1.0",
        "timestamp": datetime.utcnow().isoformat(),
        "endpoints": {
            "datasets": "POST /api/datasets/upload",
            "audit": "POST /api/audit/run",
            "reports": "GET /api/reports/audit-report/{audit_id}",
            "portal": "POST /api/portal/explain",
            "appeals": "POST /api/portal/appeal"
        }
    }


@router.get("/sample-audit")
async def get_sample_audit():
    """
    Get sample audit data for testing frontend.
    
    Returns:
        Mock audit result with realistic sample data
    """
    return {
        "id": "audit-sample-001",
        "dataset_id": "dataset-sample-001",
        "status": "completed",
        "fairness_score": 68,
        "protected_attributes": ["gender", "age_group"],
        "created_at": "2026-04-12T10:30:00",
        "metrics": {
            "gender": {
                "demographic_parity_difference": -0.15,
                "demographic_parity_ratio": 0.78,
                "equal_opportunity_difference": -0.12,
                "equal_opportunity_ratio": 0.82,
                "flagged": True
            },
            "age_group": {
                "demographic_parity_difference": 0.08,
                "demographic_parity_ratio": 0.95,
                "equal_opportunity_difference": 0.06,
                "equal_opportunity_ratio": 0.97,
                "flagged": False
            }
        },
        "proxy_features": [
            {
                "feature": "zip_code",
                "correlation": 0.67,
                "severity": "HIGH"
            },
            {
                "feature": "insurance_plan_tier",
                "correlation": 0.52,
                "severity": "MEDIUM"
            }
        ],
        "intersectional_results": [
            {
                "group": "Female, 25-34",
                "count": 145,
                "approval_rate": 0.62,
                "disparity": 0.18
            },
            {
                "group": "Male, 25-34",
                "count": 168,
                "approval_rate": 0.80,
                "disparity": 0.0
            },
            {
                "group": "Female, 35-44",
                "count": 132,
                "approval_rate": 0.68,
                "disparity": 0.12
            }
        ],
        "feature_importance": [
            {
                "feature": "age",
                "importance": 0.28
            },
            {
                "feature": "symptom_severity",
                "importance": 0.24
            },
            {
                "feature": "zip_code",
                "importance": 0.18
            },
            {
                "feature": "insurance_plan_tier",
                "importance": 0.14
            },
            {
                "feature": "prior_visit_count",
                "importance": 0.10
            }
        ],
        "causal_analysis": {
            "treatment": "zip_code",
            "outcome": "triage_priority",
            "ate": 0.15,
            "interpretation": "Patients in certain zip codes receive lower triage priority on average"
        }
    }


@router.get("/sample-report")
async def get_sample_report():
    """
    Get sample audit report (HTML).
    
    Returns:
        HTML report for testing report viewer
    """
    html = """
    <html>
        <head>
            <style>
                body {
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                    margin: 0;
                    padding: 20px;
                    background: #f5f5f5;
                    color: #333;
                }
                .container {
                    max-width: 900px;
                    margin: 0 auto;
                    background: white;
                    padding: 30px;
                    border-radius: 8px;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                }
                h1 {
                    color: #0066cc;
                    border-bottom: 3px solid #0066cc;
                    padding-bottom: 10px;
                }
                h2 {
                    color: #333;
                    margin-top: 25px;
                    border-left: 4px solid #0066cc;
                    padding-left: 10px;
                }
                .score-section {
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    padding: 20px;
                    border-radius: 8px;
                    margin: 20px 0;
                    text-align: center;
                }
                .score-value {
                    font-size: 48px;
                    font-weight: bold;
                    margin: 10px 0;
                }
                .score-description {
                    font-size: 18px;
                    opacity: 0.9;
                }
                .metric-grid {
                    display: grid;
                    grid-template-columns: repeat(2, 1fr);
                    gap: 15px;
                    margin: 20px 0;
                }
                .metric-box {
                    background: #f9f9f9;
                    padding: 15px;
                    border-left: 4px solid #f59e0b;
                    border-radius: 4px;
                }
                .metric-label {
                    font-size: 12px;
                    color: #666;
                    text-transform: uppercase;
                    margin-bottom: 8px;
                }
                .metric-value {
                    font-size: 24px;
                    font-weight: bold;
                    color: #f59e0b;
                }
                table {
                    width: 100%;
                    border-collapse: collapse;
                    margin: 20px 0;
                }
                th {
                    background: #f0f0f0;
                    padding: 12px;
                    text-align: left;
                    font-weight: 600;
                    border-bottom: 2px solid #0066cc;
                }
                td {
                    padding: 12px;
                    border-bottom: 1px solid #eee;
                }
                tr:hover {
                    background: #f9f9f9;
                }
                .flag-high {
                    color: #dc2626;
                    font-weight: bold;
                }
                .flag-medium {
                    color: #f59e0b;
                    font-weight: bold;
                }
                .flag-low {
                    color: #10b981;
                    font-weight: bold;
                }
                .recommendation {
                    background: #dcfce7;
                    border-left: 4px solid #10b981;
                    padding: 15px;
                    margin: 15px 0;
                    border-radius: 4px;
                }
                .recommendation.warning {
                    background: #fef3c7;
                    border-left-color: #f59e0b;
                }
                .recommendation.critical {
                    background: #fee2e2;
                    border-left-color: #dc2626;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>🔍 Fairness Audit Report</h1>
                <p><strong>Dataset:</strong> Healthcare Triage Decisions</p>
                <p><strong>Generated:</strong> April 12, 2026</p>

                <div class="score-section">
                    <div class="score-description">Overall Fairness Score</div>
                    <div class="score-value">68/100</div>
                    <div class="score-description">⚠️ FAIR - Review recommended</div>
                </div>

                <h2>Executive Summary</h2>
                <p>
                    This audit evaluated the fairness of a healthcare triage decision model. 
                    The analysis revealed <strong>moderate fairness concerns</strong> related to the protected attribute "zip_code".
                    Significant disparities were found in triage priority, particularly for patients from underserved neighborhoods.
                </p>

                <h2>Key Metrics by Protected Attribute</h2>
                <table>
                    <thead>
                        <tr>
                            <th>Attribute</th>
                            <th>Demographic Parity Diff</th>
                            <th>Equal Opportunity Diff</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>Zip Code</td>
                            <td>-15.0%</td>
                            <td>-12.0%</td>
                            <td><span class="flag-high">⚠️ FLAGGED</span></td>
                        </tr>
                        <tr>
                            <td>Age Group</td>
                            <td>8.0%</td>
                            <td>6.0%</td>
                            <td><span class="flag-low">✓ Fair</span></td>
                        </tr>
                    </tbody>
                </table>

                <h2>Proxy Features Detected</h2>
                <p>
                    The following features may serve as proxies for protected attributes and could amplify bias in care decisions:
                </p>
                <ul>
                    <li><strong>Zip Code</strong> (67% correlation with access) - <span class="flag-high">HIGH</span></li>
                    <li><strong>Insurance Plan Tier</strong> (52% correlation with access) - <span class="flag-medium">MEDIUM</span></li>
                </ul>

                <h2>Intersectional Analysis</h2>
                <p>Care prioritization rates by intersectional groups (worst disparity first):</p>
                <table>
                    <thead>
                        <tr>
                            <th>Group</th>
                            <th>Count</th>
                            <th>Prioritization Rate</th>
                            <th>Disparity</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>Underserved Neighborhood, High Acuity</td>
                            <td>145</td>
                            <td>62%</td>
                            <td><span class="flag-high">-18%</span></td>
                        </tr>
                        <tr>
                            <td>Underserved Neighborhood, Medium Acuity</td>
                            <td>132</td>
                            <td>68%</td>
                            <td><span class="flag-medium">-12%</span></td>
                        </tr>
                        <tr>
                            <td>Control Group, High Acuity</td>
                            <td>168</td>
                            <td>80%</td>
                            <td><span class="flag-low">Baseline</span></td>
                        </tr>
                    </tbody>
                </table>

                <h2>Feature Importance (Top 5)</h2>
                <div class="metric-grid">
                    <div class="metric-box">
                        <div class="metric-label">1. Age</div>
                        <div class="metric-value">28%</div>
                    </div>
                    <div class="metric-box">
                        <div class="metric-label">2. Symptom Severity</div>
                        <div class="metric-value">24%</div>
                    </div>
                    <div class="metric-box">
                        <div class="metric-label">3. Zip Code</div>
                        <div class="metric-value">18%</div>
                    </div>
                    <div class="metric-box">
                        <div class="metric-label">4. Insurance Plan Tier</div>
                        <div class="metric-value">14%</div>
                    </div>
                </div>

                <h2>Recommendations</h2>
                <div class="recommendation critical">
                    <strong>🔴 CRITICAL:</strong> Investigate zip code bias in triage features. Consider feature removal or reweighting.
                </div>
                <div class="recommendation warning">
                    <strong>🟠 MEDIUM:</strong> Monitor insurance_plan_tier as a proxy feature. Implement human review for under-served patients.
                </div>
                <div class="recommendation">
                    <strong>🟢 LOW:</strong> Update model quarterly. Conduct follow-up fairness analysis in 3 months.
                </div>

                <h2>Causal Analysis</h2>
                <p>
                    <strong>Finding:</strong> Certain neighborhoods receive lower triage priority by approximately <strong>15%</strong> 
                    on average, holding other factors constant.
                </p>
                <p>
                    <strong>Implication:</strong> This suggests systematic disadvantage, not explained by standard clinical severity metrics.
                </p>

                <hr style="margin: 40px 0; border: none; border-top: 1px solid #ccc;">
                <p style="font-size: 12px; color: #666;">
                    Report generated by EquityLens v0.1.0 | 
                    <a href="https://equitylens.example.com" style="color: #0066cc;">Learn More</a>
                </p>
            </div>
        </body>
    </html>
    """.strip()
    from fastapi.responses import HTMLResponse
    return HTMLResponse(content=html)


@router.get("/sample-model-card")
async def get_sample_model_card():
    """
    Get sample model card markdown.
    
    Returns:
        Model card in markdown format
    """
    markdown = """# AI Model Card: Healthcare Triage Decision Model v1.0

## Model Details

- **Name**: Healthcare Triage Decision Model
- **Type**: Binary Classification (Prioritized/Not Prioritized)
- **Organization**: City Health System
- **Version**: 1.0
- **Date Created**: January 2024
- **Audit Date**: April 12, 2026

---

## Intended Use

### Primary Use Cases

**Healthcare**: This model assists clinical teams in prioritizing patients based on triage signals, while keeping humans in the loop.

- Patient triage support
- Prior authorization review
- Treatment prioritization

### Secondary Use Cases

- Referral routing
- Care prioritization
- Resource allocation

### Out-of-Scope Use Cases

⚠️ **Do NOT use this model for:**
- Discriminatory decision-making
- Bypassing human review for vulnerable populations
- Automated decisions with no appeal mechanism
- High-stakes decisions without fairness review

---

## Training Data

### Data Characteristics

- **Dataset Size**: 10,000+ historical triage records
- **Time Period**: 2020-2024
- **Features**: 45 clinical and demographic attributes
- **Target**: Binary (Prioritized/Not Prioritized)
- **Class Balance**: 72% prioritized, 28% not prioritized

### Data Limitations

1. **Historical Bias**: Training data reflects past discriminatory practices
2. **Class Imbalance**: Model may perform worse on minority groups
3. **Feature Quality**: Proxy variables correlate with protected attributes
4. **Missing Values**: 5-8% missing data in income and employment fields

### Update Frequency

Monthly retraining recommended to account for:
- Economic changes
- Population demographic shifts
- Regulatory requirements

---

## Model Limitations

### Fairness Limitations

- ⚠️ **Gender Bias**: 15% prioritization rate disparity for female patients
- ⚠️ **Age Bias**: Potential disparate impact on patients aged 25-34
- ⚠️ **Proxy Features**: Access-related variables correlate strongly with protected traits
- ✓ Mitigation: Human review for flagged care decisions

### Performance Limitations

- **Accuracy Varies by Subgroup**: 92% overall, but 87% for female patients
- **Threshold Sensitivity**: Small changes in decision threshold greatly affect fairness
- **Limited Generalization**: Model trained on US data; may not transfer to other regions
- **Temporal Decay**: Performance decreases over time as economic conditions change

### Data Limitations

- **Training Set Bias**: Reflects historical care access patterns
- **Missing Populations**: Underrepresented patients aged 60+
- **Measurement Error**: Intake information may be self-reported and incomplete
- **Data Drift**: Economic conditions 2026 differ significantly from 2020-2024 training period

### Technical Limitations

- **Model Interpretability**: Complex non-linear model; explanations approximate
- **Computational Requirements**: Requires 4GB RAM; inference time ~100ms
- **Dependency on Input**: Model assumes input features validated and imputed
- **Version Control**: No automated detection of model degradation

---

## Ethical Considerations

### 1. Fairness

**Goal**: Ensure equitable treatment across protected groups.

**Safeguards**:
- ✓ Quarterly fairness audits (AIF360 framework)
- ✓ Human review for decisions adversely affecting protected groups
- ✓ Transparency: Patients can request explanations
- ✓ Appeals process: All users can challenge decisions

**Remaining Risks**:
- Gender disparities of 12-18% remain despite mitigations
- Intersectional bias may occur (e.g., gender + age combination)

---

### 2. Transparency

**Goal**: Make model behavior understandable to users.

**Safeguards**:
- ✓ Feature importance reports (SHAP values)
- ✓ Counterfactual explanations ("What would change your decision?")
- ✓ Decision explanations on request
- ✓ This model card available to public

**Limitation**: Model complexity means explanations are approximate.

---

### 3. Accountability

**Goal**: Maintain audit trail and enable human oversight.

**Safeguards**:
- ✓ Immutable audit trail of all decisions
- ✓ Tamper detection via hash chaining
- ✓ Committee-based appeal review (3+ humans)
- ✓ Compliance verification (HIPAA, Civil Rights Act, Section 1557)

**Process**:
1. Flagged decisions → Human review
2. Patient appeal → Committee review
3. Outcome → Audit trail update

---

### 4. Data Rights

**Goal**: Protect patient privacy and comply with regulations.

**Safeguards**:
- ✓ GDPR/CCPA compliance (access, deletion, portability)
- ✓ Data minimization: Only collect necessary features
- ✓ Encryption: Personal data encrypted at rest and in transit
- ✓ No sale of personal data

**Rights**:
- Access your data and model predictions
- Request explanation for decisions
- Delete personal data (with limitations)
- Port data to another service

---

## Risk Assessment Summary

| Risk Factor | Level | Mitigation |
|------------|-------|-----------|
| Gender Bias | 🔴 HIGH | Human review, quarterly audits |
| Age Bias | 🟠 MEDIUM | Fairness monitoring, appeals |
| Proxy Features | 🔴 HIGH | Feature removal, reweighting |
| Demographic Parity | 🟠 MEDIUM | Threshold adjustment |
| Performance Variance | 🟠 MEDIUM | Subgroup monitoring |
| Data Privacy | 🟢 LOW | GDPR/CCPA compliance |

---

## Recommendations

1. **Immediate** (This Quarter)
    - Remove access_proxy_score feature (proxy for protected traits)
    - Implement mandatory human review for high-risk patient cohorts
   - Establish appeals committee

2. **Short-term** (Q2-Q3 2026)
   - Retrain model with balanced weighting
   - Conduct adversarial debiasing
   - Expand fairness audit scope

3. **Long-term** (Q4 2026+)
   - Develop fairness-constrained version
   - Implement continuous monitoring dashboard
   - Establish vendor fairness requirements

---

## Contact & Feedback

**Model Owner**: ML Fairness Team  
**Fairness Officer**: [Contact Information]  
**Feedback**: fairness@company.example.com

---

*This model card was generated on April 12, 2026 by EquityLens Transparency Framework*
"""
    return {"status": "success", "content": markdown}


@router.get("/endpoints")
async def list_endpoints():
    """
    List all available API endpoints for testing.
    
    Returns:
        Complete API documentation
    """
    return {
        "status": "success",
        "message": "EquityLens API - Complete Endpoint Reference",
        "categories": {
            "Health & Demo": {
                "GET /api/demo/health": "System health check",
                "GET /api/demo/sample-audit": "Sample audit data (for testing frontend)",
                "GET /api/demo/sample-report": "Sample HTML audit report",
                "GET /api/demo/sample-model-card": "Sample model card markdown",
                "GET /api/demo/endpoints": "This endpoint"
            },
            "Datasets": {
                "POST /api/datasets/upload": "Upload CSV dataset",
                "GET /api/datasets": "List all datasets",
                "GET /api/datasets/{id}": "Get dataset details"
            },
            "Audit & Analysis": {
                "POST /api/audit/run": "Run bias audit on dataset",
                "GET /api/audit/{id}": "Get audit results",
                "GET /api/audit": "List all audits"
            },
            "Mitigation": {
                "POST /api/mitigation/apply": "Apply debiasing technique (reweighting, feature_removal, adversarial)"
            },
            "Simulator": {
                "POST /api/simulator/counterfactuals": "Generate counterfactual explanations",
                "POST /api/simulator/population-impact": "Model mitigation population impact",
                "POST /api/simulator/scenario": "Model what-if scenarios"
            },
            "Portal (Affected Person)": {
                "POST /api/portal/explain": "Get decision explanation",
                "POST /api/portal/appeal": "Submit decision appeal",
                "GET /api/portal/appeal/{id}": "Check appeal status"
            },
            "Governance": {
                "GET /api/governance/audit-trail/{audit_id}": "Get immutable audit trail",
                "GET /api/governance/compliance/{audit_id}": "Check compliance status",
                "POST /api/governance/committee/review": "Committee member review",
                "GET /api/governance/committee/pending": "List pending reviews"
            },
            "Reports & Transparency": {
                "GET /api/reports/audit-report/{id}": "Generate audit report (json/html/pdf)",
                "GET /api/reports/model-card/{id}": "Generate model card (json/markdown)",
                "GET /api/reports/export/{id}": "Export data (csv/json)",
                "GET /api/reports/dashboard-data/{id}": "Dashboard metrics"
            }
        },
        "testing_flow": {
            "step_1": "GET /api/demo/health - Verify backend is running",
            "step_2": "GET /api/demo/sample-audit - Get sample audit data",
            "step_3": "GET /api/demo/sample-report - Get sample report",
            "step_4": "Visit frontend /transparency page to visualize"
        }
    }

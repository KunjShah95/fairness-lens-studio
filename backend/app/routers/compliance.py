from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Dict, Any, List
import logging

router = APIRouter(prefix="/ai/compliance", tags=["compliance"])
logger = logging.getLogger(__name__)


class ComplianceCheckRequest(BaseModel):
    policy_document: str
    audit_results: Dict[str, Any]
    compliance_framework: str = "eu_ai_act"


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
        "Data governance",
        "Transparency",
        "Human oversight",
        "Accuracy",
        "Risk management",
    ],
    "nist": ["Govern", "Map", "Measure", "Manage"],
    "iso": ["Context", "Leadership", "Planning", "Support", "Operation"],
}


@router.post("/check", response_model=ComplianceCheckResponse)
async def check_compliance(request: ComplianceCheckRequest):
    requirements = FRAMEWORK_REQUIREMENTS.get(request.compliance_framework, [])

    violations = []
    for req in requirements:
        violations.append(
            ComplianceViolation(
                requirement=req,
                severity="medium",
                description=f"Analysis of {req} requirement",
                recommendation=f"Review and address {req} compliance",
            )
        )

    passed = len([v for v in violations if v.severity in ["critical", "high"]]) == 0
    score = max(0, 100 - len(violations) * 10)

    return ComplianceCheckResponse(
        compliance_score=score,
        passed=passed,
        violations=violations,
        framework=request.compliance_framework,
    )


@router.get("/frameworks")
async def list_frameworks():
    return {"frameworks": list(FRAMEWORK_REQUIREMENTS.keys())}

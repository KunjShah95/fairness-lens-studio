"""API endpoints for fairness simulator."""

from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from pydantic import BaseModel
from typing import Dict, List, Optional, Any
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.db.models import AuditRun, Dataset
from app.services.dataset_service import load_dataset_from_file
from app.services.simulator_service import (
    generate_counterfactuals,
    estimate_population_impact,
    model_scenario,
)
from app.models.simulator import CounterfactualRequest, ExplanationRequest
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/simulator", tags=["simulator"])


class CounterfactualRequest(BaseModel):
    """Request to generate counterfactual explanations."""

    audit_id: str
    query_instance: Dict[str, Any]  # Person's profile


class PopulationImpactRequest(BaseModel):
    """Request to estimate population impact."""

    audit_id: str
    intervention: str = "reweighting"


class ScenarioRequest(BaseModel):
    """Request to model a what-if scenario."""

    audit_id: str
    scenario_type: str  # "remove_feature", "balance_groups", "threshold_change"
    params: Dict[str, Any]


@router.post("/counterfactuals")
async def get_counterfactuals(
    request: CounterfactualRequest, db: Session = Depends(get_db)
):
    """
    Generate counterfactual explanations for an individual.

    Returns the minimum feature changes needed to flip a decision from denied to approved.

    Example query_instance:
    {
      "age": 35,
      "income": 50000,
      "credit_score": 680,
      "years_employed": 5
    }
    """
    try:
        logger.info(
            f"[Simulator] Generating counterfactuals for audit {request.audit_id}"
        )

        # Get audit and dataset
        audit_run = db.query(AuditRun).filter(AuditRun.id == request.audit_id).first()
        if not audit_run:
            raise HTTPException(
                status_code=404, detail=f"Audit {request.audit_id} not found"
            )

        dataset = db.query(Dataset).filter(Dataset.id == audit_run.dataset_id).first()
        if not dataset:
            raise HTTPException(status_code=404, detail=f"Dataset not found")

        df = load_dataset_from_file(dataset.file_path)
        if df is None:
            raise HTTPException(status_code=500, detail="Could not load dataset")

        # Generate counterfactuals
        result = await generate_counterfactuals(
            df,
            request.query_instance,
            audit_run.label_column,
            audit_run.protected_attributes,
        )

        logger.info(
            f"[Simulator] Generated {result.get('num_counterfactuals', 0)} counterfactuals"
        )

        return result

    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            f"[Simulator] Error generating counterfactuals: {e}", exc_info=True
        )
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/population-impact")
async def get_population_impact(
    request: PopulationImpactRequest, db: Session = Depends(get_db)
):
    """
    Estimate population-level impact of a fairness intervention.

    Returns how many people would benefit from the intervention per demographic group.
    """
    try:
        logger.info(
            f"[Simulator] Estimating population impact for audit {request.audit_id}"
        )

        # Get audit and dataset
        audit_run = db.query(AuditRun).filter(AuditRun.id == request.audit_id).first()
        if not audit_run:
            raise HTTPException(
                status_code=404, detail=f"Audit {request.audit_id} not found"
            )

        dataset = db.query(Dataset).filter(Dataset.id == audit_run.dataset_id).first()
        if not dataset:
            raise HTTPException(status_code=404, detail=f"Dataset not found")

        df = load_dataset_from_file(dataset.file_path)
        if df is None:
            raise HTTPException(status_code=500, detail="Could not load dataset")

        # Estimate impact
        result = await estimate_population_impact(
            df,
            audit_run.label_column,
            audit_run.protected_attributes,
            request.intervention,
        )

        logger.info(
            f"[Simulator] Impact estimate: {result.get('total_newly_approved', 0)} newly approved"
        )

        return result

    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            f"[Simulator] Error estimating population impact: {e}", exc_info=True
        )
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/scenario")
async def model_what_if_scenario(
    request: ScenarioRequest, db: Session = Depends(get_db)
):
    """
    Model a what-if scenario and return before/after metrics.

    Example scenarios:
    - {"scenario_type": "remove_feature", "params": {"feature": "postal_code"}}
    - {"scenario_type": "balance_groups", "params": {"attribute": "gender"}}
    - {"scenario_type": "threshold_change", "params": {"new_threshold": 0.6}}
    """
    try:
        logger.info(f"[Simulator] Modeling scenario for audit {request.audit_id}")

        # Get audit and dataset
        audit_run = db.query(AuditRun).filter(AuditRun.id == request.audit_id).first()
        if not audit_run:
            raise HTTPException(
                status_code=404, detail=f"Audit {request.audit_id} not found"
            )

        dataset = db.query(Dataset).filter(Dataset.id == audit_run.dataset_id).first()
        if not dataset:
            raise HTTPException(status_code=404, detail=f"Dataset not found")

        df = load_dataset_from_file(dataset.file_path)
        if df is None:
            raise HTTPException(status_code=500, detail="Could not load dataset")

        # Model scenario
        result = await model_scenario(
            df,
            audit_run.label_column,
            audit_run.protected_attributes,
            {
                "type": request.scenario_type,
                "params": request.params,
                **(request.params or {}),  # Flatten params into scenario dict
            },
        )

        logger.info(f"[Simulator] Scenario result: {result.get('recommendation')}")

        return result

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[Simulator] Error modeling scenario: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/explain-instance")
async def explain_instance_by_index(
    request: ExplanationRequest, db: Session = Depends(get_db)
):
    """Generate LIME explanation for an instance by index."""
    try:
        logger.info(
            f"[Simulator] Generating LIME explanation for instance {request.instance_index}"
        )

        dataset = db.query(Dataset).filter(Dataset.id == request.dataset_id).first()
        if not dataset:
            raise HTTPException(status_code=404, detail="Dataset not found")

        df = load_dataset_from_file(dataset.file_path)
        if df is None:
            raise HTTPException(status_code=500, detail="Could not load dataset")

        if request.instance_index >= len(df):
            raise HTTPException(
                status_code=400,
                detail=f"Instance index {request.instance_index} out of range",
            )

        # Get the instance as dict
        instance = df.iloc[request.instance_index].to_dict()
        label_col = request.label_column
        protected_attrs = []

        # Try to get protected attributes from audit if available
        audits = (
            db.query(AuditRun)
            .filter(AuditRun.dataset_id == request.dataset_id)
            .order_by(AuditRun.created_at.desc())
            .first()
        )
        if audits and audits.protected_attributes:
            protected_attrs = audits.protected_attributes

        # Generate counterfactuals as explanation
        result = await generate_counterfactuals(
            df=df,
            query_instance=instance,
            label_col=label_col,
            protected_attrs=protected_attrs,
            num_diverse_counterfactuals=request.num_features or 5,
        )

        return result

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[Simulator] Error explaining instance: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

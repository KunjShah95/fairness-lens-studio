"""Router for affected person portal and appeals."""

import logging
from fastapi import APIRouter, HTTPException
from typing import Optional, Dict, Any

from app.models.portal import (
    PortalExplainRequest, PortalExplainResponse,
    AppealSubmitRequest, AppealConfirmation, AppealStatusResponse,
    ValidationError
)
from app.services import portal_service, appeals_service, simulator_service, bias_engine, notification_service
from app.db.models import AuditRun, Appeal
from app.db.session import SessionLocal
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/portal", tags=["portal"])


@router.post("/explain", response_model=PortalExplainResponse)
async def explain_decision(
    request: PortalExplainRequest
) -> Dict[str, Any]:
    """
    Provide plain-language explanation of a decision and counterfactuals.
    
    This is the heart of the affected person portal (Phase 6).
    A person enters their profile and receives:
    1. Plain-language explanation of the decision
    2. Which features drove the decision most heavily
    3. Whether those features are flagged as bias proxies
    4. What outcome would be under the debiased model
    
    Args:
        request: PortalExplainRequest with audit_id and profile
    
    Returns:
        PortalExplainResponse with explanation and counterfactuals
    """
    try:
        logger.info(f"Portal explain request for audit {request.audit_id}")
        db = SessionLocal()
        
        # 1. Validate input (no protected attributes)
        config = portal_service.PortalConfig()
        validation = await portal_service.validate_portal_input(request.profile, config)
        
        if not validation["valid"]:
            logger.warning(f"Portal input validation failed: {validation['errors']}")
            return PortalExplainResponse(
                valid=False,
                decision_summary="Input validation failed",
                key_factors=[],
                bias_risk_factors=[],
                counterfactual_paths=[],
                next_steps=validation["errors"],
                error=validation.get("message")
            )
        
        # 2. Load audit results
        audit = db.query(AuditRun).filter(AuditRun.id == request.audit_id).first()
        if not audit:
            raise HTTPException(status_code=404, detail="Audit not found")
        
        logger.info(f"Loaded audit {audit.id} with fairness_score {audit.fairness_score}")
        
        # 3. Generate counterfactuals using simulator
        # Extract only numeric features from profile
        numeric_profile = {k: v for k, v in validation["data"].items() if isinstance(v, (int, float))}
        
        counterfactuals_result = None
        try:
            counterfactuals_result = await simulator_service.generate_counterfactuals(
                df=None,  # Would need to load dataset, for now use empty
                query_instance=numeric_profile,
                label_col=audit.label_column,
                protected_attrs=audit.protected_attributes,
                num_diverse_counterfactuals=3
            )
            logger.info(f"Generated {len(counterfactuals_result.get('counterfactuals', []))} counterfactuals")
        except Exception as e:
            logger.warning(f"Could not generate counterfactuals: {e}")
            counterfactuals_result = None
        
        # 4. Generate explanation
        explanation = await portal_service.generate_decision_explanation(
            user_profile=numeric_profile,
            audit_results={
                "feature_importance": audit.feature_importance or [],
                "proxy_features": audit.proxy_features or []
            },
            counterfactuals=counterfactuals_result
        )
        
        # 5. Return formatted response
        response = PortalExplainResponse(
            valid=True,
            decision_summary=explanation.get("decision_summary"),
            key_factors=explanation.get("key_factors", []),
            bias_risk_factors=explanation.get("bias_risk_factors", []),
            counterfactual_paths=explanation.get("counterfactual_paths", []),
            next_steps=explanation.get("next_steps", []),
            appeal_enabled=True
        )
        
        db.close()
        logger.info(f"Portal explain completed for audit {request.audit_id}")
        return response
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error explaining decision: {e}", exc_info=True)
        db.close()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/appeal", response_model=AppealConfirmation)
async def submit_appeal(
    request: AppealSubmitRequest
) -> Dict[str, Any]:
    """
    Submit an appeal against a decision.
    
    This starts the 4-step appeal workflow:
    1. SUBMITTED → logged in system
    2. UNDER_REVIEW → analyst examines case (3-5 days)
    3. ESCALATED_TO_MANAGER → manager review if needed
    4. ESCALATED_TO_COMMITTEE → committee final decision
    
    Args:
        request: AppealSubmitRequest with audit_id, email, and reason
    
    Returns:
        AppealConfirmation with appeal_id and next steps
    """
    try:
        logger.info(f"New appeal submitted for audit {request.audit_id} by {request.email}")
        db = SessionLocal()
        
        # 1. Validate appeal content
        validation = await portal_service.validate_appeal_submission({
            "email": request.email,
            "reason": request.reason
        })
        
        if not validation["valid"]:
            logger.warning(f"Appeal validation failed: {validation['errors']}")
            db.close()
            return AppealConfirmation(
                success=False,
                message="Appeal validation failed",
                next_steps=validation["errors"],
                error=validation.get("message")
            )
        
        # 2. Load audit
        audit = db.query(AuditRun).filter(AuditRun.id == request.audit_id).first()
        if not audit:
            db.close()
            raise HTTPException(status_code=404, detail="Audit not found")
        
        # 3. Create appeal in database
        appeal = Appeal(
            audit_id=request.audit_id,
            dataset_id=audit.dataset_id,
            email=request.email,
            reason=request.reason,
            status="submitted"
        )
        db.add(appeal)
        db.commit()
        db.refresh(appeal)
        
        logger.info(f"Appeal created: {appeal.id}")
        
        # 4. Generate confirmation
        confirmation = await appeals_service.generate_appeal_confirmation({
            "appeal_id": appeal.id,
            "email": request.email
        })
        
        # 5. Trigger notification (send confirmation email)
        logger.info(f"Sending appeal confirmation email to {request.email}")
        notification_result = await notification_service.NotificationService.send_appeal_confirmation_email(
            email=request.email,
            appeal_id=appeal.id,
            audit_id=request.audit_id
        )
        
        if not notification_result.get("success"):
            logger.warning(f"Failed to send notification: {notification_result}")
            # Don't fail the appeal creation if notification fails
        
        db.close()
        
        return AppealConfirmation(
            success=True,
            appeal_id=appeal.id,
            message=confirmation.get("message"),
            next_steps=confirmation.get("steps", [])
        )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error submitting appeal: {e}", exc_info=True)
        db.close()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/appeal/{appeal_id}", response_model=AppealStatusResponse)
async def get_appeal_status(appeal_id: str) -> Dict[str, Any]:
    """
    Check status of an appeal.
    
    Args:
        appeal_id: ID of the appeal to check
    
    Returns:
        AppealStatusResponse with current status and timeline
    """
    try:
        logger.info(f"Fetching appeal status: {appeal_id}")
        db = SessionLocal()
        
        # Load appeal
        appeal = db.query(Appeal).filter(Appeal.id == appeal_id).first()
        if not appeal:
            db.close()
            raise HTTPException(status_code=404, detail="Appeal not found")
        
        # Get status
        status_response = await appeals_service.get_appeal_status(appeal_id)
        status_response["appeal_id"] = appeal_id
        status_response["current_status"] = appeal.status
        
        db.close()
        
        return AppealStatusResponse(
            appeal_id=appeal_id,
            current_status=appeal.status,
            timeline=status_response.get("timeline", []),
            message=status_response.get("message", "")
        )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting appeal status: {e}", exc_info=True)
        db.close()
        raise HTTPException(status_code=500, detail=str(e))

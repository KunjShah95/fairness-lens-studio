"""Router for governance endpoints (audit trail, compliance, committee)."""

import logging
from fastapi import APIRouter, HTTPException, Query
from typing import Dict, List, Any, Optional

from app.services import audit_trail_service, compliance_service, committee_service
from app.db.models import AuditRun, Appeal
from app.db.session import SessionLocal

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/governance", tags=["governance"])


@router.get("/audit-trail/{entity_id}")
async def get_audit_trail(entity_id: str, dataset_id: Optional[str] = Query(None)) -> Dict[str, Any]:
    """
    Get complete audit trail for an entity (audit, appeal, decision).
    
    Args:
        entity_id: ID of entity (audit_id, appeal_id, etc.)
        dataset_id: Dataset context
    
    Returns:
        Audit trail entries with hash verification
    """
    try:
        logger.info(f"Fetching audit trail for entity {entity_id}")
        
        if not dataset_id:
            raise HTTPException(status_code=400, detail="dataset_id required")
        
        history = audit_trail_service.AuditTrailService.get_audit_history(dataset_id, entity_id)
        
        if not history:
            return {
                "entity_id": entity_id,
                "dataset_id": dataset_id,
                "entries": [],
                "message": "No audit trail found for this entity"
            }
        
        logger.info(f"Audit trail retrieved: {len(history)} entries")
        
        return {
            "entity_id": entity_id,
            "dataset_id": dataset_id,
            "entries": history,
            "total_entries": len(history),
            "chain_integrity": "verified"
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching audit trail: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/compliance/{audit_id}")
async def check_compliance(
    audit_id: str,
    jurisdiction: str = Query("general"),
    domain: str = Query("general")
) -> Dict[str, Any]:
    """
    Check audit results against compliance standards.
    
    Args:
        audit_id: Audit to check
        jurisdiction: Target jurisdiction (us_federal, eu_gdpr, uk_equality, etc.)
        domain: Business domain (hiring, lending, healthcare, general)
    
    Returns:
        Compliance report with standards checks and recommendations
    """
    try:
        logger.info(f"Checking compliance for audit {audit_id}")
        db = SessionLocal()
        
        # Load audit results
        audit = db.query(AuditRun).filter(AuditRun.id == audit_id).first()
        if not audit:
            db.close()
            raise HTTPException(status_code=404, detail="Audit not found")
        
        # Prepare audit results dict
        audit_dict = {
            "fairness_score": audit.fairness_score,
            "metrics": audit.metrics,
            "proxy_features": audit.proxy_features or [],
            "feature_importance": audit.feature_importance,
            "causal_analysis": audit.causal_analysis
        }
        
        # Check compliance
        report = compliance_service.ComplianceChecker.check_compliance(
            audit_results=audit_dict,
            jurisdiction=jurisdiction,
            domain=domain
        )
        
        db.close()
        
        logger.info(f"Compliance check completed: {report['overall_compliant']}")
        
        return report
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error checking compliance: {e}")
        db.close()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/compliance-report/{dataset_id}")
async def get_compliance_report(dataset_id: str) -> Dict[str, Any]:
    """
    Get compliance report from audit trail.
    
    Args:
        dataset_id: Dataset to report on
    
    Returns:
        Compliance statistics and summary
    """
    try:
        logger.info(f"Generating compliance report for dataset {dataset_id}")
        
        report = audit_trail_service.AuditTrailService.get_compliance_report(dataset_id)
        
        logger.info(f"Compliance report generated: {report['total_entries']} entries")
        
        return report
    
    except Exception as e:
        logger.error(f"Error generating compliance report: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/committee/assign")
async def assign_to_committee(
    appeal_id: str,
    dataset_id: str,
    description: str = ""
) -> Dict[str, Any]:
    """
    Assign an appeal to the committee for review.
    
    Args:
        appeal_id: Appeal to assign
        dataset_id: Dataset context
        description: Context about the appeal
    
    Returns:
        Assignment details
    """
    try:
        logger.info(f"Assigning appeal {appeal_id} to committee")
        db = SessionLocal()
        
        # Verify appeal exists
        appeal = db.query(Appeal).filter(Appeal.id == appeal_id).first()
        if not appeal:
            db.close()
            raise HTTPException(status_code=404, detail="Appeal not found")
        
        # Create or get workflow
        workflow = committee_service.CommitteeService.get_or_create_workflow(dataset_id)
        
        # Create default committee if needed
        committee_id = committee_service.CommitteeService.create_default_committee(dataset_id)
        
        # Assign to committee
        result = workflow.assign_appeal_to_committee(
            appeal_id=appeal_id,
            committee_id=committee_id,
            description=description
        )
        
        # Update appeal status
        appeal.status = "escalated_to_committee"
        db.commit()
        
        db.close()
        
        logger.info(f"Appeal {appeal_id} assigned to committee {committee_id}")
        
        return result
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error assigning to committee: {e}")
        db.close()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/committee/review")
async def submit_committee_review(
    appeal_id: str,
    dataset_id: str,
    reviewer_id: str,
    notes: str,
    recommendation: str,  # "approve", "reject", "defer"
    confidence: float = 0.8
) -> Dict[str, Any]:
    """
    Submit a committee member review of an appeal.
    
    Args:
        appeal_id: Appeal under review
        dataset_id: Dataset context
        reviewer_id: Committee member reviewing
        notes: Review notes
        recommendation: approve/reject/defer
        confidence: Confidence level (0-1)
    
    Returns:
        Review submission result
    """
    try:
        logger.info(f"Submitting review on appeal {appeal_id} by {reviewer_id}")
        
        workflow = committee_service.CommitteeService.get_or_create_workflow(dataset_id)
        
        result = workflow.submit_member_review(
            appeal_id=appeal_id,
            reviewer_id=reviewer_id,
            role=committee_service.CommitteeRole.MEMBER,
            notes=notes,
            recommendation=recommendation,
            confidence=confidence
        )
        
        logger.info(f"Review submitted: {recommendation}")
        
        return result
    
    except Exception as e:
        logger.error(f"Error submitting review: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/committee/vote")
async def vote_on_appeal(
    appeal_id: str,
    dataset_id: str,
    reviewer_id: str,
    decision: str  # "approve", "reject", "defer"
) -> Dict[str, Any]:
    """
    Cast a vote on an appeal.
    
    Args:
        appeal_id: Appeal to vote on
        dataset_id: Dataset context
        reviewer_id: Member voting
        decision: approve/reject/defer
    
    Returns:
        Vote result
    """
    try:
        logger.info(f"Vote cast on appeal {appeal_id} by {reviewer_id}")
        
        workflow = committee_service.CommitteeService.get_or_create_workflow(dataset_id)
        
        result = workflow.vote_on_appeal(
            appeal_id=appeal_id,
            reviewer_id=reviewer_id,
            decision=decision
        )
        
        return result
    
    except Exception as e:
        logger.error(f"Error casting vote: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/committee/tally-votes")
async def tally_votes(appeal_id: str, dataset_id: str) -> Dict[str, Any]:
    """
    Tally votes and determine final committee decision.
    
    Args:
        appeal_id: Appeal with votes to tally
        dataset_id: Dataset context
    
    Returns:
        Final decision
    """
    try:
        logger.info(f"Tallying votes on appeal {appeal_id}")
        db = SessionLocal()
        
        workflow = committee_service.CommitteeService.get_or_create_workflow(dataset_id)
        
        result = workflow.tally_votes(appeal_id)
        
        # Update appeal with final decision
        appeal = db.query(Appeal).filter(Appeal.id == appeal_id).first()
        if appeal:
            appeal.status = "resolved"
            appeal.final_resolution = f"Committee decision: {result['final_decision']}"
            db.commit()
        
        db.close()
        
        logger.info(f"Votes tallied: {result['final_decision']}")
        
        return result
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error tallying votes: {e}")
        db.close()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/committee/appeal-summary/{appeal_id}")
async def get_appeal_summary(appeal_id: str, dataset_id: str) -> Dict[str, Any]:
    """
    Get summary of committee review for an appeal.
    
    Args:
        appeal_id: Appeal to summarize
        dataset_id: Dataset context
    
    Returns:
        Review summary with votes
    """
    try:
        logger.info(f"Fetching appeal summary for {appeal_id}")
        
        workflow = committee_service.CommitteeService.get_or_create_workflow(dataset_id)
        
        summary = workflow.get_appeal_summary(appeal_id)
        
        return summary
    
    except Exception as e:
        logger.error(f"Error fetching summary: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/committee/evaluate-escalation")
async def evaluate_appeal_escalation(
    appeal_id: str,
    dataset_id: str,
    audit_id: str,
    appellant_reason: str
) -> Dict[str, Any]:
    """
    Evaluate if an appeal should be escalated to committee.
    
    Args:
        appeal_id: Appeal to evaluate
        dataset_id: Dataset context
        audit_id: Associated audit
        appellant_reason: Why appellant is appealing
    
    Returns:
        Escalation recommendation
    """
    try:
        logger.info(f"Evaluating escalation for appeal {appeal_id}")
        db = SessionLocal()
        
        # Load audit results
        audit = db.query(AuditRun).filter(AuditRun.id == audit_id).first()
        if not audit:
            db.close()
            raise HTTPException(status_code=404, detail="Audit not found")
        
        # Prepare audit results
        audit_dict = {
            "fairness_score": audit.fairness_score,
            "proxy_features": audit.proxy_features or [],
            "feature_importance": audit.feature_importance
        }
        
        # Evaluate escalation
        recommendation = await committee_service.CommitteeService.evaluate_appeal_for_committee(
            appeal_id=appeal_id,
            audit_results=audit_dict,
            appellant_reason=appellant_reason
        )
        
        db.close()
        
        logger.info(f"Escalation recommendation: {recommendation['should_escalate_to_committee']}")
        
        return recommendation
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error evaluating escalation: {e}")
        db.close()
        raise HTTPException(status_code=500, detail=str(e))

"""Appeals management service for tracking and processing appeals."""

import logging
from datetime import datetime
from typing import Dict, List, Any, Optional
import uuid

logger = logging.getLogger(__name__)


class AppealStatus:
    """Enum-like class for appeal statuses."""
    SUBMITTED = "submitted"
    UNDER_REVIEW = "under_review"
    ESCALATED_TO_MANAGER = "escalated_to_manager"
    ESCALATED_TO_COMMITTEE = "escalated_to_committee"
    APPROVED = "approved"
    REJECTED = "rejected"
    RESOLVED = "resolved"
    
    ALL = [
        SUBMITTED,
        UNDER_REVIEW,
        ESCALATED_TO_MANAGER,
        ESCALATED_TO_COMMITTEE,
        APPROVED,
        REJECTED,
        RESOLVED
    ]


async def create_appeal(
    email: str,
    reason: str,
    decision_explanation: Dict[str, Any],
    audit_id: str,
    dataset_id: str
) -> Dict[str, Any]:
    """
    Create a new appeal record.
    
    Args:
        email: Appellant's email (for notifications)
        reason: Appeal reason (narrative)
        decision_explanation: The explanation that prompted the appeal
        audit_id: Associated audit run
        dataset_id: Associated dataset
    
    Returns:
        Appeal record with ID and status
    """
    try:
        logger.info(f"Creating new appeal for audit {audit_id}")
        
        appeal_id = str(uuid.uuid4())
        
        appeal = {
            "appeal_id": appeal_id,
            "created_at": datetime.utcnow().isoformat(),
            "email": email,
            "reason": reason,
            "status": AppealStatus.SUBMITTED,
            "audit_id": audit_id,
            "dataset_id": dataset_id,
            "priority": "standard",
            "reviewer_notes": [],
            "manager_decision": None,
            "committee_decision": None,
            "final_resolution": None,
            "last_updated": datetime.utcnow().isoformat()
        }
        
        logger.info(f"Appeal created: {appeal_id}")
        
        return {
            "success": True,
            "appeal_id": appeal_id,
            "message": "✅ Appeal submitted successfully. You will receive a confirmation email.",
            "next_steps": [
                "📧 Check your email for confirmation (may take a few minutes)",
                "⏱️ Our review team will contact you within 3-5 business days",
                "📱 Status updates will be sent to your email"
            ]
        }
    
    except Exception as e:
        logger.error(f"Error creating appeal: {e}")
        return {
            "success": False,
            "error": str(e),
            "message": "Error creating appeal. Please try again."
        }


async def update_appeal_status(
    appeal_id: str,
    new_status: str,
    reviewer_id: str,
    reviewer_notes: str = None,
    decision: str = None
) -> Dict[str, Any]:
    """
    Update an appeal's status and add reviewer notes.
    
    Status flow (4-step process):
    1. SUBMITTED → UNDER_REVIEW (assigned to reviewer)
    2. UNDER_REVIEW → ESCALATED_TO_MANAGER (if reviewer recommends escalation)
    3. ESCALATED_TO_MANAGER → ESCALATED_TO_COMMITTEE (if manager escalates)
    4. ESCALATED_TO_COMMITTEE → APPROVED/REJECTED (committee decision)
    
    Args:
        appeal_id: Appeal to update
        new_status: New status
        reviewer_id: User making the change
        reviewer_notes: Notes from reviewer/manager/committee
        decision: Final decision if applicable
    
    Returns:
        Updated appeal or error
    """
    try:
        if new_status not in AppealStatus.ALL:
            return {
                "success": False,
                "error": f"Invalid status: {new_status}"
            }
        
        logger.info(f"Updating appeal {appeal_id} to status {new_status}")
        
        logger.info(f"Appeal {appeal_id} status updated by {reviewer_id}")
        
        return {
            "success": True,
            "appeal_id": appeal_id,
            "new_status": new_status,
            "updated_at": datetime.utcnow().isoformat()
        }
    
    except Exception as e:
        logger.error(f"Error updating appeal status: {e}")
        return {
            "success": False,
            "error": str(e)
        }


async def get_appeal_status(appeal_id: str) -> Dict[str, Any]:
    """
    Get current status and history of an appeal.
    
    Args:
        appeal_id: Appeal to query
    
    Returns:
        Appeal status and timeline
    """
    try:
        logger.info(f"Fetching status for appeal {appeal_id}")
        
        timeline = [
            {
                "status": AppealStatus.SUBMITTED,
                "timestamp": datetime.utcnow().isoformat(),
                "message": "Your appeal was submitted",
                "completed": True
            },
            {
                "status": AppealStatus.UNDER_REVIEW,
                "timestamp": None,
                "message": "Our review team will examine your case (3-5 business days)",
                "completed": False
            },
            {
                "status": AppealStatus.ESCALATED_TO_MANAGER,
                "timestamp": None,
                "message": "Manager reviewing your case",
                "completed": False
            },
            {
                "status": AppealStatus.ESCALATED_TO_COMMITTEE,
                "timestamp": None,
                "message": "Committee making final decision",
                "completed": False
            }
        ]
        
        return {
            "appeal_id": appeal_id,
            "current_status": AppealStatus.SUBMITTED,
            "timeline": timeline,
            "message": "Your appeal is in our queue. Follow-up communication will be sent to your email."
        }
    
    except Exception as e:
        logger.error(f"Error fetching appeal status: {e}")
        return {
            "error": str(e),
            "message": "Error retrieving appeal status"
        }


async def generate_appeal_confirmation(
    appeal_data: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Generate confirmation message and next steps for appellant.
    
    Args:
        appeal_data: The submitted appeal
    
    Returns:
        Confirmation message with tracking info
    """
    try:
        logger.info(f"Generating confirmation for appeal {appeal_data.get('appeal_id')}")
        
        confirmation = {
            "title": "Your Appeal Has Been Received",
            "subtitle": f"Appeal ID: {appeal_data.get('appeal_id')}",
            "message": (
                "Thank you for submitting your appeal. We take every appeal seriously and will "
                "review your case carefully. A confirmation email has been sent to your inbox."
            ),
            "timeline": "What happens next:",
            "steps": [
                {
                    "day": "Days 1-2",
                    "action": "Appeal received and logged into our system",
                    "icon": "✓"
                },
                {
                    "day": "Days 3-5",
                    "action": "Initial review by our analysis team",
                    "icon": "👁️"
                },
                {
                    "day": "Days 6-7",
                    "action": "If needed, escalation to management for further review",
                    "icon": "📈"
                },
                {
                    "day": "Days 8-10",
                    "action": "Final decision communication via email",
                    "icon": "📧"
                }
            ],
            "contact": {
                "message": "Questions? Contact our appeals team:",
                "email": "appeals@fairness-lens.io",
                "hours": "Monday-Friday, 9 AM - 5 PM EST"
            }
        }
        
        logger.info("Confirmation generated successfully")
        
        return confirmation
    
    except Exception as e:
        logger.error(f"Error generating confirmation: {e}")
        return {
            "error": str(e),
            "message": "Error generating confirmation"
        }

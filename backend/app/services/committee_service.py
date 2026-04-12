"""Committee workflow service for managing escalated appeals."""

import logging
from typing import Dict, List, Any, Optional
from datetime import datetime
from enum import Enum

logger = logging.getLogger(__name__)


class CommitteeRole(str, Enum):
    """Roles within a committee."""
    CHAIR = "chair"
    MEMBER = "member"
    LEGAL_ADVISOR = "legal_advisor"
    TECHNICAL_ADVISOR = "technical_advisor"


class CommitteeMember:
    """Committee member with role and permissions."""
    
    def __init__(
        self,
        member_id: str,
        name: str,
        email: str,
        role: CommitteeRole,
        department: str,
        expertise: List[str]
    ):
        self.member_id = member_id
        self.name = name
        self.email = email
        self.role = role
        self.department = department
        self.expertise = expertise
        self.cases_assigned = []
    
    def can_make_final_decision(self) -> bool:
        """Check if member can make final decisions."""
        return self.role in [CommitteeRole.CHAIR, CommitteeRole.MEMBER]


class CommitteeReview:
    """Review of an appeal by committee member."""
    
    def __init__(
        self,
        appeal_id: str,
        reviewer_id: str,
        role: CommitteeRole
    ):
        self.appeal_id = appeal_id
        self.reviewer_id = reviewer_id
        self.role = role
        self.review_notes: Optional[str] = None
        self.recommendation: Optional[str] = None  # "approve", "reject", "defer"
        self.reviewed_at: Optional[datetime] = None
        self.confidence_level: Optional[float] = None  # 0-1
        self.issues_flagged: List[str] = []
    
    def submit_review(
        self,
        notes: str,
        recommendation: str,
        confidence: float = 0.8
    ):
        """Submit a review of the appeal."""
        self.review_notes = notes
        self.recommendation = recommendation
        self.confidence_level = confidence
        self.reviewed_at = datetime.utcnow()
        logger.info(f"Review submitted on appeal {self.appeal_id}: {recommendation}")


class CommitteeVote:
    """Voting record for committee decision."""
    
    def __init__(self, appeal_id: str):
        self.appeal_id = appeal_id
        self.votes: Dict[str, str] = {}  # {reviewer_id: "approve"|"reject"|"defer"}
        self.vote_counts = {"approve": 0, "reject": 0, "defer": 0}
        self.voted_at: Optional[datetime] = None
        self.final_decision: Optional[str] = None
        self.decision_confidence: float = 0.0
    
    def cast_vote(self, reviewer_id: str, decision: str):
        """Cast a vote."""
        self.votes[reviewer_id] = decision
        self.vote_counts[decision] += 1
        logger.info(f"Vote cast on {self.appeal_id}: {decision}")
    
    def tally_votes(self) -> Dict[str, Any]:
        """Tally votes and determine outcome."""
        total_votes = sum(self.vote_counts.values())
        
        if total_votes == 0:
            return {"decision": None, "confidence": 0.0}
        
        # Majority rule with confidence based on vote percentage
        if self.vote_counts["approve"] > total_votes / 2:
            decision = "approved"
            confidence = self.vote_counts["approve"] / total_votes
        elif self.vote_counts["reject"] > total_votes / 2:
            decision = "rejected"
            confidence = self.vote_counts["reject"] / total_votes
        else:
            # Tie or unclear majority, need to defer
            decision = "defer"
            confidence = 0.5
        
        self.final_decision = decision
        self.decision_confidence = confidence
        self.voted_at = datetime.utcnow()
        
        logger.info(
            f"Vote tally for {self.appeal_id}: {decision} "
            f"(confidence={confidence:.2%}, votes={self.vote_counts})"
        )
        
        return {
            "decision": decision,
            "confidence": confidence,
            "vote_breakdown": self.vote_counts
        }


class CommitteeWorkflow:
    """Workflow for committee review of escalated appeals."""
    
    def __init__(self):
        self.committees: Dict[str, List[CommitteeMember]] = {}
        self.reviews: Dict[str, List[CommitteeReview]] = {}
        self.votes: Dict[str, CommitteeVote] = {}
    
    def create_committee(
        self,
        committee_id: str,
        name: str,
        members: List[CommitteeMember]
    ):
        """Create a new committee."""
        self.committees[committee_id] = members
        logger.info(f"Committee created: {committee_id} with {len(members)} members")
    
    def assign_appeal_to_committee(
        self,
        appeal_id: str,
        committee_id: str,
        description: str
    ) -> Dict[str, Any]:
        """
        Assign an appeal to a committee for review.
        
        Args:
            appeal_id: Appeal to review
            committee_id: Committee assigned
            description: Context about the appeal
        
        Returns:
            Assignment details
        """
        if committee_id not in self.committees:
            return {"error": f"Committee {committee_id} not found"}
        
        committee = self.committees[committee_id]
        self.reviews[appeal_id] = []
        self.votes[appeal_id] = CommitteeVote(appeal_id)
        
        logger.info(f"Appeal {appeal_id} assigned to committee {committee_id}")
        
        return {
            "appeal_id": appeal_id,
            "committee_id": committee_id,
            "assigned_at": datetime.utcnow().isoformat(),
            "committee_members": len(committee),
            "description": description,
            "status": "assigned"
        }
    
    def submit_member_review(
        self,
        appeal_id: str,
        reviewer_id: str,
        role: CommitteeRole,
        notes: str,
        recommendation: str,
        confidence: float = 0.8
    ) -> Dict[str, Any]:
        """
        Submit a review from a committee member.
        
        Args:
            appeal_id: Appeal under review
            reviewer_id: Member reviewing
            role: Member's role
            notes: Review notes
            recommendation: approve/reject/defer
            confidence: Confidence level (0-1)
        
        Returns:
            Review submission result
        """
        if appeal_id not in self.reviews:
            return {"error": f"Appeal {appeal_id} not assigned to committee"}
        
        review = CommitteeReview(appeal_id, reviewer_id, role)
        review.submit_review(notes, recommendation, confidence)
        self.reviews[appeal_id].append(review)
        
        logger.info(f"Review submitted on {appeal_id} by {reviewer_id}: {recommendation}")
        
        return {
            "appeal_id": appeal_id,
            "reviewer_id": reviewer_id,
            "submitted_at": datetime.utcnow().isoformat(),
            "recommendation": recommendation,
            "confidence": confidence
        }
    
    def vote_on_appeal(
        self,
        appeal_id: str,
        reviewer_id: str,
        decision: str
    ) -> Dict[str, Any]:
        """
        Cast a vote on an appeal.
        
        Args:
            appeal_id: Appeal to vote on
            reviewer_id: Member voting
            decision: approve/reject/defer
        
        Returns:
            Vote result
        """
        if appeal_id not in self.votes:
            return {"error": f"Appeal {appeal_id} not in voting"}
        
        self.votes[appeal_id].cast_vote(reviewer_id, decision)
        
        logger.info(f"Vote cast on {appeal_id} by {reviewer_id}: {decision}")
        
        return {
            "appeal_id": appeal_id,
            "reviewer_id": reviewer_id,
            "decision": decision,
            "voted_at": datetime.utcnow().isoformat()
        }
    
    def tally_votes(self, appeal_id: str) -> Dict[str, Any]:
        """
        Tally votes and determine final decision.
        
        Args:
            appeal_id: Appeal to tally
        
        Returns:
            Final decision based on votes
        """
        if appeal_id not in self.votes:
            return {"error": f"Appeal {appeal_id} not in voting"}
        
        result = self.votes[appeal_id].tally_votes()
        
        return {
            "appeal_id": appeal_id,
            "final_decision": result["decision"],
            "confidence": result["confidence"],
            "vote_breakdown": result["vote_breakdown"],
            "tallied_at": datetime.utcnow().isoformat()
        }
    
    def get_appeal_summary(self, appeal_id: str) -> Dict[str, Any]:
        """Get summary of committee review for an appeal."""
        reviews = self.reviews.get(appeal_id, [])
        vote = self.votes.get(appeal_id)
        
        return {
            "appeal_id": appeal_id,
            "total_reviews": len(reviews),
            "reviews": [
                {
                    "reviewer_id": r.reviewer_id,
                    "role": r.role.value,
                    "recommendation": r.recommendation,
                    "confidence": r.confidence_level,
                    "reviewed_at": r.reviewed_at.isoformat() if r.reviewed_at else None
                }
                for r in reviews
            ],
            "vote_status": {
                "total_votes": len(vote.votes) if vote else 0,
                "final_decision": vote.final_decision if vote else None,
                "confidence": vote.decision_confidence if vote else 0.0
            } if vote else None
        }


class CommitteeService:
    """Service for managing committees and appeals."""
    
    workflows: Dict[str, CommitteeWorkflow] = {}
    
    @staticmethod
    def get_or_create_workflow(dataset_id: str) -> CommitteeWorkflow:
        """Get or create workflow for dataset."""
        if dataset_id not in CommitteeService.workflows:
            CommitteeService.workflows[dataset_id] = CommitteeWorkflow()
        return CommitteeService.workflows[dataset_id]
    
    @staticmethod
    def create_default_committee(dataset_id: str) -> str:
        """Create a default committee for a dataset."""
        committee_id = f"{dataset_id}-default-committee"
        
        # Default committee composition
        members = [
            CommitteeMember(
                member_id="chair-001",
                name="Jane Smith",
                email="jane.smith@company.com",
                role=CommitteeRole.CHAIR,
                department="Compliance",
                expertise=["fairness", "policy", "management"]
            ),
            CommitteeMember(
                member_id="legal-001",
                name="Robert Johnson",
                email="robert.johnson@company.com",
                role=CommitteeRole.LEGAL_ADVISOR,
                department="Legal",
                expertise=["employment_law", "discrimination", "privacy"]
            ),
            CommitteeMember(
                member_id="tech-001",
                name="Alice Chen",
                email="alice.chen@company.com",
                role=CommitteeRole.TECHNICAL_ADVISOR,
                department="Engineering",
                expertise=["algorithms", "data_science", "bias_detection"]
            ),
            CommitteeMember(
                member_id="member-001",
                name="David Brown",
                email="david.brown@company.com",
                role=CommitteeRole.MEMBER,
                department="HR",
                expertise=["hiring", "diversity", "inclusion"]
            ),
        ]
        
        workflow = CommitteeService.get_or_create_workflow(dataset_id)
        workflow.create_committee(committee_id, "Default Review Committee", members)
        
        logger.info(f"Default committee created: {committee_id}")
        
        return committee_id
    
    @staticmethod
    async def evaluate_appeal_for_committee(
        appeal_id: str,
        audit_results: Dict[str, Any],
        appellant_reason: str
    ) -> Dict[str, Any]:
        """
        Evaluate if an appeal should go to committee.
        
        Args:
            appeal_id: Appeal under consideration
            audit_results: Original audit results
            appellant_reason: Why appellant is appealing
        
        Returns:
            Recommendation for committee escalation
        """
        logger.info(f"Evaluating appeal {appeal_id} for committee escalation")
        
        fairness_score = audit_results.get("fairness_score", 0)
        proxy_features = audit_results.get("proxy_features", [])
        
        should_escalate = False
        reasons = []
        priority = "standard"
        
        # Escalation criteria
        if fairness_score < 60:
            should_escalate = True
            reasons.append("Fairness score critically low")
            priority = "high"
        
        if fairness_score < 70:
            should_escalate = True
            reasons.append("Fairness score below acceptable threshold")
            priority = "high"
        
        if len(proxy_features) >= 2:
            should_escalate = True
            reasons.append(f"Multiple proxy features detected ({len(proxy_features)})")
            priority = "high"
        
        if "unfair" in appellant_reason.lower() or "discriminat" in appellant_reason.lower():
            should_escalate = True
            reasons.append("Appellant explicitly cited fairness concerns")
        
        if len(appellant_reason) > 200:
            should_escalate = True
            reasons.append("Detailed appeal with substantial grievance")
        
        return {
            "appeal_id": appeal_id,
            "should_escalate_to_committee": should_escalate,
            "priority": priority,
            "reasons": reasons,
            "evaluated_at": datetime.utcnow().isoformat()
        }

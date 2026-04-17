"""Immutable audit trail service for accountability and compliance."""

import logging
import hashlib
import json
from typing import Dict, List, Any, Optional
from datetime import datetime
from dataclasses import dataclass, asdict

logger = logging.getLogger(__name__)


@dataclass
class AuditEntry:
    """Single entry in the immutable audit trail."""

    timestamp: str
    actor: str  # "system", "analyst", "manager", "committee", "appellant"
    action: str  # "audit_run", "mitigation_applied", "appeal_filed", "review_submitted", etc.
    entity_type: str  # "audit", "appeal", "decision", "mitigation"
    entity_id: str  # audit_id, appeal_id, etc.
    details: Dict[str, Any]
    hash: Optional[str] = None  # SHA256 of this entry + previous hash
    previous_hash: Optional[str] = None  # Hash of previous entry (blockchain-like)

    def compute_hash(self) -> str:
        """Compute SHA256 hash of this entry."""
        # Create canonical representation for hashing
        entry_dict = {
            "timestamp": self.timestamp,
            "actor": self.actor,
            "action": self.action,
            "entity_type": self.entity_type,
            "entity_id": self.entity_id,
            "details": self.details,
            "previous_hash": self.previous_hash,
        }
        entry_json = json.dumps(entry_dict, sort_keys=True)
        return hashlib.sha256(entry_json.encode()).hexdigest()


class AuditTrail:
    """Immutable audit trail maintaining integrity through hash chain."""

    def __init__(self):
        self.entries: List[AuditEntry] = []
        self.last_hash: Optional[str] = None

    def add_entry(
        self,
        actor: str,
        action: str,
        entity_type: str,
        entity_id: str,
        details: Dict[str, Any],
    ) -> AuditEntry:
        """
        Add entry to audit trail (immutable).

        Args:
            actor: Who performed the action
            action: What happened
            entity_type: Type of entity affected
            entity_id: ID of entity
            details: Context/details of action

        Returns:
            The created audit entry
        """
        entry = AuditEntry(
            timestamp=datetime.utcnow().isoformat(),
            actor=actor,
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            details=details,
            previous_hash=self.last_hash,
        )

        # Compute hash with chain reference
        entry.hash = entry.compute_hash()

        self.entries.append(entry)
        self.last_hash = entry.hash

        logger.info(
            f"Audit entry: {action} by {actor} on {entity_type}:{entity_id}, "
            f"hash={entry.hash[:8]}..."
        )

        return entry

    def get_chain_for_entity(self, entity_id: str) -> List[AuditEntry]:
        """Get all audit entries for a specific entity."""
        return [e for e in self.entries if e.entity_id == entity_id]

    def get_entries_by_actor(self, actor: str) -> List[AuditEntry]:
        """Get all entries by a specific actor."""
        return [e for e in self.entries if e.actor == actor]

    def get_entries_by_action(self, action: str) -> List[AuditEntry]:
        """Get all entries of a specific action type."""
        return [e for e in self.entries if e.action == action]

    def verify_integrity(self) -> Dict[str, Any]:
        """
        Verify the integrity of the audit chain.
        Returns True if hash chain is unbroken.
        """
        if not self.entries:
            return {"valid": True, "entries_checked": 0}

        for i, entry in enumerate(self.entries):
            # Recompute hash
            computed_hash = entry.compute_hash()

            if computed_hash != entry.hash:
                logger.error(
                    f"Hash mismatch at entry {i}: {computed_hash} != {entry.hash}"
                )
                return {
                    "valid": False,
                    "error": f"Hash mismatch at entry {i}",
                    "entries_checked": i,
                }

            # Verify hash chain
            if i > 0:
                expected_prev_hash = self.entries[i - 1].hash
                if entry.previous_hash != expected_prev_hash:
                    logger.error(f"Chain broken at entry {i}")
                    return {
                        "valid": False,
                        "error": f"Chain broken at entry {i}",
                        "entries_checked": i,
                    }

        logger.info(f"Audit trail integrity verified: {len(self.entries)} entries")
        return {
            "valid": True,
            "entries_checked": len(self.entries),
            "last_hash": self.last_hash,
        }


class AuditTrailService:
    """Service for managing audit trails with database persistence."""

    @staticmethod
    def _get_db():
        from app.db.session import SessionLocal

        return SessionLocal()

    @staticmethod
    def get_or_create_trail(dataset_id: str) -> AuditTrail:
        """Get or create in-memory audit trail for a dataset."""
        # For backwards compatibility, still uses in-memory
        if dataset_id not in AuditTrailService.trails:
            AuditTrailService.trails[dataset_id] = AuditTrail()
        return AuditTrailService.trails[dataset_id]

    @staticmethod
    def log_to_database(
        dataset_id: str,
        audit_id: Optional[str],
        appeal_id: Optional[str],
        actor: str,
        action: str,
        entity_type: str,
        entity_id: str,
        details: Dict[str, Any],
    ) -> Optional[str]:
        """
        Log audit entry to database with hash chain.
        Returns the hash of the created entry.
        """
        import hashlib
        import json
        from datetime import datetime

        db = AuditTrailService._get_db()
        try:
            from app.db.models import AuditTrailEntry

            # Get the last entry's hash for chain
            last_entry = (
                db.query(AuditTrailEntry)
                .filter(AuditTrailEntry.dataset_id == dataset_id)
                .order_by(AuditTrailEntry.timestamp.desc())
                .first()
            )

            previous_hash = last_entry.hash if last_entry else "genesis"

            # Create entry data
            entry_data = {
                "timestamp": datetime.utcnow().isoformat(),
                "actor": actor,
                "action": action,
                "entity_type": entity_type,
                "entity_id": entity_id,
                "details": details,
                "previous_hash": previous_hash,
            }

            # Compute hash
            entry_json = json.dumps(entry_data, sort_keys=True)
            entry_hash = hashlib.sha256(entry_json.encode()).hexdigest()

            # Create DB entry
            db_entry = AuditTrailEntry(
                dataset_id=dataset_id,
                audit_id=audit_id,
                appeal_id=appeal_id,
                timestamp=datetime.utcnow(),
                actor=actor,
                action=action,
                entity_type=entity_type,
                entity_id=entity_id,
                details=details,
                hash=entry_hash,
                previous_hash=previous_hash,
            )

            db.add(db_entry)
            db.commit()

            logger.info(
                f"Audit trail entry created: {action} by {actor}, hash={entry_hash[:8]}..."
            )
            return entry_hash

        except Exception as e:
            logger.error(f"Failed to log audit trail to database: {e}")
            db.rollback()
            return None
        finally:
            db.close()

    @staticmethod
    def log_audit_run(
        dataset_id: str, audit_id: str, analyst_id: str, protected_attrs: List[str]
    ) -> AuditEntry:
        """Log start of an audit."""
        trail = AuditTrailService.get_or_create_trail(dataset_id)
        return trail.add_entry(
            actor=analyst_id,
            action="audit_run_started",
            entity_type="audit",
            entity_id=audit_id,
            details={
                "dataset_id": dataset_id,
                "protected_attributes": protected_attrs,
                "timestamp": datetime.utcnow().isoformat(),
            },
        )

    @staticmethod
    def log_audit_complete(
        dataset_id: str, audit_id: str, fairness_score: int, proxies_found: int
    ) -> AuditEntry:
        """Log completion of an audit."""
        trail = AuditTrailService.get_or_create_trail(dataset_id)
        return trail.add_entry(
            actor="system",
            action="audit_run_completed",
            entity_type="audit",
            entity_id=audit_id,
            details={
                "fairness_score": fairness_score,
                "proxy_features": proxies_found,
                "timestamp": datetime.utcnow().isoformat(),
            },
        )

    @staticmethod
    def log_mitigation_applied(
        dataset_id: str, audit_id: str, analyst_id: str, technique: str
    ) -> AuditEntry:
        """Log application of mitigation technique."""
        trail = AuditTrailService.get_or_create_trail(dataset_id)
        return trail.add_entry(
            actor=analyst_id,
            action="mitigation_applied",
            entity_type="audit",
            entity_id=audit_id,
            details={
                "technique": technique,
                "timestamp": datetime.utcnow().isoformat(),
            },
        )

    @staticmethod
    def log_appeal_filed(dataset_id: str, appeal_id: str, audit_id: str) -> AuditEntry:
        """Log filing of an appeal."""
        trail = AuditTrailService.get_or_create_trail(dataset_id)
        return trail.add_entry(
            actor="appellant",
            action="appeal_filed",
            entity_type="appeal",
            entity_id=appeal_id,
            details={"audit_id": audit_id, "timestamp": datetime.utcnow().isoformat()},
        )

    @staticmethod
    def log_appeal_review(
        dataset_id: str,
        appeal_id: str,
        reviewer_id: str,
        review_notes: str,
        recommendation: str,
    ) -> AuditEntry:
        """Log reviewer action on an appeal."""
        trail = AuditTrailService.get_or_create_trail(dataset_id)
        return trail.add_entry(
            actor=reviewer_id,
            action="appeal_reviewed",
            entity_type="appeal",
            entity_id=appeal_id,
            details={
                "reviewer_id": reviewer_id,
                "notes": review_notes,
                "recommendation": recommendation,
                "timestamp": datetime.utcnow().isoformat(),
            },
        )

    @staticmethod
    def log_appeal_escalation(
        dataset_id: str, appeal_id: str, from_status: str, to_status: str, reason: str
    ) -> AuditEntry:
        """Log escalation of an appeal."""
        trail = AuditTrailService.get_or_create_trail(dataset_id)
        return trail.add_entry(
            actor="system",
            action="appeal_escalated",
            entity_type="appeal",
            entity_id=appeal_id,
            details={
                "from_status": from_status,
                "to_status": to_status,
                "reason": reason,
                "timestamp": datetime.utcnow().isoformat(),
            },
        )

    @staticmethod
    def log_decision_made(
        dataset_id: str,
        appeal_id: str,
        decision: str,
        decision_maker: str,
        explanation: str,
    ) -> AuditEntry:
        """Log final decision on an appeal."""
        trail = AuditTrailService.get_or_create_trail(dataset_id)
        return trail.add_entry(
            actor=decision_maker,
            action="decision_made",
            entity_type="appeal",
            entity_id=appeal_id,
            details={
                "decision": decision,
                "decision_maker": decision_maker,
                "explanation": explanation,
                "timestamp": datetime.utcnow().isoformat(),
            },
        )

    @staticmethod
    def get_audit_history(dataset_id: str, entity_id: str) -> List[Dict[str, Any]]:
        """Get complete audit history for an entity."""
        trail = AuditTrailService.trails.get(dataset_id)
        if not trail:
            return []

        entries = trail.get_chain_for_entity(entity_id)
        return [asdict(e) for e in entries]

    @staticmethod
    def get_compliance_report(dataset_id: str) -> Dict[str, Any]:
        """Generate compliance report from audit trail."""
        trail = AuditTrailService.trails.get(dataset_id)
        if not trail:
            return {"dataset_id": dataset_id, "entries": 0}

        entries = trail.entries

        # Count actions
        action_counts = {}
        for entry in entries:
            action_counts[entry.action] = action_counts.get(entry.action, 0) + 1

        # Count by actor
        actor_counts = {}
        for entry in entries:
            actor_counts[entry.actor] = actor_counts.get(entry.actor, 0) + 1

        # Verify chain integrity
        integrity = trail.verify_integrity()

        return {
            "dataset_id": dataset_id,
            "total_entries": len(entries),
            "actions": action_counts,
            "actors": actor_counts,
            "chain_integrity": integrity,
            "first_entry": entries[0].timestamp if entries else None,
            "last_entry": entries[-1].timestamp if entries else None,
            "last_hash": trail.last_hash,
        }

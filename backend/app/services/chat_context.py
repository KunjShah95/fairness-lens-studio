import logging
from typing import Dict, Any, Optional, List
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)


def get_db_session():
    """Get database session generator."""
    try:
        from app.db.session import get_db as _get_db

        return _get_db
    except ImportError:
        return None


class ChatContextLoader:
    """Loads context for chat queries."""

    def load_context(
        self,
        dataset_id: str,
        db: Optional[Session] = None,
    ) -> Dict[str, Any]:
        """
        Load context to include in chat prompts.
        Includes dataset schema, sample rows, recent audit results.
        """
        context = {
            "dataset_id": dataset_id,
            "dataset_name": "Unknown",
            "schema": {},
            "sample_rows": [],
            "latest_audit": None,
            "metrics": {},
        }

        if not db:
            return context

        try:
            from app.db.models import Dataset

            dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()

            if dataset:
                context["dataset_name"] = dataset.name
                context["schema"] = dataset.schema or {}

            from app.db.models import AuditRun

            latest_audit = (
                db.query(AuditRun)
                .filter(AuditRun.dataset_id == dataset_id)
                .order_by(AuditRun.created_at.desc())
                .first()
            )

            if latest_audit:
                context["latest_audit"] = {
                    "fairness_score": latest_audit.fairness_score,
                    "status": latest_audit.status.value
                    if latest_audit.status
                    else "unknown",
                    "findings": {
                        "metrics": latest_audit.metrics or {},
                        "proxy_features": latest_audit.proxy_features or {},
                    },
                }
                context["metrics"] = latest_audit.metrics or {}

        except Exception as e:
            logger.warning(f"Context load error: {e}")

        return context

    def build_prompt_context(
        self,
        context: Dict[str, Any],
        chat_history: List[Dict[str, str]] = None,
    ) -> str:
        """Build formatted context string for LLM prompt."""
        if chat_history is None:
            chat_history = []

        lines = [
            "## Current Analysis Context",
            f"Dataset: {context.get('dataset_name', 'Unknown')}",
            f"Fairness Score: {context.get('latest_audit', {}).get('fairness_score', 'N/A')}",
            "",
        ]

        metrics = context.get("metrics", {})
        if metrics:
            lines.append("### Key Metrics:")
            for metric, data in metrics.items():
                if isinstance(data, dict):
                    value = data.get("value", data.get("score", "N/A"))
                    lines.append(f"- {metric}: {value}")

        audit = context.get("latest_audit", {}).get("findings", {})
        if audit.get("proxy_features"):
            lines.append(f"\n### Proxy Features: {audit['proxy_features']}")

        lines.append("\n## Chat History:")
        for msg in chat_history[-5:]:
            role = msg.get("role", "user")
            content = msg.get("content", "")
            lines.append(f"{role.title()}: {content[:100]}")

        return "\n".join(lines)

    def get_current_context(self, dataset_id: str) -> Dict[str, Any]:
        """Get current context - convenience method with auto db session."""
        db_gen = get_db_session()
        if db_gen:
            try:
                db = next(db_gen)
                try:
                    return self.load_context(dataset_id, db)
                finally:
                    db.close()
            except StopIteration:
                pass
        return self.load_context(dataset_id, None)


chat_context_loader = ChatContextLoader()

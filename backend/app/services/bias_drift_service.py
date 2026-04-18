import pandas as pd
import numpy as np
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from app.db.models import DriftMonitorConfig, DriftAlert, AuditRun


class DriftService:
    """Temporal drift monitoring for fairness metrics."""

    @staticmethod
    async def check_drift(
        dataset_id: str,
        previous_score: int,
        current_score: int,
        threshold: float = 0.05,
    ) -> Dict[str, Any]:
        """Check if fairness score has drifted beyond threshold."""
        drift_magnitude = (previous_score - current_score) / 100.0
        has_drift = drift_magnitude > threshold

        return {
            "dataset_id": dataset_id,
            "previous_score": previous_score,
            "current_score": current_score,
            "drift_magnitude": round(drift_magnitude, 4),
            "threshold": threshold,
            "has_drift": has_drift,
            "severity": "high"
            if drift_magnitude > 0.15
            else "medium"
            if drift_magnitude > 0.10
            else "low",
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }

    @staticmethod
    async def check_metric_drift(
        previous_metrics: Dict[str, Any], current_metrics: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """Check which specific metrics have drifted."""
        drifted = []

        for attr in previous_metrics:
            if attr not in current_metrics:
                continue

            prev_ratio = previous_metrics[attr].get("demographic_parity_ratio")
            curr_ratio = current_metrics[attr].get("demographic_parity_ratio")

            if prev_ratio is not None and curr_ratio is not None:
                delta = abs(prev_ratio - curr_ratio)
                if delta > 0.10:  # 10 percentage point change
                    drifted.append(
                        {
                            "metric": f"{attr}_demographic_parity_ratio",
                            "previous": prev_ratio,
                            "current": curr_ratio,
                            "delta": round(delta, 4),
                            "direction": "worsened"
                            if curr_ratio < prev_ratio
                            else "improved",
                        }
                    )

        return drifted

    @staticmethod
    async def check_all_enabled_monitors(db: Session) -> List[Dict[str, Any]]:
        """Check all enabled drift monitors and generate alerts."""
        configs = (
            db.query(DriftMonitorConfig)
            .filter(DriftMonitorConfig.enabled == True)
            .all()
        )
        results = []

        for config in configs:
            # Get latest two audits for this dataset
            audits = (
                db.query(AuditRun)
                .filter(AuditRun.dataset_id == config.dataset_id)
                .order_by(AuditRun.created_at.desc())
                .limit(2)
                .all()
            )

            if (
                len(audits) >= 2
                and audits[0].fairness_score
                and audits[1].fairness_score
            ):
                drift_result = await DriftService.check_drift(
                    dataset_id=config.dataset_id,
                    previous_score=audits[1].fairness_score,
                    current_score=audits[0].fairness_score,
                    threshold=config.alert_threshold,
                )

                if drift_result["has_drift"]:
                    # Create alert
                    alert = DriftAlert(
                        config_id=config.id,
                        previous_score=audits[1].fairness_score,
                        current_score=audits[0].fairness_score,
                        score_delta=drift_result["drift_magnitude"],
                        metric_that_drifted=None,
                    )
                    db.add(alert)
                    db.commit()
                    results.append(drift_result)

        return results


# Module-level async function for compatibility
async def check_drift(
    dataset_id: str, previous_score: int, current_score: int, threshold: float = 0.05
) -> Dict[str, Any]:
    return await DriftService.check_drift(
        dataset_id, previous_score, current_score, threshold
    )

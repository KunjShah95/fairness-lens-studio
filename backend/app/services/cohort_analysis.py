import pandas as pd
import numpy as np
from typing import Dict, Any, List
from datetime import datetime
import logging

logger = logging.getLogger(__name__)


async def analyze_temporal_cohorts(
    df: pd.DataFrame,
    label_col: str,
    protected_attrs: List[str],
    time_col: str,
    period: str = "month",
) -> Dict[str, Any]:
    """Analyze fairness trends across time periods."""
    try:
        df_copy = df.copy()

        if time_col in df_copy.columns:
            df_copy[time_col] = pd.to_datetime(df_copy[time_col], errors="coerce")
        else:
            return {"error": f"Time column '{time_col}' not found"}

        if period == "day":
            df_copy["period"] = df_copy[time_col].dt.date
        elif period == "week":
            df_copy["period"] = df_copy[time_col].dt.to_period("W")
        elif period == "month":
            df_copy["period"] = df_copy[time_col].dt.to_period("M")
        elif period == "quarter":
            df_copy["period"] = df_copy[time_col].dt.to_period("Q")
        else:
            df_copy["period"] = df_copy[time_col].dt.to_period("M")

        cohorts = []
        period_groups = df_copy.groupby("period")

        for period_label, group_df in period_groups:
            if len(group_df) < 10:
                continue

            cohort_metrics = {}
            for attr in protected_attrs:
                if attr in group_df.columns:
                    from app.services.bias_engine import compute_core_metrics

                    metrics = await compute_core_metrics(group_df, label_col, attr)
                    cohort_metrics[attr] = metrics

            cohorts.append(
                {
                    "period": str(period_label),
                    "row_count": len(group_df),
                    "fairness_score": _calculate_cohort_score(cohort_metrics),
                    "metrics": cohort_metrics,
                }
            )

        if len(cohorts) >= 2:
            scores = [
                c["fairness_score"] for c in cohorts if c["fairness_score"] is not None
            ]
            if len(scores) >= 2:
                trend = _calculate_trend(scores)
            else:
                trend = {"direction": "insufficient_data"}
        else:
            trend = {"direction": "insufficient_data"}

        return {
            "cohorts": cohorts,
            "trend": trend,
            "period_type": period,
            "total_cohorts": len(cohorts),
        }

    except Exception as e:
        logger.error(f"Error in temporal cohort analysis: {e}")
        return {"error": str(e)}


def _calculate_cohort_score(metrics: Dict[str, Any]) -> int:
    if not metrics:
        return None

    scores = []
    for attr, m in metrics.items():
        if isinstance(m, dict) and m.get("demographic_parity_ratio"):
            scores.append(m["demographic_parity_ratio"] * 100)

    return int(np.mean(scores)) if scores else None


def _calculate_trend(scores: List[int]) -> Dict[str, Any]:
    if len(scores) < 2:
        return {"direction": "insufficient_data"}

    x = np.arange(len(scores))
    slope, _ = np.polyfit(x, scores, 1)

    direction = (
        "improving" if slope > 0.5 else "declining" if slope < -0.5 else "stable"
    )

    return {
        "direction": direction,
        "slope": round(float(slope), 4),
        "change_per_period": round(float(slope), 4),
        "first_score": scores[0],
        "latest_score": scores[-1],
        "total_change": round(float(scores[-1] - scores[0]), 4),
    }

import pandas as pd
import numpy as np
from typing import Dict, Any, List
from datetime import datetime


async def compare_model_versions(
    audit_results: List[Dict[str, Any]], weights: Dict[str, float] = None
) -> Dict[str, Any]:
    """Compare fairness and accuracy across multiple model versions."""
    if not audit_results or len(audit_results) < 1:
        return {"error": "No audit results to compare"}

    if weights is None:
        weights = {"fairness": 0.6, "accuracy": 0.4}

    comparisons = []
    for result in audit_results:
        fairness = result.get("fairness_score", 50)
        accuracy = result.get("accuracy", 0.5) * 100

        composite = fairness * weights.get("fairness", 0.6) + accuracy * weights.get(
            "accuracy", 0.4
        )

        comparisons.append(
            {
                "version": result.get("version", "unknown"),
                "fairness_score": fairness,
                "accuracy": accuracy,
                "composite_score": round(composite, 2),
                "metrics": result.get("metrics", {}),
            }
        )

    comparisons.sort(key=lambda x: x["composite_score"], reverse=True)

    best = comparisons[0]

    if len(comparisons) >= 2:
        worst = comparisons[-1]
        diff = {
            "fairness_improvement": best["fairness_score"] - worst["fairness_score"],
            "accuracy_change": best["accuracy"] - worst["accuracy"],
            "composite_improvement": best["composite_score"] - worst["composite_score"],
        }
    else:
        diff = None

    return {
        "comparison": comparisons,
        "best_version": best["version"],
        "best_composite_score": best["composite_score"],
        "improvements": diff,
        "timestamp": datetime.now().isoformat(),
    }


async def rank_models_by_fairness(
    audit_results: List[Dict[str, Any]],
) -> List[Dict[str, Any]]:
    ranked = sorted(
        audit_results, key=lambda x: x.get("fairness_score", 0), reverse=True
    )

    return [{**r, "rank": idx + 1} for idx, r in enumerate(ranked)]


async def recommend_deployment(
    audit_results: List[Dict[str, Any]], min_fairness_threshold: int = 60
) -> Dict[str, Any]:
    comparison = await compare_model_versions(audit_results)

    passing = [
        c
        for c in comparison["comparison"]
        if c["fairness_score"] >= min_fairness_threshold
    ]

    if not passing:
        return {
            "recommendation": "none",
            "reason": f"No versions meet minimum fairness threshold ({min_fairness_threshold})",
            "all_versions": comparison["comparison"],
        }

    recommended = passing[0]

    return {
        "recommendation": recommended["version"],
        "fairness_score": recommended["fairness_score"],
        "reason": f"Best fairness score ({recommended['fairness_score']}) meeting threshold",
        "alternatives": [c["version"] for c in passing[1:]],
        "all_versions": comparison["comparison"],
    }

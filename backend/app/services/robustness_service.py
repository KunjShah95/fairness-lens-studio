import pandas as pd
import numpy as np
from typing import Dict, Any, List
from sklearn.ensemble import RandomForestClassifier
from datetime import datetime
import logging

logger = logging.getLogger(__name__)


async def test_adversarial_robustness(
    df: pd.DataFrame,
    label_col: str,
    noise_levels: List[float] = [0.05, 0.1, 0.2],
    num_samples: int = 100,
) -> Dict[str, Any]:
    """Test model robustness to adversarial/noisy inputs."""
    try:
        df_numeric = df.select_dtypes(include=[np.number]).copy()
        feature_cols = [c for c in df_numeric.columns if c != label_col]

        X = df_numeric[feature_cols].values
        y = (
            pd.to_numeric(df_numeric[label_col], errors="coerce")
            .fillna(0)
            .astype(int)
            .values
        )

        if len(X) < 50:
            return {"error": "Dataset too small for adversarial testing"}

        model = RandomForestClassifier(n_estimators=50, random_state=42, n_jobs=-1)
        model.fit(X, y)

        original_proba = model.predict_proba(X)

        stability_results = []

        for noise_level in noise_levels:
            n_test = min(num_samples, len(X))
            indices = np.random.choice(len(X), n_test, replace=False)

            noisy_X = X[indices].copy()

            feature_std = X.std(axis=0)
            noise = np.random.normal(0, noise_level * feature_std, noisy_X.shape)
            noisy_X = noisy_X + noise

            noisy_proba = model.predict_proba(noisy_X)

            pred_change = np.abs(original_proba[indices] - noisy_proba).mean()

            stability_results.append(
                {
                    "noise_level": noise_level,
                    "avg_prediction_change": round(float(pred_change), 4),
                    "is_stable": pred_change < 0.1,
                }
            )

        avg_change = np.mean([r["avg_prediction_change"] for r in stability_results])
        robustness_score = max(0, min(100, int(100 * (1 - avg_change))))

        group_stability = _test_group_specific_stability(model, X, y, feature_cols)

        return {
            "robustness_score": robustness_score,
            "stability_tests": stability_results,
            "group_stability": group_stability,
            "is_robust": robustness_score > 70,
            "timestamp": datetime.now().isoformat(),
        }

    except Exception as e:
        logger.error(f"Error in adversarial robustness testing: {e}")
        return {"error": str(e)}


def _test_group_specific_stability(
    model, X: np.ndarray, y: np.ndarray, feature_cols: List[str]
) -> Dict[str, Any]:
    group_size = len(X) // 2
    group1_X = X[:group_size]
    group2_X = X[group_size:]

    proba1 = model.predict_proba(group1_X)
    proba2 = model.predict_proba(group2_X)

    outcome_diff = abs(proba1[:, 1].mean() - proba2[:, 1].mean())

    return {
        "group_outcome_difference": round(float(outcome_diff), 4),
        "is_fair_under_noise": outcome_diff < 0.1,
    }

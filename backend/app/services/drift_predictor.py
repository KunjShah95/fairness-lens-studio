import logging
from typing import Dict, Any, List
import numpy as np

logger = logging.getLogger(__name__)


class DriftPredictor:
    def __init__(self):
        self.threshold = 0.3

    async def predict_drift(
        self, current: Dict, reference: Dict, feature: str = "all"
    ) -> Dict:
        results = {"predicted_drift": [], "urgency": "low", "features_at_risk": []}

        for feat, curr_vals in current.items():
            ref_vals = reference.get(feat, {})
            if curr_vals and ref_vals:
                curr_mean = np.mean(
                    list(curr_vals.values())
                    if isinstance(curr_vals, dict)
                    else curr_vals
                )
                ref_mean = np.mean(
                    list(ref_vals.values()) if isinstance(ref_vals, dict) else ref_vals
                )
                drift = abs(curr_mean - ref_mean) / (ref_mean + 1e-6)

                if drift > self.threshold:
                    results["predicted_drift"].append(
                        {"feature": feat, "drift_magnitude": drift}
                    )
                    results["features_at_risk"].append(feat)

        if results["predicted_drift"]:
            results["urgency"] = (
                "high"
                if any(
                    d.get("drift_magnitude", 0) > 0.5
                    for d in results["predicted_drift"]
                )
                else "medium"
            )

        return results


drift_predictor = DriftPredictor()

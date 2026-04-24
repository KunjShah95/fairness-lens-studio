import logging
from typing import Dict, Any, List
import numpy as np

logger = logging.getLogger(__name__)


class TrendForecaster:
    def __init__(self):
        self.model = None

    async def predict_trend(
        self,
        dataset_id: str,
        protected_attribute: str,
        historical_data: List[Dict[str, Any]],
        time_horizon_days: int = 30,
    ) -> Dict[str, Any]:
        scores = [
            d.get("fairness_score", 50)
            for d in historical_data
            if "fairness_score" in d
        ]

        if len(scores) < 3:
            return {
                "predicted_score": scores[-1] if scores else 50,
                "confidence_interval": [40, 60],
                "trend": "insufficient_data",
                "factors": [],
            }

        scores_array = np.array(scores)
        x = np.arange(len(scores_array))
        coeffs = np.polyfit(x, scores_array, 1)
        slope = coeffs[0]

        future_x = len(scores) + time_horizon_days
        predicted = coeffs[0] * future_x + coeffs[1]
        predicted = max(0, min(100, predicted))

        std = np.std(scores_array)
        margin = std * (1 + time_horizon_days / 30)

        if slope > 0.5:
            trend = "improving"
        elif slope < -0.5:
            trend = "degrading"
        else:
            trend = "stable"

        return {
            "predicted_score": round(predicted, 1),
            "confidence_interval": [
                round(predicted - margin, 1),
                round(predicted + margin, 1),
            ],
            "trend": trend,
            "factors": [],
        }


trend_forecaster = TrendForecaster()

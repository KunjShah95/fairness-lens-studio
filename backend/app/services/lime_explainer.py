# backend/app/services/lime_explainer.py
import pandas as pd
import numpy as np
from typing import Dict, Any, List
from sklearn.ensemble import RandomForestClassifier
import logging

logger = logging.getLogger(__name__)


async def explain_instance(
    df: pd.DataFrame,
    instance_index: int,
    label_col: str,
    num_features: int = 5,
    num_samples: int = 5000,
) -> Dict[str, Any]:
    """Generate LIME-style local explanation for a single prediction."""
    try:
        from lime.lime_tabular import LimeTabularExplainer

        df_numeric = df.select_dtypes(include=[np.number]).copy()

        feature_cols = [c for c in df_numeric.columns if c != label_col]
        if not feature_cols:
            return {"error": "No numeric features available for explanation"}

        X = df_numeric[feature_cols].values
        y = (
            pd.to_numeric(df_numeric[label_col], errors="coerce")
            .fillna(0)
            .astype(int)
            .values
        )

        if instance_index >= len(df):
            return {"error": f"Instance index {instance_index} out of bounds"}

        model = RandomForestClassifier(n_estimators=50, random_state=42, n_jobs=-1)
        model.fit(X, y)

        explainer = LimeTabularExplainer(
            training_data=X,
            feature_names=feature_cols,
            class_names=["rejected", "approved"],
            mode="classification",
        )

        instance = X[instance_index]
        explanation = explainer.explain_instance(
            instance,
            model.predict_proba,
            num_features=num_features,
            num_samples=num_samples,
        )

        feature_weights = []
        for feature, weight in explanation.as_list():
            feature_weights.append(
                {
                    "feature": feature,
                    "weight": round(float(weight), 4),
                    "direction": "increases_approval"
                    if weight > 0
                    else "decreases_approval",
                }
            )

        feature_weights.sort(key=lambda x: abs(x["weight"]), reverse=True)

        prediction = int(model.predict([instance])[0])
        probabilities = model.predict_proba([instance])[0].tolist()

        return {
            "explanation": feature_weights,
            "prediction": prediction,
            "probability": {
                "rejected": round(probabilities[0], 4),
                "approved": round(probabilities[1], 4),
            },
            "instance_values": {
                feature_cols[i]: float(instance[i]) for i in range(len(feature_cols))
            },
            "method": "lime",
        }

    except ImportError:
        logger.warning("LIME not available, using permutation fallback")
        return await _permutation_explanation(
            df, instance_index, label_col, num_features
        )
    except Exception as e:
        logger.error(f"Error generating LIME explanation: {e}")
        return {"error": str(e)}


async def _permutation_explanation(
    df: pd.DataFrame, instance_index: int, label_col: str, num_features: int = 5
) -> Dict[str, Any]:
    from sklearn.inspection import permutation_importance

    df_numeric = df.select_dtypes(include=[np.number]).copy()
    feature_cols = [c for c in df_numeric.columns if c != label_col]

    X = df_numeric[feature_cols].values
    y = (
        pd.to_numeric(df_numeric[label_col], errors="coerce")
        .fillna(0)
        .astype(int)
        .values
    )

    model = RandomForestClassifier(n_estimators=50, random_state=42, n_jobs=-1)
    model.fit(X, y)

    instance = X[instance_index : instance_index + 1]

    perm_importance = permutation_importance(
        model,
        instance,
        y[instance_index : instance_index + 1],
        n_repeats=10,
        random_state=42,
        n_jobs=-1,
    )

    feature_weights = []
    for idx, feature in enumerate(feature_cols):
        feature_weights.append(
            {
                "feature": feature,
                "weight": round(float(perm_importance.importances_mean[idx]), 4),
                "direction": "increases_approval"
                if perm_importance.importances_mean[idx] > 0
                else "decreases_approval",
            }
        )

    feature_weights.sort(key=lambda x: abs(x["weight"]), reverse=True)

    prediction = int(model.predict(instance)[0])

    return {
        "explanation": feature_weights[:num_features],
        "prediction": prediction,
        "method": "permutation_fallback",
    }

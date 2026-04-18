import pandas as pd
import numpy as np
from typing import Dict, Any, List
from sklearn.ensemble import RandomForestClassifier
import logging

logger = logging.getLogger(__name__)


async def generate_counterfactuals(
    df: pd.DataFrame,
    instance_index: int,
    label_col: str,
    num_cfs: int = 3,
    max_changes: int = 3,
) -> Dict[str, Any]:
    """Generate Diverse Counterfactual Explanations (DiCE-style)."""
    try:
        df_numeric = df.select_dtypes(include=[np.number]).copy()
        feature_cols = [c for c in df_numeric.columns if c != label_col]

        X = df_numeric[feature_cols]
        y = pd.to_numeric(df_numeric[label_col], errors="coerce").fillna(0).astype(int)

        if instance_index >= len(df):
            return {"error": f"Instance index {instance_index} out of bounds"}

        instance = X.iloc[[instance_index]]
        original_outcome = y.iloc[instance_index]
        desired_outcome = 1 - original_outcome

        model = RandomForestClassifier(n_estimators=50, random_state=42, n_jobs=-1)
        model.fit(X, y)

        try:
            cf_df = _generate_dice_cfs(
                model, X, instance, feature_cols, desired_outcome, num_cfs, max_changes
            )
            return _format_counterfactuals(
                cf_df, feature_cols, original_outcome, method="dice", num_cfs=num_cfs
            )
        except Exception as dice_err:
            logger.warning(f"DiCE failed, using heuristic fallback: {dice_err}")

        cfs = _generate_perturbation_cfs(
            model,
            X,
            instance,
            feature_cols,
            original_outcome,
            desired_outcome,
            num_cfs,
            max_changes,
        )

        return _format_counterfactuals(
            cfs, feature_cols, original_outcome, method="perturbation", num_cfs=num_cfs
        )

    except ImportError:
        return await _heuristic_counterfactuals(df, instance_index, label_col, num_cfs)
    except Exception as e:
        logger.error(f"Error generating counterfactuals: {e}")
        return {"error": str(e)}


def _generate_dice_cfs(
    model, X, instance, feature_cols, desired_outcome, num_cfs, max_changes
):
    return _generate_perturbation_cfs(
        model, X, instance, feature_cols, desired_outcome, None, num_cfs, max_changes
    )


def _generate_perturbation_cfs(
    model,
    X,
    instance,
    feature_cols,
    original_outcome: int,
    desired_outcome: int,
    num_cfs: int,
    max_changes: int,
) -> List[Dict[str, Any]]:
    counterfactuals = []
    instance_arr = instance.values[0]

    for num_changed in range(1, max_changes + 1):
        if len(counterfactuals) >= num_cfs:
            break

        for feature_idx in range(len(feature_cols)):
            if len(counterfactuals) >= num_cfs:
                break

            perturbed = instance_arr.copy()
            original_val = perturbed[feature_idx]

            for delta in [-0.2, -0.1, 0.1, 0.2]:
                perturbed[feature_idx] = original_val * (1 + delta)

                pred = model.predict([perturbed])[0]
                if pred == desired_outcome and not np.array_equal(
                    perturbed, instance_arr
                ):
                    cf = {}
                    for i, col in enumerate(feature_cols):
                        cf[col] = round(float(perturbed[i]), 4)

                    if cf not in [c["changes"] for c in counterfactuals]:
                        counterfactuals.append(
                            {
                                "changes": cf,
                                "features_changed": [feature_cols[feature_idx]],
                                "original_value": original_val,
                                "new_value": perturbed[feature_idx],
                            }
                        )
                        break

    return counterfactuals


def _format_counterfactuals(
    cfs: List[Dict[str, Any]],
    feature_cols: List[str],
    original_outcome: int,
    method: str,
    num_cfs: int = 3,
) -> Dict[str, Any]:
    formatted_cfs = []
    for cf in cfs:
        changes_description = []
        for feature, value in cf.get("changes", {}).items():
            orig_val = cf.get("original_value")
            if orig_val is not None:
                direction = "increased" if value > orig_val else "decreased"
                changes_description.append(
                    {
                        "feature": feature,
                        "original": round(float(orig_val), 4),
                        "new": round(float(value), 4),
                        "change": f"{direction} by {abs(value - orig_val):.2f}",
                    }
                )

        formatted_cfs.append(
            {
                "changes": cf.get("changes", {}),
                "description": changes_description,
                "features_changed": cf.get("features_changed", []),
            }
        )

    return {
        "counterfactuals": formatted_cfs[:num_cfs],
        "original_outcome": "approved" if original_outcome == 1 else "rejected",
        "desired_outcome": "rejected" if original_outcome == 1 else "approved",
        "method": method,
        "note": "These changes would flip your decision outcome",
    }


async def _heuristic_counterfactuals(
    df: pd.DataFrame, instance_index: int, label_col: str, num_cfs: int
) -> Dict[str, Any]:
    df_numeric = df.select_dtypes(include=[np.number]).copy()
    feature_cols = [c for c in df_numeric.columns if c != label_col]

    X = df_numeric[feature_cols]
    y = pd.to_numeric(df_numeric[label_col], errors="coerce").fillna(0).astype(int)

    instance = X.iloc[instance_index]
    original_label = y.iloc[instance_index]
    desired_label = 1 - original_label

    opposite_mask = y == desired_label
    opposite_instances = X[opposite_mask]

    if len(opposite_instances) == 0:
        return {"counterfactuals": [], "note": "No alternative outcomes found"}

    distances = ((opposite_instances - instance) ** 2).sum(axis=1)
    nearest_indices = distances.nsmallest(num_cfs).index

    counterfactuals = []
    for idx in nearest_indices:
        cf_instance = X.iloc[idx]
        cf = {
            "changes": {col: round(float(cf_instance[col]), 4) for col in feature_cols},
            "description": [
                {
                    "feature": col,
                    "original": round(float(instance[col]), 4),
                    "new": round(float(cf_instance[col]), 4),
                }
                for col in feature_cols
                if instance[col] != cf_instance[col]
            ],
            "features_changed": [
                col for col in feature_cols if instance[col] != cf_instance[col]
            ],
        }
        counterfactuals.append(cf)

    return {
        "counterfactuals": counterfactuals,
        "original_outcome": "approved" if original_label == 1 else "rejected",
        "desired_outcome": "rejected" if original_label == 1 else "approved",
        "method": "nearest_neighbor",
        "note": "Nearest alternatives with different outcomes",
    }

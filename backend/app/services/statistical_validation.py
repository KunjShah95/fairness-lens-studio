import pandas as pd
import numpy as np
from typing import Dict, Any, List
from scipy import stats
from datetime import datetime

DEFAULT_MIN_GROUP_SIZE = 30
CONFIDENCE_LEVEL = 0.95


async def validate_statistical_significance(
    df: pd.DataFrame,
    protected_attrs: List[str],
    label_col: str,
    min_group_size: int = DEFAULT_MIN_GROUP_SIZE,
    confidence_level: float = CONFIDENCE_LEVEL,
) -> Dict[str, Any]:
    findings = []
    overall_valid = True

    for attr in protected_attrs:
        if attr not in df.columns:
            continue

        group_counts = df[attr].value_counts()
        min_size = group_counts.min() if len(group_counts) > 0 else 0

        try:
            contingency = pd.crosstab(df[attr], df[label_col])
            chi2, p_value, dof, expected = stats.chi2_contingency(contingency)
            is_independent = p_value < (1 - confidence_level)
        except Exception:
            chi2, p_value, is_independent = None, None, None

        try:
            n = len(df)
            min_dim = min(contingency.shape[0], contingency.shape[1]) - 1
            cramers_v = np.sqrt(chi2 / (n * min_dim)) if chi2 and min_dim > 0 else None
        except:
            cramers_v = None

        attr_findings = {
            "attribute": attr,
            "group_sizes": {str(k): int(v) for k, v in group_counts.items()},
            "min_group_size": int(min_size),
            "meets_minimum": min_size >= min_group_size,
            "chi_square": round(float(chi2), 4) if chi2 else None,
            "p_value": round(float(p_value), 4) if p_value else None,
            "statistically_significant": is_independent if is_independent else False,
            "cramers_v": round(float(cramers_v), 4) if cramers_v else None,
            "effect_size_label": _interpret_effect_size(cramers_v)
            if cramers_v
            else None,
        }

        findings.append(attr_findings)

        if min_size < min_group_size:
            overall_valid = False

    return {
        "findings": findings,
        "is_statistically_valid": overall_valid,
        "min_group_size_required": min_group_size,
        "confidence_level": confidence_level,
        "warnings": [
            f"Group size below {min_group_size} for {f['attribute']}"
            for f in findings
            if not f["meets_minimum"]
        ],
        "timestamp": datetime.now().isoformat(),
    }


def _interpret_effect_size(cramers_v: float) -> str:
    if cramers_v is None:
        return "unknown"
    if cramers_v < 0.1:
        return "negligible"
    elif cramers_v < 0.3:
        return "small"
    elif cramers_v < 0.5:
        return "medium"
    else:
        return "large"


async def estimate_required_sample_size(
    effect_size: float = 0.2, power: float = 0.80, alpha: float = 0.05
) -> int:
    z_alpha = stats.norm.ppf(1 - alpha / 2)
    z_beta = stats.norm.ppf(power)

    n = 2 * ((z_alpha + z_beta) / effect_size) ** 2
    return int(np.ceil(n))

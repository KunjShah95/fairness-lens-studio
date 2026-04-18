# backend/app/services/regulation_mapper.py
from typing import Dict, Any, List
from datetime import datetime

REGULATION_THRESHOLDS = {
    "gdpr_art22": {
        "name": "GDPR Article 22",
        "description": "Automated decision-making rights",
        "jurisdiction": "EU",
        "metrics": ["demographic_parity_ratio", "disparate_impact"],
        "threshold": 0.80,
        "action": "Provide human review for automated decisions below threshold",
    },
    "eu_ai_act_9": {
        "name": "EU AI Act Article 9",
        "description": "High-risk AI system requirements",
        "jurisdiction": "EU",
        "metrics": ["demographic_parity_ratio", "equal_opportunity_difference"],
        "threshold": 0.85,
        "action": "Implement conformity assessment",
    },
    "eu_ai_act_10": {
        "name": "EU AI Act Article 10",
        "description": "Data governance for AI systems",
        "jurisdiction": "EU",
        "metrics": ["proxy_features"],
        "threshold": 0,
        "action": "Document training data bias mitigation",
    },
    "eu_ai_act_13": {
        "name": "EU AI Act Article 13",
        "description": "Transparency obligations",
        "jurisdiction": "EU",
        "metrics": ["feature_importance"],
        "threshold": 0,
        "action": "Provide understandable explanations to affected persons",
    },
    "eeoc_4_5ths": {
        "name": "EEOC 4/5ths Rule",
        "description": "Disparate impact in employment",
        "jurisdiction": "US",
        "metrics": ["disparate_impact", "demographic_parity_ratio"],
        "threshold": 0.80,
        "action": "Validate business necessity if below threshold",
    },
    "hipaa_privacy": {
        "name": "HIPAA Privacy Rule",
        "description": "Protected health information",
        "jurisdiction": "US",
        "metrics": ["proxy_features"],
        "threshold": 0,
        "action": "Ensure no discrimination based on health information",
    },
    "iheda": {
        "name": "India Digital Personal Data Act",
        "description": "Data fiduciary obligations",
        "jurisdiction": "India",
        "metrics": ["demographic_parity_ratio"],
        "threshold": 0.75,
        "action": "Implement fairness assessments",
    },
}

DOMAIN_REGULATION_MAP = {
    "healthcare": ["gdpr_art22", "eu_ai_act_9", "hipaa_privacy"],
    "hiring": ["gdpr_art22", "eu_ai_act_9", "eu_ai_act_13", "eeoc_4_5ths"],
    "lending": ["gdpr_art22", "eu_ai_act_9", "eeoc_4_5ths"],
    "insurance": ["gdpr_art22", "eu_ai_act_9", "hipaa_privacy"],
}


def get_applicable_regulations(domain: str) -> List[str]:
    return DOMAIN_REGULATION_MAP.get(domain.lower(), ["gdpr_art22"])


async def map_metrics_to_regulations(
    metrics: Dict[str, Any], domain: str
) -> Dict[str, Any]:
    applicable = get_applicable_regulations(domain)
    findings = []

    for reg_key in applicable:
        reg = REGULATION_THRESHOLDS.get(reg_key)
        if not reg:
            continue

        for metric_name in reg["metrics"]:
            metric_value = None
            metric_source = None

            for attr, attr_metrics in metrics.items():
                if isinstance(attr_metrics, dict):
                    if metric_name in attr_metrics:
                        metric_value = attr_metrics[metric_name]
                        metric_source = attr
                        break

            if metric_value is None:
                continue

            is_violated = metric_value is not None and (
                reg["threshold"] > 0 and metric_value < reg["threshold"]
            )

            if is_violated:
                findings.append(
                    {
                        "regulation": reg["name"],
                        "description": reg["description"],
                        "jurisdiction": reg["jurisdiction"],
                        "metric": metric_name,
                        "value": round(float(metric_value), 4),
                        "threshold": reg["threshold"],
                        "status": "at_risk"
                        if metric_value < reg["threshold"]
                        else "compliant",
                        "action_required": reg["action"],
                        "source_attribute": metric_source,
                    }
                )

    total_checked = len(findings)
    at_risk = sum(1 for f in findings if f["status"] == "at_risk")

    return {
        "regulations": findings,
        "summary": {
            "total_checked": total_checked,
            "at_risk": at_risk,
            "compliant": total_checked - at_risk,
            "overall_status": "at_risk" if at_risk > 0 else "compliant",
        },
        "timestamp": datetime.now().isoformat(),
    }


async def get_regulation_details(reg_key: str) -> Dict[str, Any]:
    return REGULATION_THRESHOLDS.get(reg_key, {})


async def list_regulations(domain: str = None) -> List[Dict[str, Any]]:
    if domain:
        applicable = get_applicable_regulations(domain)
        return [
            REGULATION_THRESHOLDS[k] for k in applicable if k in REGULATION_THRESHOLDS
        ]
    return list(REGULATION_THRESHOLDS.values())

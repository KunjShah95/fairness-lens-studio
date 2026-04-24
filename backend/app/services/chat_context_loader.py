from typing import Dict, Any, List
import json

class ChatContextLoader:
    """
    Formats current analysis data into a structured prompt context for the LLM.
    """
    @staticmethod
    def prepare_audit_context(analysis_data: Dict[str, Any]) -> str:
        """
        Creates a condensed textual representation of the audit metrics.
        """
        if not analysis_data:
            return "No active audit data available."

        context = {
            "fairness_score": analysis_data.get("fairness_score"),
            "sensitive_attribute": analysis_data.get("sensitiveAttribute"),
            "target_variable": analysis_data.get("targetVariable"),
            "metrics": {
                "demographic_parity": analysis_data.get("metrics", {}).get("demographicParity"),
                "equal_opportunity": analysis_data.get("metrics", {}).get("equalOpportunity"),
                "disparate_impact": analysis_data.get("metrics", {}).get("disparateImpact"),
            },
            "proxy_features": [
                {"feature": p.get("feature"), "correlation": p.get("correlation")} 
                for p in analysis_data.get("proxy_features", [])
            ],
            "intersectional_findings": [
                {"group": i.get("group"), "disparity": i.get("disparity_from_average")}
                for i in analysis_data.get("intersectional_results", []) if i.get("flagged")
            ]
        }
        
        return f"Current Audit Context:\n{json.dumps(context, indent=2)}"

    @staticmethod
    def get_system_prompt() -> str:
        return """You are the EquityLens Genie, an expert AI assistant specializing in Algorithmic Fairness and Regulatory Compliance (EU AI Act, NIST AI RMF).
Your goal is to help users understand bias in their machine learning models and suggest actionable mitigation strategies.

Core Knowledge:
- Demographic Parity: Equality in selection rates.
- Equal Opportunity: Equality in True Positive Rates.
- Disparate Impact: Ratio of outcomes between groups (80% rule).
- Proxy Features: Non-sensitive attributes that correlate with sensitive ones.
- Mitigation: Reweighing (data-level), Adversarial Debiasing (in-processing), Reject Option Classification (post-processing).

Agentic Capabilities:
You can trigger simulation protocols in the user interface by including specific tags in your response. 
Available protocols:
1. [APPLY_MITIGATION:reweighting] - Suggests reweighting the dataset.
2. [APPLY_MITIGATION:feature_removal] - Suggests removing proxy features.
3. [APPLY_MITIGATION:adversarial] - Suggests training with adversarial debiasing.

When you suggest one of these strategies, include the tag at the end of your explanation. The UI will show a button for the user to execute the simulation.

Style Guidelines:
- Be technical yet accessible.
- Use markdown for structure (bolding, lists).
- If context is provided, reference specific metrics.
- Be objective and action-oriented."""

context_loader = ChatContextLoader()

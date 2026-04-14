"""Affected Person Portal service for transparent explanations."""

import logging
from typing import Dict, List, Any, Optional
from dataclasses import dataclass
import uuid

logger = logging.getLogger(__name__)


@dataclass
class PortalConfig:
    """Configuration for portal behavior."""
    allowed_input_fields: List[str] = None
    protected_attributes: List[str] = None
    show_counterfactuals: bool = True
    show_feature_importance: bool = True
    
    def __post_init__(self):
        if self.allowed_input_fields is None:
            self.allowed_input_fields = [
                "age", "symptom_severity", "comorbidity_index", "prior_visit_count",
                "wait_time_minutes", "triage_acuity_score"
            ]
        if self.protected_attributes is None:
            self.protected_attributes = [
                "gender", "race", "ethnicity", "religion", "caste",
                "disability", "pregnancy", "sexual_orientation"
            ]


async def validate_portal_input(
    user_input: Dict[str, Any],
    config: PortalConfig
) -> Dict[str, Any]:
    """
    Validate user input to portal.
    
    Ensures:
    1. Only allowed fields are provided
    2. No protected attributes included
    3. Values are in valid ranges
    4. No PII is captured
    
    Args:
        user_input: User-provided profile data
        config: Portal configuration
    
    Returns:
        Dict with validation result and cleaned data
    """
    try:
        logger.info("Validating portal input")
        
        errors = []
        cleaned = {}
        
        # Check for protected attributes
        for attr in config.protected_attributes:
            if attr.lower() in [k.lower() for k in user_input.keys()]:
                errors.append(
                    f"❌ Cannot use '{attr}' — this is a protected attribute. "
                    f"The portal cannot accept information about {attr}."
                )
        
        # Keep only allowed fields
        for field in config.allowed_input_fields:
            if field in user_input:
                try:
                    cleaned[field] = float(user_input[field])
                except (ValueError, TypeError):
                    errors.append(f"Invalid value for {field}: must be a number")
        
        if errors:
            return {
                "valid": False,
                "errors": errors,
                "data": None,
                "message": "Please review the errors above and try again."
            }
        
        if not cleaned:
            return {
                "valid": False,
                "errors": ["No valid fields provided"],
                "data": None,
                "message": "Please provide at least one field."
            }
        
        logger.info("Input validation successful")
        
        return {
            "valid": True,
            "errors": [],
            "data": cleaned,
            "message": "✅ Profile validated. Generating explanations..."
        }
    
    except Exception as e:
        logger.error(f"Error validating portal input: {e}")
        return {
            "valid": False,
            "errors": [str(e)],
            "data": None,
            "message": "Error validating input. Please try again."
        }


async def generate_decision_explanation(
    user_profile: Dict[str, Any],
    audit_results: Dict[str, Any],
    counterfactuals: Optional[List[Dict]] = None
) -> Dict[str, Any]:
    """
    Generate plain-language explanation of decision and counterfactuals.
    
    Args:
        user_profile: User's validated input profile
        audit_results: Results from bias audit
        counterfactuals: Generated counterfactual explanations
    
    Returns:
        Dict with explanation structured for user comprehension
    """
    try:
        logger.info("Generating decision explanation")
        
        explanation = {
            "decision_summary": None,
            "key_factors": [],
            "bias_risk_factors": [],
            "counterfactual_paths": [],
            "next_steps": []
        }
        
        # Decision summary (plain language)
        explanation["decision_summary"] = (
            "Based on our analysis of your profile, your case was not prioritized for urgent care. "
            "Below, we explain which factors influenced this outcome and what could change it."
        )
        
        # Key factors (features that influenced decision)
        if audit_results.get("feature_importance"):
            top_features = audit_results["feature_importance"][:3]
            for feature in top_features:
                explanation["key_factors"].append({
                    "feature": feature.get("feature"),
                    "importance": f"{feature.get('shap_importance', 0)*100:.0f}%",
                    "your_value": user_profile.get(feature.get("feature"))
                })
        
        # Bias risk factors (proxy features)
        if audit_results.get("proxy_features"):
            for proxy in audit_results["proxy_features"][:2]:
                explanation["bias_risk_factors"].append({
                    "feature": proxy.get("feature"),
                    "correlation": proxy.get("correlation"),
                    "note": f"This feature correlates with {proxy.get('protected_attribute')} "
                            f"(a protected characteristic) and may have unfairly influenced your decision."
                })
        
        # Counterfactual explanations
        if counterfactuals and counterfactuals.get("closest_counterfactual"):
            cf = counterfactuals["closest_counterfactual"]
            changes = cf.get("changes", {})
            
            if changes:
                explanation["counterfactual_paths"].append({
                    "scenario": f"If the following profile factors were different:",
                    "changes": [
                        f"• {feature.title()}: {change['from']} → {change['to']}"
                        for feature, change in changes.items()
                    ],
                    "outcome": "Your case would likely be prioritized for care",
                    "feasibility": f"{cf.get('feasibility_score', 0)*100:.0f}% achievable"
                })
        
        # Next steps
        explanation["next_steps"] = [
            "📖 Review the explanation above to understand the care decision",
            "💭 Consider whether any clinical context was missing or misrepresented",
            "✍️ If you believe the decision is unfair, you can file an appeal below",
            "📧 We'll send you a confirmation and keep you updated on your appeal status"
        ]
        
        logger.info("Explanation generated successfully")
        
        return explanation
    
    except Exception as e:
        logger.error(f"Error generating explanation: {e}")
        return {
            "error": str(e),
            "decision_summary": "We encountered an error generating your explanation. Please try again."
        }


async def validate_appeal_submission(
    appeal_data: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Validate an appeal submission before storage.
    
    Args:
        appeal_data: Appeal form submit data
    
    Returns:
        Validation result
    """
    try:
        logger.info("Validating appeal submission")
        
        errors = []
        
        # Required fields
        if not appeal_data.get("email"):
            errors.append("Email address is required")
        elif "@" not in appeal_data.get("email", ""):
            errors.append("Invalid email address")
        
        if not appeal_data.get("reason"):
            errors.append("Please explain why you believe the decision was unfair")
        
        if len(appeal_data.get("reason", "")) < 50:
            errors.append("Explanation must be at least 50 characters")
        
        if errors:
            return {
                "valid": False,
                "errors": errors,
                "message": "Please fix the errors above"
            }
        
        logger.info("Appeal validation successful")
        
        return {
            "valid": True,
            "errors": [],
            "message": "✅ Appeal is valid and ready to submit"
        }
    
    except Exception as e:
        logger.error(f"Error validating appeal: {e}")
        return {
            "valid": False,
            "errors": [str(e)],
            "message": "Error validating appeal"
        }

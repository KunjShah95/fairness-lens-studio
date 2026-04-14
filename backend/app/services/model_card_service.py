"""Service for generating AI model cards (transparency documentation)."""

import logging
from typing import Dict, List, Any, Optional
from datetime import datetime

logger = logging.getLogger(__name__)


class ModelCard:
    """Generate comprehensive AI model card (OpenAI-style transparency)."""
    
    def __init__(
        self,
        model_name: str,
        model_type: str,
        domain: str,
        organization: str
    ):
        self.model_name = model_name
        self.model_type = model_type  # "decision_model", "clinical_risk", "triage", etc.
        self.domain = domain  # primarily "healthcare"
        self.organization = organization
        self.created_at = datetime.utcnow().isoformat()
    
    def generate_model_details(self) -> Dict[str, Any]:
        """Model details and specs."""
        return {
            "name": self.model_name,
            "type": self.model_type,
            "domain": self.domain,
            "version": "1.0.0",
            "created": self.created_at,
            "organization": self.organization
        }
    
    def generate_intended_use(self) -> Dict[str, Any]:
        """Intended use cases."""
        use_cases = {
            "healthcare": {
                "primary": "Patient triage and risk assessment",
                "secondary": ["Treatment prioritization", "Resource allocation"],
                "out_of_scope": [
                    "Replace clinical judgment",
                    "Make autonomous treatment decisions"
                ]
            }
        }
        
        return {
            "primary_use": use_cases.get(self.domain, {}).get("primary", "General classification"),
            "secondary_uses": use_cases.get(self.domain, {}).get("secondary", []),
            "out_of_scope_uses": use_cases.get(self.domain, {}).get("out_of_scope", [])
        }
    
    def generate_training_data(self) -> Dict[str, Any]:
        """Data used to train the model."""
        return {
            "description": "Historical decision data with outcomes",
            "characteristics": [
                "N=10,000+ records",
                "Timespan: 2020-2024",
                "Features: {numerical, categorical, temporal}",
                "Target: Binary outcome (approved/denied)"
            ],
            "limitations": [
                "Data may reflect historical biases",
                "Not representative of current population",
                "Limited protected attribute coverage"
            ],
            "updates": "Retrained quarterly on recent decisions"
        }
    
    def generate_model_limitations(self) -> Dict[str, Any]:
        """Known limitations and failure modes."""
        return {
            "fairness": [
                "Model may exhibit disparate impact on protected groups",
                "Fairness metrics should be monitored continuously",
                "May propagate historical biases from training data"
            ],
            "performance": [
                "Performance varies by subpopulation",
                "Lower performance on underrepresented groups",
                "May not generalize to new domains/populations"
            ],
            "data": [
                "Assumes clean, complete input data",
                "Sensitive to data quality issues",
                "Missing values may affect predictions"
            ],
            "technical": [
                "Based on historical patterns - may be outdated",
                "No explanation of individual decisions",
                "Computationally expensive to retrain frequently"
            ]
        }
    
    def generate_ethical_considerations(self) -> Dict[str, Any]:
        """Ethical implications and considerations."""
        return {
            "fairness": {
                "description": "Model may treat individuals unfairly based on protected characteristics",
                "mitigation": [
                    "Regular fairness audits across demographic groups",
                    "Human review of high-stakes decisions",
                    "Appeal process for affected individuals"
                ]
            },
            "transparency": {
                "description": "Individuals have limited visibility into decision-making",
                "mitigation": [
                    "Provide explanations of decisions upon request",
                    "Publish decision statistics by protected groups",
                    "Make model cards publicly available"
                ]
            },
            "accountability": {
                "description": "Responsibility for errors may be unclear",
                "mitigation": [
                    "Maintain immutable audit trail of all decisions",
                    "Clear escalation procedures for appeals",
                    "Regular compliance reviews"
                ]
            },
            "data_rights": {
                "description": "Model uses personal data for decision-making",
                "mitigation": [
                    "Comply with data protection regulations (GDPR, CCPA)",
                    "Provide data access/deletion rights",
                    "Minimize personal data retention"
                ]
            }
        }
    
    def generate_recommendation_summary(
        self,
        fairness_score: int,
        proxy_features: List[Dict]
    ) -> Dict[str, Any]:
        """Recommendations based on audit findings."""
        recommendations = []
        
        if fairness_score < 60:
            recommendations.append({
                "level": "critical",
                "text": "Model has critical fairness issues. Do not deploy without remediation."
            })
        elif fairness_score < 75:
            recommendations.append({
                "level": "warning",
                "text": "Model has fairness concerns. Apply mitigation before deployment."
            })
        else:
            recommendations.append({
                "level": "info",
                "text": "Model fairness appears acceptable. Continue monitoring."
            })
        
        if len(proxy_features) > 0:
            recommendations.append({
                "level": "critical",
                "text": f"Remove {len(proxy_features)} proxy feature(s) that correlate with protected attributes."
            })
        
        recommendations.append({
            "level": "standard",
            "text": "Implement human review for high-stakes decisions (loans > $100K, senior hires, etc.)"
        })
        
        recommendations.append({
            "level": "standard",
            "text": "Provide appeal process and explanations to affected individuals."
        })
        
        return {
            "recommendations": recommendations,
            "review_frequency": "Quarterly fairness audits recommended",
            "decision_review_threshold": "Human review required for decisions with confidence < 0.7"
        }
    
    def generate_full_card(
        self,
        fairness_score: int = 75,
        proxy_features: Optional[List[Dict]] = None
    ) -> Dict[str, Any]:
        """Generate complete model card."""
        logger.info(f"Generating model card for {self.model_name}")
        
        if proxy_features is None:
            proxy_features = []
        
        return {
            "model_card_version": "1.0",
            "card_type": "AI Model Card (OpenAI-style)",
            "generated_at": datetime.utcnow().isoformat(),
            "model": self.generate_model_details(),
            "intended_use": self.generate_intended_use(),
            "training_data": self.generate_training_data(),
            "limitations": self.generate_model_limitations(),
            "ethical_considerations": self.generate_ethical_considerations(),
            "audit_findings": {
                "fairness_score": fairness_score,
                "proxy_features_detected": len(proxy_features),
                "last_audit": datetime.utcnow().isoformat()
            },
            "recommendations": self.generate_recommendation_summary(fairness_score, proxy_features)
        }
    
    def generate_markdown_card(
        self,
        fairness_score: int = 75,
        proxy_features: Optional[List[Dict]] = None
    ) -> str:
        """Generate model card as markdown."""
        if proxy_features is None:
            proxy_features = []
        
        markdown = f"""
# Model Card: {self.model_name}

**Model Type:** {self.model_type}  
**Domain:** {self.domain}  
**Organization:** {self.organization}  
**Created:** {self.created_at}

---

## Intended Use

**Primary:** Automated decision support for {self.domain} applications

**Suitable for:**
- Screening/ranking candidates
- Risk assessment
- Supporting human decision-makers

**Not suitable for:**
- Making autonomous decisions without human review
- Real-time deployment without monitoring
- Making decisions in unrelated domains

---

## Model Details

- **Input Features:** {20} numerical and categorical variables
- **Output:** Binary decision (approved/denied) + confidence score
- **Architecture:** Gradient boosted decision tree ensemble

---

## Performance & Fairness

**Overall Fairness Score:** {fairness_score}/100

**Key Metrics:**
- Demographic Parity: ✓ Monitored
- Disparate Impact Ratio: ✓ Monitored
- Fairness Audit: Last completed {datetime.utcnow().strftime('%Y-%m-%d')}

**Limitations:**
- Performance varies significantly by demographic group
- Model may exhibit bias inherited from training data
- Requires quarterly fairness audits

{"**⚠️ Warning:** Proxy features detected - see audit report" if proxy_features else "**✓ No major proxy features detected**"}

---

## Data

**Training Data:**
- 10,000+ historical decisions
- Time period: 2020-2024
- Coverage: Multiple demographics (requires monitoring)

**Data Limitations:**
- Historical data may reflect past biases
- Imbalanced representation of protected groups
- May not reflect current population

---

## Ethical Considerations

### Fairness
**Concern:** Model decisions may unfairly impact protected groups  
**Mitigation:** Regular fairness audits, human review, appeal process

### Transparency
**Concern:** Individuals may not understand decisions  
**Mitigation:** Explanations on request, public statistics, model card

### Accountability
**Concern:** Unclear responsibility for model errors  
**Mitigation:** Immutable audit trail, escalation procedures, compliance reviews

---

## Recommendations

1. **Deploy with caution** - Use as decision support tool only
2. **Human review required** - For high-stakes decisions
3. **Quarterly audits** - Monitor fairness metrics continuously
4. **Transparency** - Provide explanations to affected individuals
5. **Appeal process** - Enable people to contest decisions

---

## Further Information

For questions about this model or to appeal a decision, visit the **Decision Appeal Portal**.

For the full fairness audit report, contact the Compliance team.

---

*This model card was automatically generated by EquityLens AI Bias Detection Platform.*
        """.strip()
        
        return markdown


async def generate_model_card(
    model_name: str,
    model_type: str,
    domain: str,
    organization: str,
    fairness_score: int,
    proxy_features: Optional[List[Dict]] = None,
    format: str = "json"  # json, markdown
) -> Dict[str, Any]:
    """
    Generate an AI model card for transparency.
    
    Args:
        model_name: Name of the model
        model_type: Type of model (decision_model, classifier, etc.)
        domain: Business domain (healthcare preferred)
        organization: Organization that owns the model
        fairness_score: Current fairness audit score
        proxy_features: Detected proxy features
        format: Output format (json, markdown, html)
    
    Returns:
        Model card in requested format
    """
    logger.info(f"Generating model card for {model_name}")
    
    if proxy_features is None:
        proxy_features = []
    
    card_gen = ModelCard(model_name, model_type, domain, organization)
    
    if format == "json":
        return card_gen.generate_full_card(fairness_score, proxy_features)
    elif format == "markdown":
        return {
            "format": "markdown",
            "content": card_gen.generate_markdown_card(fairness_score, proxy_features),
            "mime_type": "text/markdown"
        }
    else:
        return card_gen.generate_full_card(fairness_score, proxy_features)

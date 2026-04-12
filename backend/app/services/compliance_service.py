"""Compliance mapper service for jurisdiction-specific regulations."""

import logging
from typing import Dict, List, Any, Optional
from enum import Enum

logger = logging.getLogger(__name__)


class JurisdictionEnum(str, Enum):
    """Supported jurisdictions and their regulations."""
    US_FEDERAL = "us_federal"
    EU_GDPR = "eu_gdpr"
    UK_EQUALITY = "uk_equality"
    CALIFORNIA_CCPA = "california_ccpa"
    NEW_YORK = "new_york"
    GENERAL = "general"


class ComplianceStandard:
    """Single compliance standard/regulation."""
    
    def __init__(
        self,
        code: str,
        name: str,
        description: str,
        requirements: List[str],
        applies_to: List[str],  # ["hiring", "lending", "housing", etc.]
        jurisdiction: str
    ):
        self.code = code
        self.name = name
        self.description = description
        self.requirements = requirements
        self.applies_to = applies_to
        self.jurisdiction = jurisdiction
    
    def applies_to_domain(self, domain: str) -> bool:
        """Check if this standard applies to the given domain."""
        return domain in self.applies_to or "all" in self.applies_to


class ComplianceFramework:
    """Collection of compliance standards for a jurisdiction."""
    
    # Pre-defined compliance standards
    STANDARDS = {
        # US FEDERAL
        "equal_employment_opportunity": ComplianceStandard(
            code="EEO",
            name="Equal Employment Opportunity Act",
            description="Prohibits discrimination based on protected characteristics",
            requirements=[
                "Document all hiring decisions",
                "Maintain equal selection rates across protected groups",
                "Demonstrate business necessity for screening criteria",
                "Conduct regular disparate impact analysis"
            ],
            applies_to=["hiring"],
            jurisdiction="us_federal"
        ),
        
        "fair_lending": ComplianceStandard(
            code="FCRA",
            name="Fair Credit Reporting Act",
            description="Regulates use of credit reports and automated decisions",
            requirements=[
                "Use valid predictive models",
                "Avoid redlining (discrimination by geography/race)",
                "Regular monitoring for disparate impact",
                "Transparency in credit decisions",
                "Right to explanation for adverse decisions"
            ],
            applies_to=["lending"],
            jurisdiction="us_federal"
        ),
        
        # EU GDPR
        "right_to_explanation": ComplianceStandard(
            code="GDPR-22",
            name="Right to Explanation (GDPR Article 22)",
            description="Individuals have right to explanation of automated decisions",
            requirements=[
                "Provide meaningful information about decision logic",
                "Explain individual-specific factors in decision",
                "Allow appeal of automated decision",
                "Ensure human review is available"
            ],
            applies_to=["all"],
            jurisdiction="eu_gdpr"
        ),
        
        "data_protection": ComplianceStandard(
            code="GDPR-5",
            name="Data Protection Principles (GDPR Article 5)",
            description="Data must be processed lawfully, fairly, transparently",
            requirements=[
                "No collection of sensitive personal data for screening",
                "Data minimization (collect only necessary data)",
                "Ensure data quality and accuracy",
                "Limited retention periods",
                "Implement privacy by design"
            ],
            applies_to=["all"],
            jurisdiction="eu_gdpr"
        ),
        
        # UK EQUALITY ACT
        "equality_act_2010": ComplianceStandard(
            code="EQA-2010",
            name="Equality Act 2010",
            description="Prohibits discrimination on protected grounds",
            requirements=[
                "No direct or indirect discrimination",
                "No harassment or victimization",
                "Reasonable adjustments for disabilities",
                "Transparency in decision processes"
            ],
            applies_to=["all"],
            jurisdiction="uk_equality"
        ),
        
        # CALIFORNIA
        "employment_bias": ComplianceStandard(
            code="CA-FEHA",
            name="California Fair Employment Act",
            description="Prohibits employment discrimination",
            requirements=[
                "Regular audits for bias in hiring/promotion",
                "Document selection criteria",
                "Ensure equal pay for equal work",
                "Maintain diversity in workforce"
            ],
            applies_to=["hiring"],
            jurisdiction="california_ccpa"
        ),
        
        # NEW YORK
        "algorithmic_accountability": ComplianceStandard(
            code="NYC-11602",
            name="NYC Algorithmic Accountability (LL 375)",
            description="Auditing of automated decisions in hiring",
            requirements=[
                "Annual bias audit of hiring algorithms",
                "Disclosure of use of automated decision systems",
                "Impact assessment prior to deployment",
                "Public posting of results of audits"
            ],
            applies_to=["hiring"],
            jurisdiction="new_york"
        ),
    }
    
    def __init__(self, jurisdiction: str):
        self.jurisdiction = jurisdiction
        self.standards = self._load_standards_for_jurisdiction(jurisdiction)
    
    def _load_standards_for_jurisdiction(self, jurisdiction: str) -> List[ComplianceStandard]:
        """Load relevant standards for jurisdiction."""
        standards = []
        for standard in self.STANDARDS.values():
            if standard.jurisdiction == jurisdiction or jurisdiction == "general":
                standards.append(standard)
        return standards
    
    def get_applicable_standards(self, domain: str) -> List[Dict[str, Any]]:
        """Get standards applicable to domain."""
        applicable = [
            s for s in self.standards
            if s.applies_to_domain(domain)
        ]
        return [
            {
                "code": s.code,
                "name": s.name,
                "description": s.description,
                "requirements": s.requirements
            }
            for s in applicable
        ]


class ComplianceChecker:
    """Check audit results against compliance standards."""
    
    @staticmethod
    def check_compliance(
        audit_results: Dict[str, Any],
        jurisdiction: str,
        domain: str
    ) -> Dict[str, Any]:
        """
        Check audit results against applicable compliance standards.
        
        Args:
            audit_results: Results from bias audit
            jurisdiction: Target jurisdiction
            domain: Business domain (hiring, lending, etc.)
        
        Returns:
            Compliance report
        """
        logger.info(f"Checking compliance for {jurisdiction}/{domain}")
        
        framework = ComplianceFramework(jurisdiction)
        standards = framework.get_applicable_standards(domain)
        
        fairness_score = audit_results.get("fairness_score", 0)
        proxy_features = audit_results.get("proxy_features", [])
        
        # Compliance assessment
        compliance_checks = []
        
        for standard_info in standards:
            standard_code = standard_info["code"]
            met = True
            issues = []
            
            # EEO / Equal Employment: fairness score should be >= 75
            if standard_code == "EEO":
                if fairness_score < 75:
                    met = False
                    issues.append(f"Fairness score {fairness_score} below EEO threshold (75)")
                if len(proxy_features) > 0:
                    met = False
                    issues.append(f"Proxy features detected: {[p.get('feature') for p in proxy_features]}")
            
            # Fair Lending: fairness score >= 80
            elif standard_code == "FCRA":
                if fairness_score < 80:
                    met = False
                    issues.append(f"Fairness score {fairness_score} below Fair Lending threshold (80)")
                # Check for geographic bias (postal_code, zip, address as proxies)
                geo_proxies = [p for p in proxy_features if any(
                    x in p.get('feature', '').lower() 
                    for x in ['zip', 'postal', 'address', 'location']
                )]
                if geo_proxies:
                    met = False
                    issues.append(f"Redlining risk: geographic data detected as proxy")
            
            # GDPR Right to Explanation: audit must compute feature importance
            elif standard_code == "GDPR-22":
                if not audit_results.get("feature_importance"):
                    met = False
                    issues.append("Feature importance (SHAP) not computed - required for explanations")
            
            # GDPR Data Protection: flag proxy features
            elif standard_code == "GDPR-5":
                if len(proxy_features) > 0:
                    met = False
                    issues.append(f"Protected attribute proxies detected: {[p.get('feature') for p in proxy_features]}")
            
            # Equality Act: fairness score >= 75
            elif standard_code == "EQA-2010":
                if fairness_score < 75:
                    met = False
                    issues.append(f"Fairness score {fairness_score} below equality threshold (75)")
            
            # CA FEHA: fairness score >= 75
            elif standard_code == "CA-FEHA":
                if fairness_score < 75:
                    met = False
                    issues.append(f"Fairness score {fairness_score} below CA FEHA threshold (75)")
            
            # NYC Algorithmic Accountability: audit must be documented
            elif standard_code == "NYC-11602":
                if not audit_results.get("causal_analysis"):
                    met = False
                    issues.append("Causal analysis required for NYC algorithmic accountability")
            
            compliance_checks.append({
                "standard": standard_code,
                "name": standard_info["name"],
                "compliant": met,
                "issues": issues
            })
        
        # Overall compliance
        all_compliant = all(c["compliant"] for c in compliance_checks)
        risk_level = "low" if all_compliant else "medium" if fairness_score >= 70 else "high"
        
        return {
            "jurisdiction": jurisdiction,
            "domain": domain,
            "overall_compliant": all_compliant,
            "risk_level": risk_level,
            "checks": compliance_checks,
            "recommendations": ComplianceChecker._get_recommendations(
                jurisdiction,
                domain,
                fairness_score,
                proxy_features
            )
        }
    
    @staticmethod
    def _get_recommendations(
        jurisdiction: str,
        domain: str,
        fairness_score: int,
        proxy_features: List[Dict]
    ) -> List[str]:
        """Generate recommendations based on compliance gaps."""
        recommendations = []
        
        if fairness_score < 60:
            recommendations.append("⚠️ CRITICAL: Fairness score below 60. Consider halting model use pending remediation.")
            recommendations.append("Implement mitigation techniques (reweighting, feature removal, adversarial debiasing).")
        
        if fairness_score < 75:
            recommendations.append("⚠️ WARNING: Fairness score below regulatory threshold. Escalate for review.")
        
        if len(proxy_features) > 0:
            recommendations.append(f"REMOVE PROXIES: {len(proxy_features)} potential proxy features detected.")
            for proxy in proxy_features[:3]:
                recommendations.append(
                    f"  • {proxy.get('feature')} (corr={proxy.get('correlation'):.2f} with {proxy.get('protected_attribute')})"
                )
        
        if jurisdiction == "eu_gdpr":
            recommendations.append("Implement right-to-explanation portal for affected individuals (IP-Required).")
            recommendations.append("Document data processing for data protection impact assessment.")
        
        if jurisdiction == "new_york" and domain == "hiring":
            recommendations.append("Prepare annual algorithmic audit report for NYC compliance (LL 375).")
        
        if not recommendations:
            recommendations.append("✅ Model appears compliant with applicable regulations.")
        
        return recommendations


async def get_compliance_report(
    audit_results: Dict[str, Any],
    jurisdiction: str,
    domain: str
) -> Dict[str, Any]:
    """
    Generate a comprehensive compliance report.
    
    Args:
        audit_results: Results from bias audit
        jurisdiction: Target jurisdiction
        domain: Business domain
    
    Returns:
        Compliance report
    """
    logger.info(f"Generating compliance report for {jurisdiction}/{domain}")
    
    compliance_check = ComplianceChecker.check_compliance(
        audit_results,
        jurisdiction,
        domain
    )
    
    return {
        "report_type": "compliance_assessment",
        "generated_at": datetime.utcnow().isoformat(),
        "jurisdiction": jurisdiction,
        "domain": domain,
        **compliance_check
    }


# Import at end to avoid circular dependency
from datetime import datetime

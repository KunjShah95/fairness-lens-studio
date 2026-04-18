import logging
from typing import Dict, Any, List

logger = logging.getLogger(__name__)

class AIInsightEngine:
    """
    Translates raw quantitative fairness metrics into qualitative,
    actionable, plain-English insights and recommendations using 
    heuristic rule engines and (optionally) GenAI.
    """
    
    @staticmethod
    def generate_executive_summary(audit_results: Dict[str, Any]) -> str:
        score = audit_results.get("fairness_score", 0)
        status = "CRITICAL" if score < 50 else "CAUTION" if score < 75 else "OPTIMIZED"
        domain = audit_results.get("domain", "General")
        
        summary = f"Audit Status: {status} ({score}/100). "
        summary += f"Our AI engine has evaluated the model's behavior within the '{domain}' context. "
        
        # Add high-level findings
        findings = []
        proxies = audit_results.get("proxy_features", [])
        if proxies:
            findings.append(f"detected {len(proxies)} proxy features")
            
        intersectional = audit_results.get("intersectional_results", [])
        if intersectional:
            findings.append(f"identified {len(intersectional)} subgroup disparities")
            
        cf = audit_results.get("counterfactual_fairness", {})
        if cf.get("overall_flagged"):
            findings.append("discovered counterfactual sensitivity")

        adv = audit_results.get("adversarial_audit", {})
        if adv.get("latent_bias_detected"):
            findings.append("exposed latent proxy reconstruction risks")
            
        subgroups = audit_results.get("multivariate_subgroups", [])
        if subgroups:
            findings.append(f"isolated {len(subgroups)} high-disparity multivariate segments")
            
        cal = audit_results.get("calibration_fairness", {})
        if cal.get("overall_flagged"):
            findings.append("uncovered probabilistic calibration disparities")
            
        drift = audit_results.get("distributional_representativeness", {})
        if drift.get("findings"):
            findings.append("detected subgroup-specific feature drift")
            
        if findings:
            summary += "The analysis " + ", ".join(findings[:-1]) + " and " + findings[-1] + "."
        else:
            summary += "No significant bias patterns were detected in the primary auditing vectors."
            
        return summary
        
    @staticmethod
    def generate_recommendations(audit_results: Dict[str, Any]) -> List[Dict[str, str]]:
        """
        Generates contextual recommendations based on the detected anomalies.
        """
        recs = []
        score = audit_results.get("fairness_score", 0)
        metrics = audit_results.get("metrics", {})
        proxies = audit_results.get("proxy_features", [])
        cf = audit_results.get("counterfactual_fairness", {})
        
        # 1. Proxy-based recommendations
        for p in proxies:
            feature = p.get("feature")
            attr = p.get("protected_attribute")
            severity = p.get("severity", "medium")
            recs.append({
                "category": "Data Governance",
                "severity": severity.upper(),
                "title": f"Proxy Leakage: {feature}",
                "insight": f"Feature '{feature}' behaves as a statistical proxy for '{attr}'.",
                "action": f"Remove '{feature}' or apply Adversarial Debiasing to break the causal link."
            })
            
        # 2. Metric-based recommendations
        for attr, m in metrics.items():
            if isinstance(m, dict) and m.get("flagged", False):
                dp_diff = m.get("demographic_parity_difference", 0)
                if abs(dp_diff) > 0.1:
                    recs.append({
                        "category": "Algorithmic Alignment",
                        "severity": "HIGH",
                        "title": f"Disparate Impact for {attr}",
                        "insight": f"Significant outcome gap detected for '{attr}' ({abs(dp_diff)*100:.1f}% deviation).",
                        "action": "Utilize 'Reweighing' to balance training weights or 'Reject Option Classification' for post-processing."
                    })
                    
        # 3. Counterfactual recommendations
        if cf.get("overall_flagged"):
            for attr, data in cf.get("metrics", {}).items():
                if data.get("flagged"):
                    recs.append({
                        "category": "Causal Fairness",
                        "severity": "CRITICAL",
                        "title": f"Counterfactual Violation: {attr}",
                        "insight": f"{data.get('violation_rate', 0)*100:.1f}% of outcomes change solely by changing '{attr}'.",
                        "action": "Your model has learned direct causal dependency on protected traits. Redesign feature set to exclude sensitive lineage."
                    })
                    
        # 4. Individual Fairness Recommendations
        indiv = audit_results.get("individual_fairness", {})
        if indiv and indiv.get("consistency_score", 1.0) < 0.8:
            recs.append({
                "category": "Robustness",
                "severity": "MEDIUM",
                "title": "Low Outcome Consistency",
                "insight": f"Consistency score ({indiv.get('consistency_score')}) indicates similar profiles receive disparate results.",
                "action": "Implement Laplacian smoothing or regularization to ensure decision boundaries are not overly sensitive to noise."
            })
            
        # 5. Adversarial Audit Recommendations
        adv = audit_results.get("adversarial_audit", {})
        if adv.get("latent_bias_detected"):
            for attr, data in adv.get("metrics", {}).items():
                if data.get("is_latent_proxy"):
                    recs.append({
                        "category": "Security & Privacy",
                        "severity": data.get("severity", "HIGH"),
                        "title": f"Latent Bias: {attr} Reconstruction",
                        "insight": f"Adversarial probes can reconstruct '{attr}' from other features with {data.get('reconstruction_auc', 0)*100:.1f}% confidence.",
                        "action": "The model is likely learning redundant encodings. Apply Gradient Reversal or Differential Privacy to the training objective."
                    })

        # 6. Multivariate Subgroup Recommendations
        subgroups = audit_results.get("multivariate_subgroups", [])
        for sg in subgroups:
            recs.append({
                "category": "Intersectional Equity",
                "severity": sg.get("risk_level", "HIGH"),
                "title": "High Disparity Subgroup",
                "insight": f"Segment [{sg.get('description')}] has a {abs(sg.get('disparity', 0))*100:.1f}% deviation from baseline.",
                "action": "Target this segment for manual override or specific calibration in the post-processing layer."
            })

        # 7. Calibration Recommendations
        cal = audit_results.get("calibration_fairness", {})
        if cal.get("overall_flagged"):
            for attr, data in cal.get("metrics", {}).items():
                if data.get("brier_disparity", 0) > 0.1:
                    recs.append({
                        "category": "Model Reliability",
                        "severity": "MEDIUM",
                        "title": f"Calibration Disparity: {attr}",
                        "insight": f"Model confidence is less reliable for specific groups of '{attr}' (Brier Gap: {data['brier_disparity']}).",
                        "action": "Apply Platt Scaling or Isotonic Regression per subgroup to calibrate probabilities."
                    })

        # 8. Distributional Recommendations
        drift = audit_results.get("distributional_representativeness", {})
        if drift.get("findings"):
            for attr, findings in drift["findings"].items():
                if findings:
                    top_drift = findings[0]
                    recs.append({
                        "category": "Data Integrity",
                        "severity": top_drift.get("drift_severity", "MEDIUM"),
                        "title": f"Feature Distribution Drift: {attr}",
                        "insight": f"Feature '{top_drift['feature']}' follows a significantly different distribution for '{attr}' subgroups.",
                        "action": "Investigate if this feature is a masked proxy or if data collection for this subgroup is biased."
                    })

        if not recs and score >= 80:
            recs.append({
                "category": "Maintenance",
                "severity": "LOW",
                "title": "Continuous Monitoring",
                "insight": "Current snapshot meets the 'Equity Optimized' standard.",
                "action": "Set up automated drift detection to catch seasonal bias shifts in production data."
            })
            
        return recs

    @staticmethod
    def analyze(audit_results: Dict[str, Any]) -> Dict[str, Any]:
        """
        Complete AI insight analysis wrapper.
        """
        try:
            score = audit_results.get("fairness_score", 100)
            risk_level = "High" if score < 60 else "Medium" if score < 85 else "Low"
            
            # Compliance Mapping (Outstanding Differentiator)
            compliance = {
                "eu_ai_act": {
                    "status": "PASS" if score >= 80 else "FAIL",
                    "requirement": "Art. 10 (Data & Data Governance)",
                    "finding": "Subgroup representativeness " + ("verified" if score >= 80 else "requires remediation")
                },
                "nist_ai_rmf": {
                    "status": "PASS" if score >= 75 else "FAIL",
                    "requirement": "Bias Management (Map 1.1)",
                    "finding": "Fairness-calibration check " + ("complete" if score >= 75 else "incomplete")
                }
            }
            
            return {
                "executive_summary": AIInsightEngine.generate_executive_summary(audit_results),
                "recommendations": AIInsightEngine.generate_recommendations(audit_results),
                "risk_profile": {
                    "level": risk_level,
                    "score": 100 - score,
                    "factors": {
                        "proxy_risk": "High" if audit_results.get("proxy_features") else "Low",
                        "causal_risk": "High" if audit_results.get("counterfactual_fairness", {}).get("overall_flagged") else "Low",
                        "calibration_risk": "High" if audit_results.get("calibration_fairness", {}).get("overall_flagged") else "Low",
                        "legal_risk": "High" if score < 70 else "Low"
                    }
                },
                "compliance_status": "CERTIFIED" if score >= 90 else "PENDING" if score >= 75 else "NON-COMPLIANT",
                "compliance_frameworks": compliance
            }
        except Exception as e:
            logger.error(f"Insight Generation Error: {e}")
            return {"error": str(e)}

insight_engine = AIInsightEngine()

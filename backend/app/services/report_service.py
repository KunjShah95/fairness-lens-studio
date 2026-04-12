"""Service for generating bias audit reports."""

import logging
from typing import Dict, List, Any, Optional
from datetime import datetime
import json

logger = logging.getLogger(__name__)


class BiasAuditReport:
    """Generate comprehensive bias audit report."""
    
    def __init__(
        self,
        audit_id: str,
        dataset_name: str,
        audit_date: str,
        fairness_score: int,
        audit_results: Dict[str, Any]
    ):
        self.audit_id = audit_id
        self.dataset_name = dataset_name
        self.audit_date = audit_date
        self.fairness_score = fairness_score
        self.audit_results = audit_results
    
    def generate_executive_summary(self) -> Dict[str, Any]:
        """Generate executive summary section."""
        score_description = self._score_to_description(self.fairness_score)
        score_recommendation = self._score_to_recommendation(self.fairness_score)
        
        return {
            "title": "Executive Summary",
            "content": f"""
This bias audit of '{self.dataset_name}' conducted on {self.audit_date} 
found fairness concerns requiring attention.

FAIRNESS SCORE: {self.fairness_score}/100 ({score_description})
RISK LEVEL: {"🔴 HIGH" if self.fairness_score < 60 else "🟠 MEDIUM" if self.fairness_score < 75 else "🟢 LOW"}

Key Findings:
- {len(self.audit_results.get('proxy_features', []))} potential proxy features detected
- Intersectional bias identified in {len(self.audit_results.get('intersectional_results', []))} subgroups
- Feature importance analysis reveals systematic patterns

Recommendation: {score_recommendation}
            """.strip(),
            "risk_color": "red" if self.fairness_score < 60 else "orange" if self.fairness_score < 75 else "green"
        }
    
    def generate_metrics_section(self) -> Dict[str, Any]:
        """Generate detailed metrics section."""
        metrics = self.audit_results.get("metrics", {})
        
        sections = {
            "title": "Fairness Metrics",
            "subsections": []
        }
        
        for attr, attr_metrics in metrics.items():
            sections["subsections"].append({
                "attribute": attr,
                "demographic_parity": attr_metrics.get("demographic_parity_difference", 0),
                "disparate_impact": attr_metrics.get("demographic_parity_ratio", 0),
                "equal_opportunity": attr_metrics.get("equal_opportunity_difference", 0),
                "flagged": attr_metrics.get("flagged", False)
            })
        
        return sections
    
    def generate_proxies_section(self) -> Dict[str, Any]:
        """Generate proxy features section."""
        proxies = self.audit_results.get("proxy_features", [])
        
        if not proxies:
            return {
                "title": "Proxy Feature Analysis",
                "content": "✅ No proxy features detected. Model does not use protected attributes indirectly."
            }
        
        proxy_list = []
        for proxy in proxies:
            proxy_list.append({
                "feature": proxy.get("feature"),
                "protected_attribute": proxy.get("protected_attribute"),
                "correlation": f"{proxy.get('correlation', 0):.2%}",
                "severity": "HIGH" if proxy.get('correlation', 0) > 0.85 else "MEDIUM"
            })
        
        return {
            "title": "Proxy Feature Analysis",
            "content": f"⚠️ {len(proxies)} feature(s) may be serving as proxies for protected attributes:",
            "proxies": proxy_list,
            "recommendation": "Consider removing or carefully monitoring these features"
        }
    
    def generate_intersectionality_section(self) -> Dict[str, Any]:
        """Generate intersectional analysis section."""
        intersectional = self.audit_results.get("intersectional_results", [])
        
        if not intersectional:
            return {
                "title": "Intersectional Bias Analysis",
                "content": "Analysis not available"
            }
        
        # Sort by disparity (worst groups first)
        sorted_results = sorted(
            intersectional,
            key=lambda x: x.get("disparity", 0),
            reverse=True
        )
        
        worst_groups = sorted_results[:5]
        
        return {
            "title": "Intersectional Bias Analysis",
            "content": f"Examined {len(intersectional)} intersectional groups",
            "worst_groups": [
                {
                    "group": g.get("group", "Unknown"),
                    "disparity": f"{g.get('disparity', 0):.1%}",
                    "size": g.get("count", 0),
                    "approval_rate": f"{g.get('approval_rate', 0):.1%}"
                }
                for g in worst_groups
            ],
            "note": "Intersectional analysis reveals how bias compounds across dimensions"
        }
    
    def generate_feature_importance_section(self) -> Dict[str, Any]:
        """Generate feature importance section."""
        importance = self.audit_results.get("feature_importance", [])
        
        if not importance:
            return {
                "title": "Feature Importance (SHAP)",
                "content": "Feature importance analysis not available"
            }
        
        top_features = importance[:10]
        
        return {
            "title": "Feature Importance (SHAP Values)",
            "content": "Top 10 features driving model decisions:",
            "features": [
                {
                    "rank": idx + 1,
                    "feature": f.get("feature", "Unknown"),
                    "importance": f"{f.get('shap_importance', 0)*100:.1f}%",
                    "bar_width": f"{f.get('shap_importance', 0)*100:.0f}"
                }
                for idx, f in enumerate(top_features)
            ]
        }
    
    def generate_causal_analysis_section(self) -> Dict[str, Any]:
        """Generate causal analysis section."""
        causal = self.audit_results.get("causal_analysis", {})
        
        if not causal:
            return {
                "title": "Causal Fairness Analysis",
                "content": "Causal analysis not available. Run full audit for DoWhy analysis."
            }
        
        effects = causal.get("effects", {})
        
        return {
            "title": "Causal Fairness Analysis",
            "content": "DoWhy causal analysis of fairness mechanisms:",
            "causal_effects": [
                {
                    "attribute": attr,
                    "effect": f"{effect:.3f}",
                    "interpretation": self._interpret_causal_effect(effect)
                }
                for attr, effect in effects.items()
            ]
        }
    
    def generate_recommendations_section(self) -> Dict[str, Any]:
        """Generate actionable recommendations."""
        recommendations = []
        
        if self.fairness_score < 60:
            recommendations.append({
                "priority": "🔴 CRITICAL",
                "action": "Halt model deployment until fairness improves",
                "rationale": "Fairness score indicates serious bias issues"
            })
        
        proxies = self.audit_results.get("proxy_features", [])
        if proxies:
            recommendations.append({
                "priority": "🔴 HIGH",
                "action": f"Remove or monitor {len(proxies)} proxy feature(s)",
                "rationale": "These features may create illegal discrimination"
            })
        
        if self.fairness_score < 75:
            recommendations.append({
                "priority": "🟠 MEDIUM",
                "action": "Apply mitigation techniques (reweighting, feature removal, adversarial)",
                "rationale": "Fairness improvement needed before deployment"
            })
        
        if not recommendations:
            recommendations.append({
                "priority": "🟢 LOW",
                "action": "Model appears acceptable for deployment",
                "rationale": "Fairness metrics within acceptable ranges"
            })
        
        return {
            "title": "Recommendations",
            "recommendations": recommendations
        }
    
    def generate_full_report(self) -> Dict[str, Any]:
        """Generate complete bias audit report."""
        logger.info(f"Generating full report for audit {self.audit_id}")
        
        return {
            "report_id": self.audit_id,
            "title": f"AI Bias Audit Report: {self.dataset_name}",
            "generated_at": datetime.utcnow().isoformat(),
            "fairness_score": self.fairness_score,
            "sections": {
                "executive_summary": self.generate_executive_summary(),
                "metrics": self.generate_metrics_section(),
                "proxies": self.generate_proxies_section(),
                "intersectionality": self.generate_intersectionality_section(),
                "feature_importance": self.generate_feature_importance_section(),
                "causal_analysis": self.generate_causal_analysis_section(),
                "recommendations": self.generate_recommendations_section()
            }
        }
    
    def generate_html_report(self) -> str:
        """Generate HTML version of report."""
        report = self.generate_full_report()
        
        html = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>{report['title']}</title>
    <style>
        body {{
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 900px;
            margin: 0 auto;
            padding: 20px;
            background: #f5f5f5;
        }}
        .header {{
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 40px;
            border-radius: 10px;
            margin-bottom: 30px;
        }}
        h1 {{ margin: 0; font-size: 2.5em; }}
        .fairness-score {{
            font-size: 3em;
            font-weight: bold;
            margin-top: 20px;
        }}
        .section {{
            background: white;
            padding: 30px;
            margin-bottom: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }}
        h2 {{
            color: #667eea;
            border-bottom: 2px solid #667eea;
            padding-bottom: 10px;
        }}
        .metric {{
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin: 20px 0;
        }}
        .metric-item {{
            padding: 15px;
            background: #f9f9f9;
            border-left: 4px solid #667eea;
            border-radius: 4px;
        }}
        .recommendation {{
            padding: 15px;
            margin: 10px 0;
            border-left: 4px solid #ff6b6b;
            background: #fff5f5;
            border-radius: 4px;
        }}
        .recommendation.medium {{
            border-color: #ffa500;
            background: #fffbf0;
        }}
        .recommendation.low {{
            border-color: #51cf66;
            background: #f0fdf4;
        }}
        table {{
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
        }}
        th, td {{
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #ddd;
        }}
        th {{
            background: #f0f0f0;
            font-weight: bold;
        }}
        .footer {{
            text-align: center;
            color: #999;
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #ddd;
            font-size: 0.9em;
        }}
    </style>
</head>
<body>
    <div class="header">
        <h1>{report['title']}</h1>
        <div class="fairness-score">{report['fairness_score']}/100</div>
        <p>Generated: {report['generated_at']}</p>
    </div>
    
    <div class="section">
        <h2>{report['sections']['executive_summary']['title']}</h2>
        <p>{report['sections']['executive_summary']['content']}</p>
    </div>
    
    <div class="section">
        <h2>{report['sections']['recommendations']['title']}</h2>
        <div>
"""
        
        for rec in report['sections']['recommendations']['recommendations']:
            priority_class = 'high' if '🔴' in rec['priority'] else 'medium' if '🟠' in rec['priority'] else 'low'
            html += f"""
            <div class="recommendation {priority_class}">
                <strong>{rec['priority']} {rec['action']}</strong>
                <p>{rec['rationale']}</p>
            </div>
"""
        
        html += """
        </div>
    </div>
    
    <div class="footer">
        <p>This report was automatically generated by EquityLens AI Bias Detection Platform.</p>
        <p>For questions or appeals, visit the decision appeal portal.</p>
    </div>
</body>
</html>
        """
        
        return html
    
    @staticmethod
    def _score_to_description(score: int) -> str:
        """Convert fairness score to description."""
        if score >= 85:
            return "Excellent"
        elif score >= 75:
            return "Good"
        elif score >= 60:
            return "Fair"
        else:
            return "Poor"
    
    @staticmethod
    def _score_to_recommendation(score: int) -> str:
        """Convert fairness score to recommendation."""
        if score >= 85:
            return "Model appears fair. Continue monitoring for fairness."
        elif score >= 75:
            return "Model has acceptable fairness. Monitor regularly."
        elif score >= 60:
            return "Model has fairness concerns. Apply mitigation techniques."
        else:
            return "Model has critical fairness issues. Halt deployment pending remediation."
    
    @staticmethod
    def _interpret_causal_effect(effect: float) -> str:
        """Interpret causal effect value."""
        if effect < -0.05:
            return "Strong negative causal effect (protective)"
        elif effect > 0.05:
            return "Causal effect detected (requires investigation)"
        else:
            return "Minimal causal effect"


async def generate_bias_audit_report(
    audit_id: str,
    dataset_name: str,
    audit_date: str,
    fairness_score: int,
    audit_results: Dict[str, Any],
    format: str = "json"  # json, html, pdf
) -> Dict[str, Any]:
    """
    Generate a comprehensive bias audit report.
    
    Args:
        audit_id: Audit ID
        dataset_name: Name of dataset
        audit_date: Date audit was run
        fairness_score: Overall fairness score
        audit_results: Complete audit results
        format: Output format (json, html, pdf)
    
    Returns:
        Report in requested format
    """
    logger.info(f"Generating {format} audit report for {audit_id}")
    
    report_gen = BiasAuditReport(audit_id, dataset_name, audit_date, fairness_score, audit_results)
    
    if format == "json":
        return report_gen.generate_full_report()
    elif format == "html":
        return {
            "format": "html",
            "content": report_gen.generate_html_report(),
            "mime_type": "text/html"
        }
    elif format == "pdf":
        # Note: PDF generation would use a library like reportlab or weasyprint
        return {
            "format": "pdf",
            "content": "[PDF generation requires reportlab/weasyprint library]",
            "mime_type": "application/pdf",
            "note": "Full PDF generation available with reportlab"
        }
    else:
        return report_gen.generate_full_report()

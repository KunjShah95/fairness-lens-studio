"""Service for exporting audit data and decision history."""

import logging
import csv
import io
from typing import Dict, List, Any, Optional
from datetime import datetime

logger = logging.getLogger(__name__)


class DataExporter:
    """Export audit data and decision history."""
    
    @staticmethod
    def export_audit_summary_csv(
        audit_results: Dict[str, Any],
        fairness_score: int,
        dataset_name: str
    ) -> str:
        """
        Export audit summary to CSV.
        
        Args:
            audit_results: Complete audit results
            fairness_score: Overall fairness score
            dataset_name: Name of dataset audited
        
        Returns:
            CSV string
        """
        logger.info(f"Exporting audit summary to CSV")
        
        output = io.StringIO()
        writer = csv.writer(output)
        
        # Header
        writer.writerow(["Bias Audit Summary Export"])
        writer.writerow([f"Generated: {datetime.utcnow().isoformat()}"])
        writer.writerow([])
        
        # Basic info
        writer.writerow(["Dataset Name", dataset_name])
        writer.writerow(["Fairness Score", fairness_score, "/ 100"])
        writer.writerow([])
        
        # Metrics by protected attribute
        writer.writerow(["Protected Attribute", "Demographic Parity", "Disparate Impact", "Equal Opportunity"])
        metrics = audit_results.get("metrics", {})
        for attr, m in metrics.items():
            writer.writerow([
                attr,
                f"{m.get('demographic_parity_difference', 0):.4f}",
                f"{m.get('demographic_parity_ratio', 0):.4f}",
                f"{m.get('equal_opportunity_difference', 0):.4f}"
            ])
        
        writer.writerow([])
        
        # Proxy features
        writer.writerow(["Proxy Features"])
        proxies = audit_results.get("proxy_features", [])
        if proxies:
            writer.writerow(["Feature", "Protected Attribute", "Correlation", "P-Value"])
            for proxy in proxies:
                writer.writerow([
                    proxy.get("feature"),
                    proxy.get("protected_attribute"),
                    f"{proxy.get('correlation', 0):.4f}",
                    f"{proxy.get('p_value', 0):.4f}"
                ])
        else:
            writer.writerow(["None detected"])
        
        return output.getvalue()
    
    @staticmethod
    def export_metrics_by_group_csv(
        audit_results: Dict[str, Any]
    ) -> str:
        """
        Export detailed metrics by demographic group.
        
        Args:
            audit_results: Audit results with metrics
        
        Returns:
            CSV string
        """
        logger.info("Exporting metrics by group to CSV")
        
        output = io.StringIO()
        writer = csv.writer(output)
        
        writer.writerow(["Fairness Metrics by Protected Group"])
        writer.writerow(["Generated", datetime.utcnow().isoformat()])
        writer.writerow([])
        
        metrics = audit_results.get("metrics", {})
        
        writer.writerow([
            "Protected Attribute",
            "Demographic Parity Difference",
            "Demographic Parity Ratio",
            "Equal Opportunity Difference",
            "Flagged"
        ])
        
        for attr, m in metrics.items():
            writer.writerow([
                attr,
                f"{m.get('demographic_parity_difference', 0):.4f}",
                f"{m.get('demographic_parity_ratio', 0):.4f}",
                f"{m.get('equal_opportunity_difference', 0):.4f}",
                "Yes" if m.get("flagged", False) else "No"
            ])
        
        return output.getvalue()
    
    @staticmethod
    def export_intersectional_analysis_csv(
        audit_results: Dict[str, Any]
    ) -> str:
        """
        Export intersectional bias analysis.
        
        Args:
            audit_results: Audit results with intersectional analysis
        
        Returns:
            CSV string
        """
        logger.info("Exporting intersectional analysis to CSV")
        
        output = io.StringIO()
        writer = csv.writer(output)
        
        writer.writerow(["Intersectional Bias Analysis"])
        writer.writerow(["Generated", datetime.utcnow().isoformat()])
        writer.writerow([])
        
        writer.writerow([
            "Group",
            "Count",
            "Approval Rate",
            "Disparity",
            "Flagged"
        ])
        
        intersectional = audit_results.get("intersectional_results", [])
        
        # Sort by disparity (worst first)
        intersectional = sorted(intersectional, key=lambda x: x.get("disparity", 0), reverse=True)
        
        for group in intersectional:
            writer.writerow([
                group.get("group", "Unknown"),
                group.get("count", 0),
                f"{group.get('approval_rate', 0)*100:.1f}%",
                f"{group.get('disparity', 0)*100:.1f}%",
                "Yes" if group.get("disparity", 0) > 0.15 else "No"
            ])
        
        return output.getvalue()
    
    @staticmethod
    def export_feature_importance_csv(
        audit_results: Dict[str, Any]
    ) -> str:
        """
        Export feature importance scores.
        
        Args:
            audit_results: Audit results with feature importance
        
        Returns:
            CSV string
        """
        logger.info("Exporting feature importance to CSV")
        
        output = io.StringIO()
        writer = csv.writer(output)
        
        writer.writerow(["Feature Importance (SHAP Values)"])
        writer.writerow(["Generated", datetime.utcnow().isoformat()])
        writer.writerow([])
        
        writer.writerow(["Rank", "Feature", "SHAP Importance", "Percentage"])
        
        importance = audit_results.get("feature_importance", [])
        
        for idx, feature in enumerate(importance):
            shap_val = feature.get("shap_importance", 0)
            writer.writerow([
                idx + 1,
                feature.get("feature", "Unknown"),
                f"{shap_val:.6f}",
                f"{shap_val*100:.2f}%"
            ])
        
        return output.getvalue()
    
    @staticmethod
    def export_decision_history_csv(
        decisions: List[Dict[str, Any]]
    ) -> str:
        """
        Export decision history for audit/compliance.
        
        Args:
            decisions: List of decisions made by model
        
        Returns:
            CSV string
        """
        logger.info(f"Exporting {len(decisions)} decisions to CSV")
        
        output = io.StringIO()
        writer = csv.writer(output)
        
        writer.writerow(["Decision History Export"])
        writer.writerow(["Generated", datetime.utcnow().isoformat()])
        writer.writerow([f"Total Decisions: {len(decisions)}"])
        writer.writerow([])
        
        # Headers
        headers = [
            "Decision ID",
            "Timestamp",
            "Applicant ID",
            "Decision",
            "Confidence",
            "Age", "Income", "Credit Score",
            "Reviewed", "Appeal Status"
        ]
        writer.writerow(headers)
        
        # Rows
        for decision in decisions:
            writer.writerow([
                decision.get("id", ""),
                decision.get("timestamp", ""),
                decision.get("applicant_id", ""),
                decision.get("decision", ""),
                f"{decision.get('confidence', 0):.2%}",
                decision.get("age", ""),
                decision.get("income", ""),
                decision.get("credit_score", ""),
                "Yes" if decision.get("reviewed", False) else "No",
                decision.get("appeal_status", "None")
            ])
        
        return output.getvalue()
    
    @staticmethod
    def export_full_audit_json(
        audit_id: str,
        dataset_name: str,
        fairness_score: int,
        audit_results: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Export complete audit as JSON.
        
        Args:
            audit_id: Audit ID
            dataset_name: Dataset name
            fairness_score: Fairness score
            audit_results: All audit results
        
        Returns:
            JSON dict (can be serialized)
        """
        logger.info(f"Exporting audit {audit_id} to JSON")
        
        return {
            "export_type": "complete_audit",
            "audit_id": audit_id,
            "dataset_name": dataset_name,
            "exported_at": datetime.utcnow().isoformat(),
            "fairness_score": fairness_score,
            "results": audit_results
        }


async def export_audit_data(
    audit_id: str,
    dataset_name: str,
    fairness_score: int,
    audit_results: Dict[str, Any],
    export_type: str = "summary"  # summary, full, metrics, intersectional, features
) -> Dict[str, Any]:
    """
    Export audit data in various formats.
    
    Args:
        audit_id: Audit ID
        dataset_name: Dataset name
        fairness_score: Fairness score
        audit_results: Audit results
        export_type: Type of export
    
    Returns:
        Export data (CSV string or JSON)
    """
    logger.info(f"Exporting audit data: {export_type}")
    
    if export_type == "summary":
        csv_data = DataExporter.export_audit_summary_csv(
            audit_results,
            fairness_score,
            dataset_name
        )
        return {
            "format": "csv",
            "filename": f"{audit_id}_summary.csv",
            "content": csv_data
        }
    
    elif export_type == "metrics":
        csv_data = DataExporter.export_metrics_by_group_csv(audit_results)
        return {
            "format": "csv",
            "filename": f"{audit_id}_metrics.csv",
            "content": csv_data
        }
    
    elif export_type == "intersectional":
        csv_data = DataExporter.export_intersectional_analysis_csv(audit_results)
        return {
            "format": "csv",
            "filename": f"{audit_id}_intersectional.csv",
            "content": csv_data
        }
    
    elif export_type == "features":
        csv_data = DataExporter.export_feature_importance_csv(audit_results)
        return {
            "format": "csv",
            "filename": f"{audit_id}_features.csv",
            "content": csv_data
        }
    
    elif export_type == "full":
        json_data = DataExporter.export_full_audit_json(
            audit_id,
            dataset_name,
            fairness_score,
            audit_results
        )
        return {
            "format": "json",
            "filename": f"{audit_id}_full_audit.json",
            "content": json_data
        }
    
    else:
        return {
            "error": f"Unknown export type: {export_type}",
            "supported": ["summary", "metrics", "intersectional", "features", "full"]
        }

"""Router for transparency and reporting endpoints."""

import logging
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import FileResponse, StreamingResponse
from typing import Dict, List, Any, Optional
import io

from app.services import report_service, model_card_service, export_service
from app.db.models import AuditRun
from app.db.session import SessionLocal

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/reports", tags=["reports"])


@router.get("/audit-report/{audit_id}")
async def get_audit_report(
    audit_id: str,
    format: str = Query("json")  # json, html, pdf
) -> Dict[str, Any]:
    """
    Get comprehensive bias audit report.
    
    Args:
        audit_id: Audit to report on
        format: Output format (json, html, pdf)
    
    Returns:
        Audit report
    """
    try:
        logger.info(f"Generating audit report for {audit_id}")
        db = SessionLocal()
        
        # Load audit
        audit = db.query(AuditRun).filter(AuditRun.id == audit_id).first()
        if not audit:
            db.close()
            raise HTTPException(status_code=404, detail="Audit not found")
        
        # Generate report
        report = await report_service.generate_bias_audit_report(
            audit_id=audit.id,
            dataset_name=f"Dataset {audit.dataset_id}",
            audit_date=audit.created_at.isoformat(),
            fairness_score=audit.fairness_score or 0,
            audit_results={
                "metrics": audit.metrics or {},
                "proxy_features": audit.proxy_features or [],
                "intersectional_results": audit.intersectional_results or [],
                "feature_importance": audit.feature_importance or [],
                "causal_analysis": audit.causal_analysis or {}
            },
            format=format
        )
        
        db.close()
        
        logger.info(f"Report generated successfully")
        
        return report
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating report: {e}")
        db.close()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/audit-report-html/{audit_id}")
async def get_audit_report_html(audit_id: str):
    """
    Get audit report as HTML (browsable).
    
    Args:
        audit_id: Audit to report on
    
    Returns:
        HTML report
    """
    try:
        logger.info(f"Generating HTML audit report for {audit_id}")
        db = SessionLocal()
        
        audit = db.query(AuditRun).filter(AuditRun.id == audit_id).first()
        if not audit:
            db.close()
            raise HTTPException(status_code=404, detail="Audit not found")
        
        report = await report_service.generate_bias_audit_report(
            audit_id=audit.id,
            dataset_name=f"Dataset {audit.dataset_id}",
            audit_date=audit.created_at.isoformat(),
            fairness_score=audit.fairness_score or 0,
            audit_results={
                "metrics": audit.metrics or {},
                "proxy_features": audit.proxy_features or [],
                "intersectional_results": audit.intersectional_results or [],
                "feature_importance": audit.feature_importance or [],
                "causal_analysis": audit.causal_analysis or {}
            },
            format="html"
        )
        
        db.close()
        
        # Return as HTML response
        from fastapi.responses import HTMLResponse
        return HTMLResponse(content=report["content"])
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating HTML report: {e}")
        db.close()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/model-card/{audit_id}")
async def get_model_card(
    audit_id: str,
    format: str = Query("json")  # json, markdown
) -> Dict[str, Any]:
    """
    Get AI model card (transparency documentation).
    
    Args:
        audit_id: Associated audit
        format: Output format
    
    Returns:
        Model card
    """
    try:
        logger.info(f"Generating model card for audit {audit_id}")
        db = SessionLocal()
        
        audit = db.query(AuditRun).filter(AuditRun.id == audit_id).first()
        if not audit:
            db.close()
            raise HTTPException(status_code=404, detail="Audit not found")
        
        # Generate model card
        card = await model_card_service.generate_model_card(
            model_name=f"Decision Model v1.0",
            model_type=audit.domain or "general",
            domain=audit.domain or "general",
            organization="EquityLens",
            fairness_score=audit.fairness_score or 75,
            proxy_features=audit.proxy_features or [],
            format=format
        )
        
        db.close()
        
        return card
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating model card: {e}")
        db.close()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/model-card-markdown/{audit_id}")
async def get_model_card_markdown(audit_id: str):
    """
    Get model card as markdown (readable format).
    
    Args:
        audit_id: Associated audit
    
    Returns:
        Markdown response
    """
    try:
        logger.info(f"Generating markdown model card for {audit_id}")
        db = SessionLocal()
        
        audit = db.query(AuditRun).filter(AuditRun.id == audit_id).first()
        if not audit:
            db.close()
            raise HTTPException(status_code=404, detail="Audit not found")
        
        card = await model_card_service.generate_model_card(
            model_name=f"Decision Model v1.0",
            model_type=audit.domain or "general",
            domain=audit.domain or "general",
            organization="EquityLens",
            fairness_score=audit.fairness_score or 75,
            proxy_features=audit.proxy_features or [],
            format="markdown"
        )
        
        db.close()
        
        from fastapi.responses import PlainTextResponse
        return PlainTextResponse(content=card["content"])
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating markdown model card: {e}")
        db.close()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/export/{audit_id}")
async def export_audit_data(
    audit_id: str,
    export_type: str = Query("summary")  # summary, metrics, intersectional, features, full
):
    """
    Export audit data as CSV or JSON.
    
    Args:
        audit_id: Audit to export
        export_type: Type of export
    
    Returns:
        CSV or JSON file
    """
    try:
        logger.info(f"Exporting audit data: {export_type}")
        db = SessionLocal()
        
        audit = db.query(AuditRun).filter(AuditRun.id == audit_id).first()
        if not audit:
            db.close()
            raise HTTPException(status_code=404, detail="Audit not found")
        
        # Export data
        export_result = await export_service.export_audit_data(
            audit_id=audit.id,
            dataset_name=f"Dataset {audit.dataset_id}",
            fairness_score=audit.fairness_score or 0,
            audit_results={
                "metrics": audit.metrics or {},
                "proxy_features": audit.proxy_features or [],
                "intersectional_results": audit.intersectional_results or [],
                "feature_importance": audit.feature_importance or [],
                "causal_analysis": audit.causal_analysis or {}
            },
            export_type=export_type
        )
        
        db.close()
        
        # Return appropriate response
        if export_result.get("format") == "csv":
            # Return CSV as downloadable file
            output = io.BytesIO(export_result["content"].encode())
            return StreamingResponse(
                iter([output.getvalue()]),
                media_type="text/csv",
                headers={"Content-Disposition": f"attachment; filename={export_result['filename']}"}
            )
        else:
            # Return JSON
            return export_result
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error exporting data: {e}")
        db.close()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/dashboard-data/{audit_id}")
async def get_dashboard_data(audit_id: str) -> Dict[str, Any]:
    """
    Get all data needed for transparency dashboard.
    
    Args:
        audit_id: Audit to visualize
    
    Returns:
        Dashboard data (charts, metrics, etc.)
    """
    try:
        logger.info(f"Fetching dashboard data for audit {audit_id}")
        db = SessionLocal()
        
        audit = db.query(AuditRun).filter(AuditRun.id == audit_id).first()
        if not audit:
            db.close()
            raise HTTPException(status_code=404, detail="Audit not found")
        
        # Prepare dashboard data
        metrics = audit.metrics or {}
        
        dashboard_data = {
            "audit_id": audit.id,
            "fairness_score": audit.fairness_score or 0,
            "metadata": {
                "created_at": audit.created_at.isoformat(),
                "status": audit.status,
                "protected_attributes": audit.protected_attributes or []
            },
            "charts": {
                "fairness_gauge": {
                    "label": "Fairness Score",
                    "value": audit.fairness_score or 0,
                    "max": 100,
                    "color": "red" if audit.fairness_score < 60 else "orange" if audit.fairness_score < 75 else "green"
                },
                "metrics_by_attribute": {
                    "attributes": list(metrics.keys()),
                    "data": [
                        {
                            "attribute": attr,
                            "demographic_parity": m.get("demographic_parity_difference", 0),
                            "disparate_impact": m.get("demographic_parity_ratio", 0),
                            "equal_opportunity": m.get("equal_opportunity_difference", 0)
                        }
                        for attr, m in metrics.items()
                    ]
                },
                "proxy_features": {
                    "count": len(audit.proxy_features or []),
                    "features": audit.proxy_features or []
                },
                "feature_importance": {
                    "features": (audit.feature_importance or [])[:10],
                    "total_features": len(audit.feature_importance or [])
                }
            },
            "summary": {
                "total_metrics": len(metrics),
                "flagged_attributes": sum(1 for m in metrics.values() if m.get("flagged", False)),
                "proxy_features_detected": len(audit.proxy_features or []),
                "causal_analysis_available": bool(audit.causal_analysis)
            }
        }
        
        db.close()
        
        return dashboard_data
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching dashboard data: {e}")
        db.close()
        raise HTTPException(status_code=500, detail=str(e))

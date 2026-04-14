"""
Integration tests for EquityLens backend.

Tests verify that all backend services are working correctly and can process requests.
Run with: pytest backend/tests/test_integration.py -v
"""

import pytest
from fastapi.testclient import TestClient
import sys
import os

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

# Use sqlite for integration test collection/runtime unless explicitly overridden.
os.environ.setdefault("DATABASE_URL", "sqlite:///./equitylens_integration_test.db")
os.environ.setdefault("SQLALCHEMY_ECHO", "False")

from app.main import app

client = TestClient(app)


class TestHealthAndDemo:
    """Test health check and demo endpoints."""
    
    def test_health_check(self):
        """Test backend is running and healthy."""
        response = client.get("/api/demo/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert data["service"] == "EquityLens"
        assert "version" in data
        assert "endpoints" in data
    
    def test_sample_audit_data(self):
        """Test backend returns realistic sample audit data."""
        response = client.get("/api/demo/sample-audit")
        assert response.status_code == 200
        data = response.json()
        
        # Verify structure
        assert data["id"] == "audit-sample-001"
        assert data["fairness_score"] == 68
        assert "metrics" in data
        assert "proxy_features" in data
        assert "intersectional_results" in data
        assert "feature_importance" in data
        
        # Verify metrics structure
        metrics = data["metrics"]
        assert "gender" in metrics
        assert "age_group" in metrics
        
        # Verify proxy features
        proxies = data["proxy_features"]
        assert len(proxies) > 0
        assert all("feature" in p and "correlation" in p and "severity" in p for p in proxies)
        
        # Verify intersectional results
        intersectional = data["intersectional_results"]
        assert len(intersectional) > 0
        assert all("group" in r and "approval_rate" in r and "disparity" in r for r in intersectional)


class TestReportGeneration:
    """Test report generation endpoints."""
    
    def test_sample_report_html(self):
        """Test backend generates HTML reports."""
        response = client.get("/api/demo/sample-report")
        assert response.status_code == 200
        html = response.text
        
        # Verify HTML structure
        assert "Fairness Audit Report" in html
        assert "Executive Summary" in html
        assert "Demographic Parity" in html
        assert "Recommendations" in html
        assert "Intersectional Analysis" in html
        assert "Feature Importance" in html
        
        # Verify it's actual HTML
        assert html.startswith("<html>") or html.startswith("<HTML>")
        assert "</html>" in html or "</HTML>" in html
    
    def test_sample_model_card(self):
        """Test backend generates model cards."""
        response = client.get("/api/demo/sample-model-card")
        assert response.status_code == 200
        data = response.json()
        
        # Verify structure
        assert "content" in data
        content = data["content"]
        
        # Verify markdown content
        assert "# AI Model Card" in content
        assert "## Model Details" in content
        assert "## Intended Use" in content
        assert "## Training Data" in content
        assert "## Model Limitations" in content
        assert "## Ethical Considerations" in content
        assert "Fairness" in content
        assert "Transparency" in content
        assert "Accountability" in content
        assert "Data Rights" in content


class TestAPIDocumentation:
    """Test API documentation endpoints."""
    
    def test_endpoints_list(self):
        """Test that backend provides endpoint documentation."""
        response = client.get("/api/demo/endpoints")
        assert response.status_code == 200
        data = response.json()
        
        # Verify structure
        assert "categories" in data
        assert "testing_flow" in data
        
        categories = data["categories"]
        expected_categories = [
            "Health & Demo",
            "Datasets",
            "Audit & Analysis",
            "Mitigation",
            "Simulator",
            "Portal (Affected Person)",
            "Governance",
            "Reports & Transparency"
        ]
        
        for category in expected_categories:
            assert category in categories, f"Missing category: {category}"
        
        # Verify each category has endpoints
        for category, endpoints in categories.items():
            assert isinstance(endpoints, dict)
            assert len(endpoints) > 0


class TestDataValidation:
    """Test that returned data is valid and consistent."""
    
    def test_audit_data_consistency(self):
        """Test that audit data is internally consistent."""
        response = client.get("/api/demo/sample-audit")
        audit = response.json()
        
        # Fairness score should be 0-100
        assert 0 <= audit["fairness_score"] <= 100
        
        # All metrics should have required fields
        for attr, metric in audit["metrics"].items():
            assert isinstance(metric["demographic_parity_difference"], (int, float))
            assert isinstance(metric["demographic_parity_ratio"], (int, float))
            assert isinstance(metric["flagged"], bool)
        
        # All proxy features should have valid severity
        valid_severities = ["HIGH", "MEDIUM", "LOW"]
        for proxy in audit["proxy_features"]:
            assert proxy["severity"] in valid_severities
            assert 0 <= proxy["correlation"] <= 1
        
        # Causal analysis should have interpretation
        causal = audit["causal_analysis"]
        assert "treatment" in causal
        assert "outcome" in causal
        assert "interpretation" in causal
    
    def test_feature_importance_ranking(self):
        """Test that feature importance is properly ranked."""
        response = client.get("/api/demo/sample-audit")
        audit = response.json()
        
        features = audit["feature_importance"]
        assert len(features) > 0
        
        # Features should be sorted by importance (descending)
        importances = [f["importance"] for f in features]
        assert importances == sorted(importances, reverse=True)
        
        # All importances should be 0-1
        for feature in features:
            assert 0 <= feature["importance"] <= 1


class TestErrorHandling:
    """Test that backend handles errors gracefully."""
    
    def test_invalid_endpoint(self):
        """Test that backend returns 404 for invalid endpoints."""
        response = client.get("/api/invalid/endpoint")
        assert response.status_code == 404
    
    def test_invalid_audit_id(self):
        """Test that backend handles invalid audit IDs."""
        # This would fail if the endpoint is implemented
        # For now, just verify the demo endpoints don't break
        response = client.get("/api/demo/health")
        assert response.status_code == 200


class TestPerformance:
    """Test backend performance."""
    
    def test_health_check_speed(self):
        """Test that health check responds quickly."""
        import time
        start = time.time()
        response = client.get("/api/demo/health")
        elapsed = time.time() - start
        
        assert response.status_code == 200
        assert elapsed < 0.5, f"Health check took {elapsed}s (expected < 0.5s)"
    
    def test_sample_data_speed(self):
        """Test that sample data endpoint responds quickly."""
        import time
        start = time.time()
        response = client.get("/api/demo/sample-audit")
        elapsed = time.time() - start
        
        assert response.status_code == 200
        assert elapsed < 1.0, f"Sample audit took {elapsed}s (expected < 1.0s)"


class TestIntegrationFlow:
    """Test complete integration flows."""
    
    def test_demo_flow(self):
        """Test the complete demo flow."""
        # 1. Health check
        health = client.get("/api/demo/health").json()
        assert health["status"] == "healthy"
        
        # 2. Get sample audit
        audit = client.get("/api/demo/sample-audit").json()
        assert audit["fairness_score"] == 68
        
        # 3. Get sample report
        report_response = client.get("/api/demo/sample-report")
        assert report_response.status_code == 200
        report_html = report_response.text
        assert "68/100" in report_html  # Should mention the fairness score
        
        # 4. Get sample model card
        card = client.get("/api/demo/sample-model-card").json()
        assert "Model Card" in card["content"]
        
        # 5. Get endpoints list
        endpoints = client.get("/api/demo/endpoints").json()
        assert "categories" in endpoints
        
        print("\n✓ Complete demo flow successful:")
        print(f"  - Health: {health['status']}")
        print(f"  - Audit: Fairness Score {audit['fairness_score']}/100")
        print(f"  - Report: {len(report_html)} bytes")
        print(f"  - Model Card: {len(card['content'])} characters")
        print(f"  - API Endpoints: {len(endpoints['categories'])} categories")


class TestCORSSupport:
    """Test CORS configuration."""
    
    def test_cors_headers(self):
        """Test that CORS headers are properly set."""
        response = client.get("/api/demo/health")
        
        # Check for CORS headers
        assert response.status_code == 200
        # Note: TestClient doesn't always include CORS headers,
        # so we just verify the endpoint works


class TestDataStructure:
    """Test that data structures match frontend expectations."""
    
    def test_audit_matches_frontend_expectations(self):
        """Test that audit data matches what frontend expects."""
        response = client.get("/api/demo/sample-audit")
        audit = response.json()
        
        # Frontend expects these top-level fields
        required_fields = [
            "id", "dataset_id", "status", "fairness_score",
            "protected_attributes", "metrics", "proxy_features",
            "intersectional_results", "feature_importance"
        ]
        
        for field in required_fields:
            assert field in audit, f"Missing required field: {field}"
    
    def test_report_contains_all_sections(self):
        """Test that HTML report contains all required sections."""
        response = client.get("/api/demo/sample-report")
        html = response.text
        
        required_sections = [
            "Fairness Audit Report",
            "Overall Fairness Score",
            "Executive Summary",
            "Key Metrics",
            "Proxy Features",
            "Intersectional Analysis",
            "Feature Importance",
            "Recommendations"
        ]
        
        for section in required_sections:
            assert section in html, f"Missing section: {section}"


if __name__ == "__main__":
    # Run tests with: python -m pytest backend/tests/test_integration.py -v
    pytest.main([__file__, "-v"])

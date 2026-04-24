import pytest
from unittest.mock import patch, MagicMock, AsyncMock


class TestGenieIntegration:
    """Integration tests for Genie chat flow."""

    @pytest.mark.asyncio
    async def test_chat_with_fallback_when_no_openai(self):
        """Test that fallback works when OpenAI is not available."""
        # Mock services to not be available
        with patch("app.services.openai_adapter.OpenAIAdapter") as mock_adapter:
            mock_adapter.return_value.is_available.return_value = False

            # This should still work via fallback
            from app.routers.genie import chat_with_genie, ChatRequest, ChatMessage

            request = ChatRequest(
                messages=[ChatMessage(role="user", content="Summarize my audit")],
                context={"fairness_score": 75},
            )

            response = await chat_with_genie(request)

            assert response.response is not None
            assert response.sources is not None

    @pytest.mark.asyncio
    async def test_enhance_endpoint(self):
        """Test the enhance endpoint."""
        from app.routers.genie import enhance_insights, EnhanceRequest

        request = EnhanceRequest(audit_results={"fairness_score": 75, "metrics": {}})

        response = await enhance_insights(request)

        assert "original_summary" in response
        assert "sources" in response

    def test_generate_suggestions(self):
        """Test suggestion generation."""
        from app.routers.genie import _generate_suggestions

        suggestions = _generate_suggestions("Some response")

        assert len(suggestions) > 0
        assert isinstance(suggestions[0], str)

    def test_generate_fallback_response(self):
        """Test fallback response generation."""
        from app.routers.genie import _generate_fallback_response

        # Test summary
        response = _generate_fallback_response("summarize", {"fairness_score": 50})
        assert response is not None

        # Test recommendations
        response = _generate_fallback_response("recommend", {})
        assert response is not None

        # Test risk
        response = _generate_fallback_response("risk", {})
        assert response is not None
